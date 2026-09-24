package com.rideflow.backend.dto.request;

import com.rideflow.backend.model.VehicleType;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateProfileRequest {

    @NotBlank(message = "Name cannot be empty")
    @Size(min = 2, max = 50, message = "Name must be between 2 and 50 characters")
    private String name;

    private String phone;

    // Optional fields for Driver Profile
    private String vehicleModel;
    private String vehiclePlate;
    private VehicleType vehicleType;
}

