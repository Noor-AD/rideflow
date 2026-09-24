package com.rideflow.backend.control;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.rideflow.backend.dto.request.DriverOnboardingRequest;
import com.rideflow.backend.dto.request.LocationUpdateRequest;
import com.rideflow.backend.dto.response.DriverResponse;
import com.rideflow.backend.model.User;
import com.rideflow.backend.service.DriverService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/drivers")
@RequiredArgsConstructor
public class DriverController {

    private final DriverService driverService;

    // 1. Driver Onboarding
    @PostMapping("/onboard")
    public ResponseEntity<DriverResponse> onboardDriver(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody DriverOnboardingRequest request
    ) {
        return ResponseEntity.ok(driverService.onboardDriver(user.getId(), request));
    }

    // 2. Stream GPS Location (Called every 3-5 seconds by Driver Phone)
    @PutMapping("/location")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<DriverResponse> updateLocation(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody LocationUpdateRequest request
    ) {
        return ResponseEntity.ok(driverService.updateLocation(user.getId(), request));
    }

    // 3. Online / Offline Availability Toggle
    @PatchMapping("/availability")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<DriverResponse> toggleAvailability(
            @AuthenticationPrincipal User user,
            @RequestParam boolean isOnline
    ) {
        return ResponseEntity.ok(driverService.toggleAvailability(user.getId(), isOnline));
    }

    // 4. Get Current Driver Profile
    @GetMapping("/me")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<DriverResponse> getMyProfile(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(driverService.mapToResponse(driverService.getDriverByUserId(user.getId())));
    }

    // 5. Public / Rider Endpoint: Discover Nearby Available Cabs on Map
    @GetMapping("/nearby")
    public ResponseEntity<List<DriverResponse>> getNearbyDrivers(
            @RequestParam double latitude,
            @RequestParam double longitude,
            @RequestParam(defaultValue = "5.0") double radiusKm
    ) {
        return ResponseEntity.ok(driverService.getNearbyDrivers(latitude, longitude, radiusKm));
    }
}
