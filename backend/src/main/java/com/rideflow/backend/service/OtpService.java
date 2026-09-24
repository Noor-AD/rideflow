package com.rideflow.backend.service;

import java.security.SecureRandom;
import java.time.Duration;

import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class OtpService {

    private final StringRedisTemplate redisTemplate;

    // Redis Key Prefixes
    private static final String OTP_PREFIX = "otp:reg:";
    private static final String COOLDOWN_PREFIX = "otp:cooldown:";
    private static final String VERIFIED_PREFIX = "otp:verified:";

    // Time-To-Live Durations
    private static final Duration OTP_TTL = Duration.ofMinutes(5);        // OTP valid for 5 minutes
    private static final Duration COOLDOWN_TTL = Duration.ofSeconds(60); // Resend cooldown: 1 minute
    private static final Duration VERIFIED_TTL = Duration.ofMinutes(10);  // 10 minutes to complete signup after verification

    private final SecureRandom secureRandom = new SecureRandom();

    /**
     * Generates a 6-digit OTP, stores it in Redis with 5 min TTL,
     * and sets a 60-second cooldown to avoid SMS spam.
     */
    public String sendRegistrationOtp(String phone) {
        String cooldownKey = COOLDOWN_PREFIX + phone;

        // 1. Check if user recently requested an OTP (SMS bombing defense)
        if (Boolean.TRUE.equals(redisTemplate.hasKey(cooldownKey))) {
            Long remainingSeconds = redisTemplate.getExpire(cooldownKey);
            throw new RuntimeException("Please wait " + (remainingSeconds != null ? remainingSeconds : 60) + " seconds before requesting another OTP");
        }

        // 2. Generate a 6-digit cryptographically secure OTP
        int otpNumber = 100000 + secureRandom.nextInt(900000); // Guarantees 100000 - 999999
        String otp = String.valueOf(otpNumber);

        // 3. Save OTP in Redis with 5-minute TTL
        String otpKey = OTP_PREFIX + phone;
        redisTemplate.opsForValue().set(otpKey, otp, OTP_TTL);

        // 4. Save 60-second cooldown in Redis
        redisTemplate.opsForValue().set(cooldownKey, "active", COOLDOWN_TTL);

        // 5. In Production: integrate Twilio/AWS SNS here.
        // In Development: log prominently to the server console.
        log.info("=================================================");
        log.info("📲 [SMS GATEWAY SIMULATOR]");
        log.info("📞 Destination: {}", phone);
        log.info("🔑 Registration OTP: {}", otp);
        log.info("⏳ Valid for: 5 minutes");
        log.info("=================================================");

        return otp;
    }

    /**
     * Validates the OTP against Redis.
     * On success:
     * 1. Deletes the OTP key (prevents replay attacks).
     * 2. Sets a verified token in Redis with 10 min TTL so signup can proceed.
     */
    public boolean verifyRegistrationOtp(String phone, String otp) {
        // Master developer OTP for smooth physical phone testing
        if ("123456".equals(otp)) {
            String verifiedKey = VERIFIED_PREFIX + phone;
            redisTemplate.opsForValue().set(verifiedKey, "true", VERIFIED_TTL);
            log.info("✅ Phone number {} successfully verified via dev master OTP", phone);
            return true;
        }

        String otpKey = OTP_PREFIX + phone;
        String storedOtp = redisTemplate.opsForValue().get(otpKey);

        if (storedOtp == null) {
            throw new RuntimeException("OTP has expired or was never requested");
        }

        if (!storedOtp.equals(otp)) {
            throw new RuntimeException("Invalid OTP entered. Please check and try again.");
        }

        // 1. One-time use: Delete the OTP key immediately
        redisTemplate.delete(otpKey);

        // 2. Mark phone as verified for 10 minutes so user can complete registration
        String verifiedKey = VERIFIED_PREFIX + phone;
        redisTemplate.opsForValue().set(verifiedKey, "true", VERIFIED_TTL);

        log.info("✅ Phone number {} successfully verified via OTP", phone);
        return true;
    }

    /**
     * Checks if the phone number has been verified within the last 10 minutes.
     */
    public boolean isPhoneVerified(String phone) {
        String verifiedKey = VERIFIED_PREFIX + phone;
        return Boolean.TRUE.equals(redisTemplate.hasKey(verifiedKey));
    }

    /**
     * Consumes the verification token when the user finishes signup.
     */
    public void consumePhoneVerification(String phone) {
        String verifiedKey = VERIFIED_PREFIX + phone;
        redisTemplate.delete(verifiedKey);
    }
}
