package com.rideflow.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class VerifyOtpRequest {
    @NotBlank(message="OTP cannot be blank")
    @Pattern(regexp="^[0-9]{4}$", message="OTP must be exactly 4 digits")
    private String otp;
}
