package com.rideflow.backend.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;

import com.rideflow.backend.dto.request.DriverOnboardingRequest;
import com.rideflow.backend.dto.request.LocationUpdateRequest;
import com.rideflow.backend.dto.response.DriverResponse;
import com.rideflow.backend.model.DriverApprovalStatus;
import com.rideflow.backend.model.DriverProfile;
import com.rideflow.backend.model.Role;
import com.rideflow.backend.model.User;
import com.rideflow.backend.repository.DriverRepository;
import com.rideflow.backend.repository.UserRepository;

import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class DriverService {
    private final DriverRepository driverRepository;
    private final UserRepository userRepository;

    @Transactional
    public DriverResponse onboardDriver(Long userId, DriverOnboardingRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + userId));
        if (driverRepository.findByUserId(userId).isPresent()) {
            throw new RuntimeException("User is already registered as a driver");
        }
        if (driverRepository.existsByLicenseNumber(request.getLicenseNumber())) {
            throw new RuntimeException("License number is already registered");
        }
        if (driverRepository.existsByVehiclePlate(request.getVehiclePlate())) {
            throw new RuntimeException("Vehicle plate is already registered");
        }
        // Ensure user has ROLE_DRIVER
        user.getRoles().add(Role.ROLE_DRIVER);
        userRepository.save(user);
        DriverProfile profile = DriverProfile.builder()
                .user(user)
                .licenseNumber(request.getLicenseNumber())
                .vehiclePlate(request.getVehiclePlate())
                .vehicleModel(request.getVehicleModel())
                .vehicleType(request.getVehicleType())
                .approvalStatus(DriverApprovalStatus.PENDING_APPROVAL)
                .isOnline(false)
                .rating(5.0)
                .totalRides(0)
                .build();
        return mapToResponse(driverRepository.save(profile));
    }
    @Transactional
    public DriverResponse updateLocation(Long userId, LocationUpdateRequest request) {
        DriverProfile driver = getDriverByUserId(userId);
        driver.setCurrentLatitude(request.getLatitude());
        driver.setCurrentLongitude(request.getLongitude());
        return mapToResponse(driverRepository.save(driver));
    }
    @Transactional
    public DriverResponse toggleAvailability(Long userId, boolean isOnline) {
        DriverProfile driver = getDriverByUserId(userId);
        if (isOnline && driver.getApprovalStatus() != DriverApprovalStatus.VERIFIED) {
            throw new RuntimeException("Cannot go online: Driver account is not verified yet!");
        }
        driver.setOnline(isOnline);
        return mapToResponse(driverRepository.save(driver));
    }
     @Transactional
    public DriverResponse approveDriver(Long driverId) {
        DriverProfile driver = driverRepository.findById(driverId)
                .orElseThrow(() -> new RuntimeException("Driver not found with id: " + driverId));
        driver.setApprovalStatus(DriverApprovalStatus.VERIFIED);
        return mapToResponse(driverRepository.save(driver));
    }
    @Transactional
    public DriverResponse rejectDriver(Long driverId) {
        DriverProfile driver = driverRepository.findById(driverId)
                .orElseThrow(() -> new RuntimeException("Driver not found with id: " + driverId));
        driver.setApprovalStatus(DriverApprovalStatus.REJECTED);
        driver.setOnline(false);
        return mapToResponse(driverRepository.save(driver));
    }
    
    public List<DriverResponse> getPendingDrivers() {
        return driverRepository.findByApprovalStatus(DriverApprovalStatus.PENDING_APPROVAL)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    public List<DriverResponse> getAllDrivers() {
        return driverRepository.findAll()
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Transactional
    public void updateDriverRating(Long driverId, int newRating) {
        driverRepository.findById(driverId).ifPresent(driver -> {
            int currentTotal = driver.getTotalRides() != null ? driver.getTotalRides() : 0;
            double currentRating = driver.getRating() != null ? driver.getRating() : 5.0;
            double updatedRating = ((currentRating * currentTotal) + newRating) / (currentTotal + 1);
            driver.setRating(Math.round(updatedRating * 10.0) / 10.0);
            driver.setTotalRides(currentTotal + 1);
            driverRepository.save(driver);
        });
    }
    public List<DriverResponse> getNearbyDrivers(double latitude, double longitude, double radiusKm) {
        double radiusMeters = radiusKm * 1000;
        return driverRepository.findNearbyAvailableDrivers(longitude, latitude, radiusMeters)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }
    public DriverProfile getDriverByUserId(Long userId) {
        return driverRepository.findByUserId(userId)
                .orElseThrow(() -> new RuntimeException("Driver profile not found for user id: " + userId));
    }
    public DriverResponse mapToResponse(DriverProfile driver) {
        Double lat = driver.getCurrentLatitude();
        Double lng = driver.getCurrentLongitude();
        return DriverResponse.builder()
                .id(driver.getId())
                .userId(driver.getUser().getId())
                .driverName(driver.getUser().getName())
                .driverPhone(driver.getUser().getPhone())
                .licenseNumber(driver.getLicenseNumber())
                .vehiclePlate(driver.getVehiclePlate())
                .vehicleModel(driver.getVehicleModel())
                .vehicleType(driver.getVehicleType())
                .approvalStatus(driver.getApprovalStatus())
                .isOnline(driver.isOnline())
                .rating(driver.getRating())
                .totalRides(driver.getTotalRides())
                .latitude(lat)
                .longitude(lng)
                .build();
    }
}
