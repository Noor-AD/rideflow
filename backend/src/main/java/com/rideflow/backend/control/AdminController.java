package com.rideflow.backend.control;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.rideflow.backend.dto.response.DashboardStatsResponse;
import com.rideflow.backend.dto.response.DriverResponse;
import com.rideflow.backend.dto.response.RideResponse;
import com.rideflow.backend.service.DriverService;
import com.rideflow.backend.service.RideService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')") // 👈 Locks down this entire controller to Admin only!
public class AdminController {

    private final DriverService driverService;
    private final RideService rideService;

    // 1. View all drivers waiting for document approval
    @GetMapping("/drivers/pending")
    public ResponseEntity<List<DriverResponse>> getPendingDrivers() {
        return ResponseEntity.ok(driverService.getPendingDrivers());
    }

    // 2. Approve a driver
    @PatchMapping("/drivers/{driverId}/approve")
    public ResponseEntity<DriverResponse> approveDriver(@PathVariable Long driverId) {
        return ResponseEntity.ok(driverService.approveDriver(driverId));
    }

    // 3. Reject a driver
    @PatchMapping("/drivers/{driverId}/reject")
    public ResponseEntity<DriverResponse> rejectDriver(@PathVariable Long driverId) {
        return ResponseEntity.ok(driverService.rejectDriver(driverId));
    }

    // 4. View all drivers (Fleet map & Driver list)
    @GetMapping("/drivers")
    public ResponseEntity<List<DriverResponse>> getAllDrivers() {
        return ResponseEntity.ok(driverService.getAllDrivers());
    }

    // 5. Verify / Approve a driver (matches PUT /api/admin/drivers/{driverId}/verify)
    @PutMapping("/drivers/{driverId}/verify")
    public ResponseEntity<DriverResponse> verifyDriver(@PathVariable Long driverId) {
        return ResponseEntity.ok(driverService.approveDriver(driverId));
    }

    // 6. View all rides (Active trips table)
    @GetMapping("/rides")
    public ResponseEntity<List<RideResponse>> getAllRides() {
        return ResponseEntity.ok(rideService.getAllRides());
    }

    // 7. Platform Analytics & KPIs
    @GetMapping("/stats")
    public ResponseEntity<DashboardStatsResponse> getStats() {
        return ResponseEntity.ok(rideService.getDashboardStats());
    }
}
