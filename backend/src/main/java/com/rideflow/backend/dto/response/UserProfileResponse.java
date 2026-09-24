package com.rideflow.backend.dto.response;

import java.util.Set;

import com.rideflow.backend.model.DriverApprovalStatus;
import com.rideflow.backend.model.Role;
import com.rideflow.backend.model.VehicleType;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserProfileResponse {

    private Long id;
    private String name;
    private String email;
    private String phone;
    private Set<Role> roles;

    // Driver specific info (if user is a registered driver)
    private DriverDetails driver;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DriverDetails {
        private Long driverId;
        private String licenseNumber;
        private String vehiclePlate;
        private String vehicleModel;
        private VehicleType vehicleType;
        private DriverApprovalStatus approvalStatus;
        private Double rating;
        private Integer totalRides;
        private boolean isOnline;
    }
}

