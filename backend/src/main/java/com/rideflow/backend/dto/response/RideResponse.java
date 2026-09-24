package com.rideflow.backend.dto.response;

import java.time.LocalDateTime;

import com.rideflow.backend.model.PaymentMethod;
import com.rideflow.backend.model.PaymentStatus;
import com.rideflow.backend.model.RideStatus;
import com.rideflow.backend.model.VehicleType;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RideResponse {

    private Long id;

    // Rider Information
    private Long riderId;
    private String riderName;
    private String riderPhone;

    // Driver Information (null until a driver accepts)
    private Long driverId;
    private String driverName;
    private String driverPhone;
    private String vehiclePlate;
    private String vehicleModel;

    // Route & Locations
    private Double pickupLat;
    private Double pickupLng;
    private String pickupAddress;

    private Double dropoffLat;
    private Double dropoffLng;
    private String dropoffAddress;

    // Fare & Metrics
    private Double distanceKm;
    private Double durationMinutes;
    private Double estimatedFare;
    private Double actualFare;

    // Trip Verification
    private String otp;

    // Statuses
    private VehicleType vehicleType;
    private RideStatus status;
    private PaymentMethod paymentMethod;
    private PaymentStatus paymentStatus;

    // Timestamps
    private LocalDateTime createdAt;
    private LocalDateTime acceptedAt;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;

    // Advance Booking
    private LocalDateTime scheduledPickupTime;
    private Boolean isScheduled;
}