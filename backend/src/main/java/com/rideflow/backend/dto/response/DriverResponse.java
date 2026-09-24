package com.rideflow.backend.dto.response;

import com.rideflow.backend.model.DriverApprovalStatus;
import com.rideflow.backend.model.VehicleType;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;


@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DriverResponse {
    private Long id;
    private Long userId;
    private String driverName;
    private String driverPhone;
    private String licenseNumber;
    private String vehiclePlate;
    private String vehicleModel;
    private VehicleType vehicleType;
    private DriverApprovalStatus approvalStatus;
    private boolean isOnline;
    private Double rating;
    private Integer totalRides;
    private Double latitude;
    private Double longitude;
}
