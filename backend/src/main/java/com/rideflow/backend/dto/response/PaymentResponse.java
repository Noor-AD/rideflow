package com.rideflow.backend.dto.response;

import java.time.LocalDateTime;

import com.rideflow.backend.model.PaymentMethod;
import com.rideflow.backend.model.PaymentStatus;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentResponse {

    private Long id;
    private Long rideId;
    private String paymentOrderId;
    private String paymentTransactionId;
    private Double amount;
    private String currency;
    private Double platformFee;
    private Double driverEarnings;
    private PaymentMethod method;
    private PaymentStatus status;
    private LocalDateTime paidAt;
}