package com.rideflow.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PaymentOrderResponse {

    private Long rideId;
    private String orderId;    // Gateway Order ID (e.g. order_O9z3X1K8l...)
    private Double amount;     // Total Amount (e.g. 360.29)
    private String currency;   // "INR"
    private String keyId;      // Public merchant key to initialize checkout sheet
}