package com.rideflow.backend.dto.response;

import java.time.LocalDateTime;

import com.fasterxml.jackson.annotation.JsonFormat;
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
    private Double fare;

    // Trip Verification
    private String otp;

    // Statuses
    private VehicleType vehicleType;
    private RideStatus status;
    private PaymentMethod paymentMethod;
    private PaymentStatus paymentStatus;

    // Timestamps in UTC ISO-8601
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss'Z'")
    private LocalDateTime createdAt;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss'Z'")
    private LocalDateTime acceptedAt;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss'Z'")
    private LocalDateTime startedAt;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss'Z'")
    private LocalDateTime completedAt;

    // Advance Booking
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss'Z'")
    private LocalDateTime scheduledPickupTime;
    private Boolean isScheduled;
}