package com.rideflow.backend.control;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.rideflow.backend.dto.request.PaymentVerifyRequest;
import com.rideflow.backend.dto.response.PaymentOrderResponse;
import com.rideflow.backend.dto.response.PaymentResponse;
import com.rideflow.backend.model.User;
import com.rideflow.backend.service.PaymentService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
public class PaymentController {

    private final PaymentService paymentService;

    // 1. Rider initiates online payment
    @PostMapping("/create-order")
    @PreAuthorize("hasRole('RIDER')")
    public ResponseEntity<PaymentOrderResponse> createPaymentOrder(
            @AuthenticationPrincipal User user,
            @RequestParam Long rideId
    ) {
        return ResponseEntity.ok(paymentService.createPaymentOrder(user.getId(), rideId));
    }

    // 2. Rider submits payment proof for cryptographic verification
    @PostMapping("/verify")
    @PreAuthorize("hasRole('RIDER')")
    public ResponseEntity<PaymentResponse> verifyPayment(
            @AuthenticationPrincipal User user,
            @Valid @RequestBody PaymentVerifyRequest request
    ) {
        return ResponseEntity.ok(paymentService.verifyPayment(user.getId(), request));
    }

    // 3. View Payment Receipt
    @GetMapping("/ride/{rideId}")
    public ResponseEntity<PaymentResponse> getPaymentByRideId(@PathVariable Long rideId) {
        return ResponseEntity.ok(paymentService.getPaymentByRideId(rideId));
    }
}