package com.rideflow.backend.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentVerifyRequest {

    @NotNull(message = "Ride ID is required")
    private Long rideId;

    @NotBlank(message = "Payment Order ID is required")
    private String paymentOrderId;

    @NotBlank(message = "Payment Transaction ID is required")
    private String paymentTransactionId;

    @NotBlank(message = "Payment Signature is required")
    private String paymentSignature;
}