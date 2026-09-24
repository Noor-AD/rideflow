package com.rideflow.backend.service;

import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.Point;
import org.locationtech.jts.geom.PrecisionModel;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.rideflow.backend.dto.request.RideBookingRequest;
import com.rideflow.backend.dto.request.RideRatingRequest;
import com.rideflow.backend.dto.response.DashboardStatsResponse;
import com.rideflow.backend.dto.response.RideResponse;
import com.rideflow.backend.dto.websocket.RideEventPayload;
import com.rideflow.backend.model.DriverApprovalStatus;
import com.rideflow.backend.model.DriverProfile;
import com.rideflow.backend.model.PaymentMethod;
import com.rideflow.backend.model.PaymentStatus;
import com.rideflow.backend.model.Ride;
import com.rideflow.backend.model.RideStatus;
import com.rideflow.backend.model.User;
import com.rideflow.backend.model.VehicleType;
import com.rideflow.backend.repository.DriverRepository;
import com.rideflow.backend.repository.RideRepository;
import com.rideflow.backend.repository.UserRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class RideService {

    private final RideRepository rideRepository;
    private final UserRepository userRepository;
    private final DriverRepository driverRepository;
    private final DriverService driverService;
    private final SimpMessagingTemplate messagingTemplate; // 👈 Injected for real-time WebSocket push
    private final WalletService walletService;

    private final GeometryFactory geometryFactory = new GeometryFactory(new PrecisionModel(), 4326);
    private final SecureRandom secureRandom = new SecureRandom();

    private static final List<RideStatus> ACTIVE_STATUSES = List.of(
            RideStatus.REQUESTED,
            RideStatus.ACCEPTED,
            RideStatus.ARRIVED,
            RideStatus.IN_PROGRESS
    );

    // 1. Rider requests a new ride
    @Transactional
    public RideResponse requestRide(Long riderId, RideBookingRequest request) {
        User rider = userRepository.findById(riderId)
                .orElseThrow(() -> new IllegalArgumentException("Rider not found with id: " + riderId));

        // Prevent double booking for instant trips
        if (request.getScheduledPickupTime() == null) {
            rideRepository.findFirstByRiderIdAndStatusIn(riderId, ACTIVE_STATUSES)
                    .ifPresent(activeRide -> {
                        throw new IllegalStateException("You already have an active ride (ID: " + activeRide.getId() + ")");
                    });
        }

        // Calculate distance & fare
        double distanceKm = calculateHaversineDistance(
                request.getPickupLat(), request.getPickupLng(),
                request.getDropoffLat(), request.getDropoffLng()
        );
        double durationMinutes = Math.max(5.0, distanceKm * 2.5); // avg city estimate
        double estimatedFare = calculateFare(distanceKm, durationMinutes, request.getVehicleType());

        // Generate 4-digit verification OTP
        String otp = String.format("%04d", secureRandom.nextInt(10000));

        // Create PostGIS Points (Longitude = X, Latitude = Y)
        Point pickupPoint = geometryFactory.createPoint(new Coordinate(request.getPickupLng(), request.getPickupLat()));
        Point dropoffPoint = geometryFactory.createPoint(new Coordinate(request.getDropoffLng(), request.getDropoffLat()));

        // Check if advance scheduled ride
        boolean isScheduledRide = false;
        LocalDateTime scheduledTime = null;
        if (request.getScheduledPickupTime() != null && !request.getScheduledPickupTime().trim().isEmpty()) {
            try {
                scheduledTime = LocalDateTime.parse(request.getScheduledPickupTime().trim());
                if (scheduledTime.isAfter(LocalDateTime.now())) {
                    isScheduledRide = true;
                }
            } catch (Exception ex) {
                // Ignore parse errors and fallback to immediate ride
            }
        }

        Ride ride = Ride.builder()
                .rider(rider)
                .pickupLocation(pickupPoint)
                .pickupAddress(request.getPickupAddress())
                .dropoffLocation(dropoffPoint)
                .dropoffAddress(request.getDropoffAddress())
                .distanceKm(Math.round(distanceKm * 100.0) / 100.0)
                .durationMinutes(Math.round(durationMinutes * 10.0) / 10.0)
                .estimatedFare(Math.round(estimatedFare * 100.0) / 100.0)
                .vehicleType(request.getVehicleType())
                .paymentMethod(request.getPaymentMethod())
                .paymentStatus(PaymentStatus.PENDING)
                .status(isScheduledRide ? RideStatus.SCHEDULED : RideStatus.REQUESTED)
                .otp(otp)
                .isScheduled(isScheduledRide)
                .scheduledPickupTime(scheduledTime)
                .build();

        Ride savedRide = rideRepository.save(ride);
        RideResponse response = mapToResponse(savedRide);

        if (!isScheduledRide) {
            // Real-time broadcast dispatch offer to all online drivers immediately
            messagingTemplate.convertAndSend("/topic/drivers/requests", response);
        }

        return response;
    }

    // 2. Driver accepts a requested ride
    @Transactional
    public RideResponse acceptRide(Long driverUserId, Long rideId) {
        DriverProfile driver = driverRepository.findByUserId(driverUserId)
                .orElseThrow(() -> new IllegalArgumentException("Driver profile not found for user: " + driverUserId));

        if (!driver.isOnline()) {
            throw new IllegalStateException("You must be online to accept rides.");
        }

        // Ensure driver doesn't have an active trip already
        rideRepository.findFirstByDriverIdAndStatusIn(driver.getId(), ACTIVE_STATUSES)
                .ifPresent(activeRide -> {
                    throw new IllegalStateException("You already have an ongoing ride (ID: " + activeRide.getId() + ")");
                });

        Ride ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new IllegalArgumentException("Ride not found with id: " + rideId));

        if (ride.getStatus() != RideStatus.REQUESTED) {
            throw new IllegalStateException("Ride is no longer available (Current status: " + ride.getStatus() + ")");
        }

        ride.setDriver(driver);
        ride.setStatus(RideStatus.ACCEPTED);
        ride.setAcceptedAt(LocalDateTime.now());

        RideResponse response = mapToResponse(rideRepository.save(ride));
        // Real-time broadcast to Rider
        broadcastRideEvent(ride.getId(), "RIDE_ACCEPTED", "A driver has accepted your ride!", response);
        return response;
    }

    // 3. Driver arrives at pickup point
    @Transactional
    public RideResponse driverArrived(Long driverUserId, Long rideId) {
        Ride ride = getValidatedDriverRide(driverUserId, rideId);

        if (ride.getStatus() != RideStatus.ACCEPTED) {
            throw new IllegalStateException("Cannot mark arrived from status: " + ride.getStatus());
        }

        ride.setStatus(RideStatus.ARRIVED);
        RideResponse response = mapToResponse(rideRepository.save(ride));
        // Real-time broadcast to Rider
        broadcastRideEvent(ride.getId(), "DRIVER_ARRIVED", "Your driver has arrived at the pickup location!", response);
        return response;
    }

    // 4. Driver starts trip with passenger OTP
    @Transactional
    public RideResponse startTrip(Long driverUserId, Long rideId, String otp) {
        Ride ride = getValidatedDriverRide(driverUserId, rideId);

        if (ride.getStatus() != RideStatus.ARRIVED) {
            throw new IllegalStateException("Cannot start trip. Driver must arrive first. Current status: " + ride.getStatus());
        }

        if (!ride.getOtp().equals(otp)) {
            throw new IllegalArgumentException("Invalid verification OTP. Please verify with the passenger.");
        }

        ride.setStatus(RideStatus.IN_PROGRESS);
        ride.setStartedAt(LocalDateTime.now());
        RideResponse response = mapToResponse(rideRepository.save(ride));
        // Real-time broadcast to Rider
        broadcastRideEvent(ride.getId(), "TRIP_STARTED", "Your trip has started. Have a safe journey!", response);
        return response;
    }

    // 5. Driver completes trip at destination
    @Transactional
    public RideResponse completeTrip(Long driverUserId, Long rideId) {
        Ride ride = getValidatedDriverRide(driverUserId, rideId);

        if (ride.getStatus() != RideStatus.IN_PROGRESS) {
            throw new IllegalStateException("Cannot complete trip that is not in progress. Current status: " + ride.getStatus());
        }

        ride.setStatus(RideStatus.COMPLETED);
        ride.setCompletedAt(LocalDateTime.now());
        ride.setActualFare(ride.getEstimatedFare());

        if (ride.getPaymentMethod() == PaymentMethod.WALLET) {
            walletService.settleRideFare(ride);
        } else if (ride.getPaymentMethod() == PaymentMethod.CASH || ride.getPaymentMethod() == PaymentMethod.UPI) {
            ride.setPaymentStatus(PaymentStatus.COMPLETED);
        }

        // Increment driver total completed rides count
        DriverProfile driver = ride.getDriver();
        driver.setTotalRides(driver.getTotalRides() + 1);
        driverRepository.save(driver);

        RideResponse response = mapToResponse(rideRepository.save(ride));
        // Real-time broadcast to Rider
        broadcastRideEvent(ride.getId(), "TRIP_COMPLETED", "You have reached your destination. Thank you for riding with RideFlow!", response);
        return response;
    }

    // 6. Cancel a ride (by rider or driver)
    @Transactional
    public RideResponse cancelRide(Long userId, Long rideId) {
        Ride ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new IllegalArgumentException("Ride not found with id: " + rideId));

        boolean isRider = ride.getRider().getId().equals(userId);
        boolean isDriver = ride.getDriver() != null && ride.getDriver().getUser().getId().equals(userId);

        if (!isRider && !isDriver) {
            throw new IllegalStateException("You are not authorized to cancel this ride.");
        }

        if (ride.getStatus() == RideStatus.IN_PROGRESS || ride.getStatus() == RideStatus.COMPLETED) {
            throw new IllegalStateException("Cannot cancel a trip that is in progress or already completed.");
        }

        ride.setStatus(RideStatus.CANCELLED);
        RideResponse response = mapToResponse(rideRepository.save(ride));
        // Real-time broadcast to both parties
        broadcastRideEvent(ride.getId(), "RIDE_CANCELLED", "This ride has been cancelled.", response);
        return response;
    }

    // Helper: Push WebSocket events to subscribers of /topic/rides/{rideId}
    private void broadcastRideEvent(Long rideId, String eventType, String message, RideResponse rideResponse) {
        RideEventPayload event = RideEventPayload.builder()
                .eventType(eventType)
                .rideId(rideId)
                .message(message)
                .data(rideResponse)
                .build();

        messagingTemplate.convertAndSend("/topic/rides/" + rideId, event);
    }

    // 7. Active ride recovery for rider
    @Transactional(readOnly = true)
    public RideResponse getRiderActiveRide(Long riderId) {
        return rideRepository.findFirstByRiderIdAndStatusIn(riderId, ACTIVE_STATUSES)
                .map(this::mapToResponse)
                .orElse(null);
    }

    // 8. Active ride recovery for driver
    @Transactional(readOnly = true)
    public RideResponse getDriverActiveRide(Long driverUserId) {
        DriverProfile driver = driverRepository.findByUserId(driverUserId)
                .orElseThrow(() -> new IllegalArgumentException("Driver profile not found for user: " + driverUserId));

        return rideRepository.findFirstByDriverIdAndStatusIn(driver.getId(), ACTIVE_STATUSES)
                .map(this::mapToResponse)
                .orElse(null);
    }

    // 9. Trip histories
    @Transactional(readOnly = true)
    public List<RideResponse> getRiderTripHistory(Long riderId) {
        return rideRepository.findByRiderIdOrderByCreatedAtDesc(riderId).stream()
                .map(this::mapToResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<RideResponse> getDriverTripHistory(Long driverUserId) {
        DriverProfile driver = driverRepository.findByUserId(driverUserId)
                .orElseThrow(() -> new IllegalArgumentException("Driver profile not found for user: " + driverUserId));

        return rideRepository.findByDriverIdOrderByCreatedAtDesc(driver.getId()).stream()
                .map(this::mapToResponse)
                .toList();
    }

    // 10. Admin: Get all rides across the platform
    @Transactional(readOnly = true)
    public List<RideResponse> getAllRides() {
        return rideRepository.findAll().stream()
                .map(this::mapToResponse)
                .toList();
    }

    // 11. Admin: Platform Dashboard Analytics
    @Transactional(readOnly = true)
    public DashboardStatsResponse getDashboardStats() {
        long totalRides = rideRepository.count();
        long activeDrivers = driverRepository.findAll().stream()
                .filter(DriverProfile::isOnline)
                .count();
        long pendingApprovals = driverRepository.findByApprovalStatus(DriverApprovalStatus.PENDING_APPROVAL).size();

        double totalRevenue = rideRepository.findAll().stream()
                .filter(r -> r.getStatus() == RideStatus.COMPLETED && r.getActualFare() != null)
                .mapToDouble(Ride::getActualFare)
                .sum();
        double platformCommission = Math.round(totalRevenue * 0.20 * 100.0) / 100.0;

        return DashboardStatsResponse.builder()
                .totalRides(totalRides)
                .activeDrivers(activeDrivers)
                .pendingApprovals(pendingApprovals)
                .totalRevenue(Math.round(totalRevenue * 100.0) / 100.0)
                .platformCommission(platformCommission)
                .build();
    }

    // 12. Rider rates a completed trip
    @Transactional
    public RideResponse rateRide(Long userId, Long rideId, RideRatingRequest request) {
        Ride ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new IllegalArgumentException("Ride not found with id: " + rideId));

        if (!ride.getRider().getId().equals(userId)) {
            throw new IllegalStateException("Only the passenger can rate this ride.");
        }

        if (ride.getStatus() != RideStatus.COMPLETED) {
            throw new IllegalStateException("Can only rate completed rides.");
        }

        if (ride.getDriver() != null) {
            driverService.updateDriverRating(ride.getDriver().getId(), request.getRating());
        }

        return mapToResponse(ride);
    }

    // Internal Helper: Driver ownership verification
    private Ride getValidatedDriverRide(Long driverUserId, Long rideId) {
        Ride ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new IllegalArgumentException("Ride not found with id: " + rideId));

        if (ride.getDriver() == null || !ride.getDriver().getUser().getId().equals(driverUserId)) {
            throw new IllegalStateException("You are not the assigned driver for this ride.");
        }
        return ride;
    }

    // Mathematical Haversine Distance (in Kilometers)
    private double calculateHaversineDistance(double lat1, double lon1, double lat2, double lon2) {
        final int R = 6371; // Radius of Earth in KM
        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);

        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);

        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    // Dynamic Fare Calculation Formula
    private double calculateFare(double distanceKm, double durationMinutes, VehicleType vehicleType) {
        double baseFare;
        double perKmRate;
        double perMinuteRate = 1.5;

        switch (vehicleType) {
            case PREMIUM -> {
                baseFare = 90.0;
                perKmRate = 18.0;
            }
            case SUV -> {
                baseFare = 130.0;
                perKmRate = 25.0;
            }
            default -> { // ECONOMY
                baseFare = 50.0;
                perKmRate = 12.0;
            }
        }

        return baseFare + (distanceKm * perKmRate) + (durationMinutes * perMinuteRate);
    }

    // Entity to DTO Mapper
    public RideResponse mapToResponse(Ride ride) {
        RideResponse.RideResponseBuilder builder = RideResponse.builder()
                .id(ride.getId())
                .riderId(ride.getRider().getId())
                .riderName(ride.getRider().getName())
                .riderPhone(ride.getRider().getPhone())
                .pickupLat(ride.getPickupLocation().getY())
                .pickupLng(ride.getPickupLocation().getX())
                .pickupAddress(ride.getPickupAddress())
                .dropoffLat(ride.getDropoffLocation().getY())
                .dropoffLng(ride.getDropoffLocation().getX())
                .dropoffAddress(ride.getDropoffAddress())
                .distanceKm(ride.getDistanceKm())
                .durationMinutes(ride.getDurationMinutes())
                .estimatedFare(ride.getEstimatedFare())
                .actualFare(ride.getActualFare())
                .otp(ride.getOtp())
                .vehicleType(ride.getVehicleType())
                .status(ride.getStatus())
                .paymentMethod(ride.getPaymentMethod())
                .paymentStatus(ride.getPaymentStatus())
                .createdAt(ride.getCreatedAt())
                .acceptedAt(ride.getAcceptedAt())
                .startedAt(ride.getStartedAt())
                .completedAt(ride.getCompletedAt())
                .scheduledPickupTime(ride.getScheduledPickupTime())
                .isScheduled(ride.getIsScheduled() != null ? ride.getIsScheduled() : false);

        if (ride.getDriver() != null) {
            builder.driverId(ride.getDriver().getId())
                    .driverName(ride.getDriver().getUser().getName())
                    .driverPhone(ride.getDriver().getUser().getPhone())
                    .vehiclePlate(ride.getDriver().getVehiclePlate())
                    .vehicleModel(ride.getDriver().getVehicleModel());
        }

        return builder.build();
    }

    // 12. Advance Scheduled Rides: Get Rider's upcoming scheduled trips
    @Transactional(readOnly = true)
    public List<RideResponse> getRiderScheduledRides(Long riderId) {
        return rideRepository.findByRiderIdAndStatusOrderByScheduledPickupTimeAsc(riderId, RideStatus.SCHEDULED)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    // 13. Advance Scheduled Rides: Cancel upcoming scheduled trip
    @Transactional
    public RideResponse cancelScheduledRide(Long riderId, Long rideId) {
        Ride ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new IllegalArgumentException("Ride not found with id: " + rideId));

        if (!ride.getRider().getId().equals(riderId)) {
            throw new IllegalStateException("You are not authorized to cancel this scheduled ride.");
        }

        if (ride.getStatus() != RideStatus.SCHEDULED) {
            throw new IllegalStateException("Only scheduled rides can be cancelled via this endpoint. Current status: " + ride.getStatus());
        }

        ride.setStatus(RideStatus.CANCELLED);
        return mapToResponse(rideRepository.save(ride));
    }

    // 14. Advance Scheduled Rides: Dispatch ride to drivers when pickup time approaches
    @Transactional
    public void dispatchScheduledRide(Ride ride) {
        ride.setStatus(RideStatus.REQUESTED);
        Ride saved = rideRepository.save(ride);
        RideResponse response = mapToResponse(saved);
        broadcastRideEvent(saved.getId(), "SCHEDULED_RIDE_DISPATCHING", "Your scheduled ride is now searching for nearby drivers.", response);
        messagingTemplate.convertAndSend("/topic/drivers/requests", response);
    }
}