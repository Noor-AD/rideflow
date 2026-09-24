package com.rideflow.backend.control;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.rideflow.backend.dto.request.LoginRequest;
import com.rideflow.backend.dto.request.SendOtpRequest;
import com.rideflow.backend.dto.request.SignupRequest;
import com.rideflow.backend.dto.request.VerifyRegistrationOtpRequest;
import com.rideflow.backend.dto.response.AuthResponse;
import com.rideflow.backend.service.AuthService;
import com.rideflow.backend.service.OtpService;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final OtpService otpService;

    @PostMapping("/send-otp")
    public ResponseEntity<Map<String, String>> sendOtp(@Valid @RequestBody SendOtpRequest request) {
        String otp = otpService.sendRegistrationOtp(request.getPhone());
        return ResponseEntity.ok(Map.of(
            "message", "OTP sent successfully to " + request.getPhone(),
            "phone", request.getPhone(),
            "otp", otp
        ));
    }

    @PostMapping("/verify-otp")
    public ResponseEntity<Map<String, String>> verifyOtp(@Valid @RequestBody VerifyRegistrationOtpRequest request) {
        otpService.verifyRegistrationOtp(request.getPhone(), request.getOtp());
        return ResponseEntity.ok(Map.of(
                "message", "Phone verified successfully. You can now complete registration.",
                "phone", request.getPhone()
        ));
    }

    @PostMapping("/signup")
    public ResponseEntity<AuthResponse> signup(@Valid @RequestBody SignupRequest request) {
        return ResponseEntity.ok(authService.register(request));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(authService.login(request));
    }
}