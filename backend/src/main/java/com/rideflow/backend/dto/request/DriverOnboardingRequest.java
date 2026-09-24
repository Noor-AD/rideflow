package com.rideflow.backend.dto.request;

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
public class DriverOnboardingRequest {

    @NotBlank(message = "License number is required")
    private String licenseNumber;

    @NotBlank(message = "Vehicle plate number is required")
    private String vehiclePlate;

    @NotBlank(message = "Vehicle model is required (e.g. Toyota Camry)")
    private String vehicleModel;

    @NotNull(message = "Vehicle type is required (ECONOMY, PREMIUM, SUV)")
    private VehicleType vehicleType;
}
