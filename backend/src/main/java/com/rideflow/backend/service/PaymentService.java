package com.rideflow.backend.service;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.HexFormat;
import java.util.UUID;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.rideflow.backend.dto.request.PaymentVerifyRequest;
import com.rideflow.backend.dto.response.PaymentOrderResponse;
import com.rideflow.backend.dto.response.PaymentResponse;
import com.rideflow.backend.dto.websocket.RideEventPayload;
import com.rideflow.backend.model.Payment;
import com.rideflow.backend.model.PaymentMethod;
import com.rideflow.backend.model.PaymentStatus;
import com.rideflow.backend.model.Ride;
import com.rideflow.backend.model.RideStatus;
import com.rideflow.backend.repository.PaymentRepository;
import com.rideflow.backend.repository.RideRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentService {

    private final PaymentRepository paymentRepository;
    private final RideRepository rideRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Value("${application.payment.razorpay.key-id:rzp_test_RideFlowKey123}")
    private String razorpayKeyId;

    @Value("${application.payment.razorpay.key-secret:RideFlowSecret456}")
    private String razorpayKeySecret;

    @Value("${application.payment.commission-rate:0.20}")
    private double commissionRate; // 20% platform cut

    // 1. Create a Payment Order (initiates digital checkout)
    @Transactional
    public PaymentOrderResponse createPaymentOrder(Long userId, Long rideId) {
        Ride ride = rideRepository.findById(rideId)
                .orElseThrow(() -> new IllegalArgumentException("Ride not found with id: " + rideId));

        // Security: only rider who booked can initiate payment
        if (!ride.getRider().getId().equals(userId)) {
            throw new IllegalStateException("You are not authorized to pay for this ride.");
        }

        if (ride.getPaymentStatus() == PaymentStatus.COMPLETED) {
            throw new IllegalStateException("This ride has already been paid for.");
        }

        if (ride.getStatus() == RideStatus.CANCELLED) {
            throw new IllegalStateException("Cannot pay for a cancelled ride.");
        }

        Double payableAmount = ride.getActualFare() != null ? ride.getActualFare() : ride.getEstimatedFare();

        // Unique gateway order ID (e.g., order_8f1b2c3d...)
        String orderId = "order_" + UUID.randomUUID().toString().replace("-", "").substring(0, 16);

        // Create or update existing pending payment ledger
        Payment payment = paymentRepository.findByRideId(rideId)
                .orElse(Payment.builder()
                        .ride(ride)
                        .method(ride.getPaymentMethod() != null ? ride.getPaymentMethod() : PaymentMethod.CARD)
                        .build());

        payment.setPaymentOrderId(orderId);
        payment.setAmount(payableAmount);
        payment.setCurrency("INR");
        payment.setStatus(PaymentStatus.PENDING);
        paymentRepository.save(payment);

        log.info("Created payment order {} for ride #{} (Amount: ₹{})", orderId, rideId, payableAmount);

        return PaymentOrderResponse.builder()
                .rideId(rideId)
                .orderId(orderId)
                .amount(payableAmount)
                .currency("INR")
                .keyId(razorpayKeyId)
                .build();
    }

    // 2. Cryptographic Signature Verification & Revenue Settlement
    @Transactional
    public PaymentResponse verifyPayment(Long userId, PaymentVerifyRequest request) {
        Ride ride = rideRepository.findById(request.getRideId())
                .orElseThrow(() -> new IllegalArgumentException("Ride not found with id: " + request.getRideId()));

        if (!ride.getRider().getId().equals(userId)) {
            throw new IllegalStateException("You are not authorized to verify this payment.");
        }

        Payment payment = paymentRepository.findByRideId(request.getRideId())
                .orElseThrow(() -> new IllegalArgumentException("Payment record not found for ride: " + request.getRideId()));

        // Cryptographic Signature Validation: HMAC-SHA256(orderId + "|" + transactionId, secret)
        String payload = request.getPaymentOrderId() + "|" + request.getPaymentTransactionId();
        String expectedSignature = calculateHmacSha256(payload, razorpayKeySecret);

        // Allow test sandbox bypass or verify real cryptographic signature
        boolean isValid = expectedSignature.equalsIgnoreCase(request.getPaymentSignature())
                || "test_signature".equals(request.getPaymentSignature());

        if (!isValid) {
            payment.setStatus(PaymentStatus.FAILED);
            paymentRepository.save(payment);
            throw new IllegalArgumentException("Payment verification failed! Invalid cryptographic signature.");
        }

        // Calculate 80/20 financial revenue split
        double totalAmount = payment.getAmount();
        double platformFee = Math.round(totalAmount * commissionRate * 100.0) / 100.0;
        double driverEarnings = Math.round((totalAmount - platformFee) * 100.0) / 100.0;

        // Update Payment Ledger
        payment.setPaymentTransactionId(request.getPaymentTransactionId());
        payment.setPaymentSignature(request.getPaymentSignature());
        payment.setPlatformFee(platformFee);
        payment.setDriverEarnings(driverEarnings);
        payment.setStatus(PaymentStatus.COMPLETED);
        payment.setPaidAt(LocalDateTime.now());
        paymentRepository.save(payment);

        // Update Ride Payment Status
        ride.setPaymentStatus(PaymentStatus.COMPLETED);
        rideRepository.save(ride);

        log.info("Payment verified for ride #{}: Total=₹{}, Driver=₹{}, Platform=₹{}",
                ride.getId(), totalAmount, driverEarnings, platformFee);

        PaymentResponse response = mapToResponse(payment);

        // Real-time WebSocket push event to /topic/rides/{rideId}
        broadcastPaymentEvent(ride.getId(), "PAYMENT_COMPLETED",
                "Payment of ₹" + totalAmount + " received successfully!");

        return response;
    }

    // 3. Query Payment Receipt
    @Transactional(readOnly = true)
    public PaymentResponse getPaymentByRideId(Long rideId) {
        return paymentRepository.findByRideId(rideId)
                .map(this::mapToResponse)
                .orElseThrow(() -> new IllegalArgumentException("Payment not found for ride id: " + rideId));
    }

    // HMAC-SHA256 calculation
    private String calculateHmacSha256(String data, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKeySpec = new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(secretKeySpec);
            byte[] hash = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hash);
        // After (Zero warnings!):
        } catch (java.security.GeneralSecurityException e) {
            throw new RuntimeException("Error computing HMAC-SHA256 signature", e);
        }
    }

    private void broadcastPaymentEvent(Long rideId, String eventType, String message) {
        RideEventPayload event = RideEventPayload.builder()
                .eventType(eventType)
                .rideId(rideId)
                .message(message)
                .build();
        messagingTemplate.convertAndSend("/topic/rides/" + rideId, event);
    }

    private PaymentResponse mapToResponse(Payment payment) {
        return PaymentResponse.builder()
                .id(payment.getId())
                .rideId(payment.getRide().getId())
                .paymentOrderId(payment.getPaymentOrderId())
                .paymentTransactionId(payment.getPaymentTransactionId())
                .amount(payment.getAmount())
                .currency(payment.getCurrency())
                .platformFee(payment.getPlatformFee())
                .driverEarnings(payment.getDriverEarnings())
                .method(payment.getMethod())
                .status(payment.getStatus())
                .paidAt(payment.getPaidAt())
                .build();
    }
}