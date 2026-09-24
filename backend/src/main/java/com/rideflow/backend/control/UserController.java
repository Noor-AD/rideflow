package com.rideflow.backend.control;

import java.util.Optional;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.rideflow.backend.dto.request.UpdateProfileRequest;
import com.rideflow.backend.dto.response.UserProfileResponse;
import com.rideflow.backend.model.DriverProfile;
import com.rideflow.backend.model.User;
import com.rideflow.backend.repository.DriverRepository;
import com.rideflow.backend.repository.UserRepository;

import jakarta.transaction.Transactional;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserRepository userRepository;
    private final DriverRepository driverRepository;

    @GetMapping("/profile")
    public ResponseEntity<UserProfileResponse> getProfile(@AuthenticationPrincipal User authUser) {
        User user = userRepository.findById(authUser.getId())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        return ResponseEntity.ok(buildProfileResponse(user));
    }

    @PutMapping("/profile")
    @Transactional
    public ResponseEntity<UserProfileResponse> updateProfile(
            @AuthenticationPrincipal User authUser,
            @Valid @RequestBody UpdateProfileRequest request
    ) {
        User user = userRepository.findById(authUser.getId())
                .orElseThrow(() -> new IllegalArgumentException("User not found"));

        // 1. Update Full Name
        if (request.getName() != null && !request.getName().trim().isEmpty()) {
            user.setName(request.getName().trim());
        }

        // 2. Update Phone Number (ensuring no conflict with another user)
        if (request.getPhone() != null && !request.getPhone().trim().isEmpty()) {
            String newPhone = request.getPhone().trim();
            if (!newPhone.equals(user.getPhone())) {
                Optional<User> existing = userRepository.findByPhone(newPhone);
                if (existing.isPresent() && !existing.get().getId().equals(user.getId())) {
                    throw new IllegalArgumentException("Phone number is already associated with another account");
                }
                user.setPhone(newPhone);
            }
        }

        userRepository.save(user);

        // 3. Update Driver specifics if user has a driver profile
        Optional<DriverProfile> driverOpt = driverRepository.findByUserId(user.getId());
        if (driverOpt.isPresent()) {
            DriverProfile driver = driverOpt.get();
            if (request.getVehicleModel() != null && !request.getVehicleModel().trim().isEmpty()) {
                driver.setVehicleModel(request.getVehicleModel().trim());
            }
            if (request.getVehiclePlate() != null && !request.getVehiclePlate().trim().isEmpty()) {
                String newPlate = request.getVehiclePlate().trim().toUpperCase();
                if (!newPlate.equalsIgnoreCase(driver.getVehiclePlate())) {
                    if (driverRepository.existsByVehiclePlate(newPlate)) {
                        throw new IllegalArgumentException("Vehicle plate number is already registered by another driver");
                    }
                    driver.setVehiclePlate(newPlate);
                }
            }
            if (request.getVehicleType() != null) {
                driver.setVehicleType(request.getVehicleType());
            }
            driverRepository.save(driver);
        }

        return ResponseEntity.ok(buildProfileResponse(user));
    }

    private UserProfileResponse buildProfileResponse(User user) {
        UserProfileResponse.UserProfileResponseBuilder builder = UserProfileResponse.builder()
                .id(user.getId())
                .name(user.getName())
                .email(user.getEmail())
                .phone(user.getPhone())
                .roles(user.getRoles());

        driverRepository.findByUserId(user.getId()).ifPresent(driver -> {
            builder.driver(UserProfileResponse.DriverDetails.builder()
                    .driverId(driver.getId())
                    .licenseNumber(driver.getLicenseNumber())
                    .vehiclePlate(driver.getVehiclePlate())
                    .vehicleModel(driver.getVehicleModel())
                    .vehicleType(driver.getVehicleType())
                    .approvalStatus(driver.getApprovalStatus())
                    .rating(driver.getRating())
                    .totalRides(driver.getTotalRides())
                    .isOnline(driver.isOnline())
                    .build());
        });

        return builder.build();
    }
}

