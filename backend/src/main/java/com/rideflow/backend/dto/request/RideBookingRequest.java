package com.rideflow.backend.dto.request;

import com.rideflow.backend.model.PaymentMethod;
import com.rideflow.backend.model.VehicleType;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RideBookingRequest {
    @NotNull(message= "Pickup latitude is required")
    private Double pickupLat;
    @NotNull(message= "Pickup longitude is required")
    private Double pickupLng;
    @NotBlank(message= "Pickup address is required")
    private String pickupAddress;
    @NotNull(message= "Dropoff latitude is required")
    private Double dropoffLat;
    @NotNull(message= "Dropoff longitude is required")
    private Double dropoffLng;
    @NotNull(message= "Dropoff address is required")
    private String dropoffAddress;
    @NotNull(message="Vehicle type is required")
    private VehicleType vehicleType;
    @NotNull(message="Payment method is required")
    private PaymentMethod paymentMethod;

    // Optional for advance booking (ISO-8601 string, e.g. "2026-09-24T08:30:00")
    private String scheduledPickupTime;
}
