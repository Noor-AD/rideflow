package com.rideflow.backend.control;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.rideflow.backend.dto.request.RideBookingRequest;
import com.rideflow.backend.dto.request.RideRatingRequest;
import com.rideflow.backend.dto.request.VerifyOtpRequest;
import com.rideflow.backend.dto.response.RideResponse;
import com.rideflow.backend.model.User;
import com.rideflow.backend.service.RideService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/rides")
@RequiredArgsConstructor
public class RideController {

    private final RideService rideService;

    // 1. Rider requests a new ride
    @PostMapping("/request")
    @PreAuthorize("hasRole('RIDER')")
    public ResponseEntity<RideResponse> requestRide(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody RideBookingRequest request
    ) {
        return ResponseEntity.ok(rideService.requestRide(user.getId(), request));
    }

    // 2. Driver accepts a requested ride
    @PostMapping("/{rideId}/accept")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<RideResponse> acceptRide(
            @AuthenticationPrincipal User user,
            @PathVariable Long rideId
    ) {
        return ResponseEntity.ok(rideService.acceptRide(user.getId(), rideId));
    }

    // 3. Driver marks arrival at pickup point
    @PostMapping("/{rideId}/arrived")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<RideResponse> driverArrived(
            @AuthenticationPrincipal User user,
            @PathVariable Long rideId
    ) {
        return ResponseEntity.ok(rideService.driverArrived(user.getId(), rideId));
    }

    // 4. Driver enters passenger OTP to start trip
    @PostMapping("/{rideId}/start")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<RideResponse> startTrip(
            @AuthenticationPrincipal User user,
            @PathVariable Long rideId,
            @Valid @RequestBody VerifyOtpRequest request
    ) {
        return ResponseEntity.ok(rideService.startTrip(user.getId(), rideId, request.getOtp()));
    }

    // 5. Driver completes the trip
    @PostMapping("/{rideId}/complete")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<RideResponse> completeTrip(
            @AuthenticationPrincipal User user,
            @PathVariable Long rideId
    ) {
        return ResponseEntity.ok(rideService.completeTrip(user.getId(), rideId));
    }

    // 6. Cancel a ride (either Rider or Driver)
    @PostMapping("/{rideId}/cancel")
    public ResponseEntity<RideResponse> cancelRide(
            @AuthenticationPrincipal User user,
            @PathVariable Long rideId
    ) {
        return ResponseEntity.ok(rideService.cancelRide(user.getId(), rideId));
    }

    // 7. Active ride state recovery for Rider
    @GetMapping("/rider/active")
    @PreAuthorize("hasRole('RIDER')")
    public ResponseEntity<RideResponse> getRiderActiveRide(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(rideService.getRiderActiveRide(user.getId()));
    }

    // 8. Active ride state recovery for Driver
    @GetMapping("/driver/active")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<RideResponse> getDriverActiveRide(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(rideService.getDriverActiveRide(user.getId()));
    }

    // 9. Trip History for Rider
    @GetMapping("/rider/history")
    @PreAuthorize("hasRole('RIDER')")
    public ResponseEntity<List<RideResponse>> getRiderTripHistory(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(rideService.getRiderTripHistory(user.getId()));
    }

    // 10. Trip History for Driver
    @GetMapping("/driver/history")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<List<RideResponse>> getDriverTripHistory(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(rideService.getDriverTripHistory(user.getId()));
    }

    // 11. Rider rates a completed trip
    @PostMapping("/{rideId}/rate")
    @PreAuthorize("hasRole('RIDER')")
    public ResponseEntity<RideResponse> rateRide(
            @AuthenticationPrincipal User user,
            @PathVariable Long rideId,
            @Valid @RequestBody RideRatingRequest request
    ) {
        return ResponseEntity.ok(rideService.rateRide(user.getId(), rideId, request));
    }

    // 12. Advance Scheduled Rides: Get Rider's upcoming scheduled rides
    @GetMapping("/scheduled")
    @PreAuthorize("hasRole('RIDER')")
    public ResponseEntity<List<RideResponse>> getScheduledRides(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(rideService.getRiderScheduledRides(user.getId()));
    }

    // 13. Advance Scheduled Rides: Cancel an upcoming scheduled ride
    @PostMapping("/{rideId}/cancel-scheduled")
    @PreAuthorize("hasRole('RIDER')")
    public ResponseEntity<RideResponse> cancelScheduledRide(
            @AuthenticationPrincipal User user,
            @PathVariable Long rideId
    ) {
        return ResponseEntity.ok(rideService.cancelScheduledRide(user.getId(), rideId));
    }
}