package com.rideflow.backend.service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.rideflow.backend.dto.response.DriverEarningsSummaryDto;
import com.rideflow.backend.model.PaymentStatus;
import com.rideflow.backend.model.Ride;
import com.rideflow.backend.model.User;
import com.rideflow.backend.model.Wallet;
import com.rideflow.backend.model.WalletTransaction;
import com.rideflow.backend.model.WalletTransactionType;
import com.rideflow.backend.repository.UserRepository;
import com.rideflow.backend.repository.WalletRepository;
import com.rideflow.backend.repository.WalletTransactionRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class WalletService {

    private final WalletRepository walletRepository;
    private final WalletTransactionRepository walletTransactionRepository;
    private final UserRepository userRepository;

    @Transactional
    public Wallet getOrCreateWallet(User user) {
        return walletRepository.findByUserId(user.getId())
                .orElseGet(() -> {
                    Wallet w = Wallet.builder()
                            .user(user)
                            .balance(0.0)
                            .currency("INR")
                            .build();
                    return walletRepository.save(w);
                });
    }

    @Transactional
    public Wallet topup(User user, Double amount, String referenceId, String method) {
        if (amount == null || amount <= 0) {
            throw new IllegalArgumentException("Top-up amount must be greater than zero.");
        }

        Wallet wallet = getOrCreateWallet(user);
        wallet.setBalance(wallet.getBalance() + amount);
        Wallet savedWallet = walletRepository.save(wallet);

        WalletTransaction tx = WalletTransaction.builder()
                .wallet(savedWallet)
                .amount(amount)
                .postBalance(savedWallet.getBalance())
                .type(WalletTransactionType.TOPUP)
                .referenceId(referenceId != null ? referenceId : "TOPUP_" + System.currentTimeMillis())
                .description("Wallet top-up via " + (method != null ? method : "UPI"))
                .build();
        walletTransactionRepository.save(tx);

        log.info("💰 [Wallet] User {} ({}) topped up ₹{}. New balance: ₹{}", user.getName(), user.getEmail(), amount, savedWallet.getBalance());
        return savedWallet;
    }

    @Transactional
    public boolean settleRideFare(Ride ride) {
        if (ride.getActualFare() == null || ride.getActualFare() <= 0) {
            return false;
        }

        User rider = ride.getRider();
        if (rider == null) return false;

        Wallet riderWallet = getOrCreateWallet(rider);
        double fare = ride.getActualFare();

        if (riderWallet.getBalance() < fare) {
            log.warn("⚠️ [Wallet Settlement] Insufficient balance for rider {} on ride {}. Balance: ₹{}, Fare: ₹{}",
                    rider.getId(), ride.getId(), riderWallet.getBalance(), fare);
            return false;
        }

        // 1. Debit Rider Wallet
        riderWallet.setBalance(riderWallet.getBalance() - fare);
        walletRepository.save(riderWallet);

        WalletTransaction riderTx = WalletTransaction.builder()
                .wallet(riderWallet)
                .amount(-fare)
                .postBalance(riderWallet.getBalance())
                .type(WalletTransactionType.RIDE_PAYMENT)
                .referenceId("RIDE_" + ride.getId())
                .description("Trip fare payment for Ride #" + ride.getId() + " (" + ride.getDropoffAddress() + ")")
                .build();
        walletTransactionRepository.save(riderTx);

        // 2. Credit Driver Wallet (80% Driver Take-Home, 20% Platform Commission)
        if (ride.getDriver() != null && ride.getDriver().getUser() != null) {
            User driverUser = ride.getDriver().getUser();
            Wallet driverWallet = getOrCreateWallet(driverUser);

            double driverTakeHome = Math.round(fare * 0.80 * 100.0) / 100.0;
            driverWallet.setBalance(driverWallet.getBalance() + driverTakeHome);
            walletRepository.save(driverWallet);

            WalletTransaction driverTx = WalletTransaction.builder()
                    .wallet(driverWallet)
                    .amount(driverTakeHome)
                    .postBalance(driverWallet.getBalance())
                    .type(WalletTransactionType.DRIVER_EARNING)
                    .referenceId("RIDE_" + ride.getId())
                    .description("Driver earnings for Ride #" + ride.getId() + " (80% of ₹" + fare + ")")
                    .build();
            walletTransactionRepository.save(driverTx);

            log.info("✅ [Wallet Settlement] Settled Ride #{}: Rider debited ₹{}, Driver {} credited ₹{}",
                    ride.getId(), fare, driverUser.getName(), driverTakeHome);
        }

        ride.setPaymentStatus(PaymentStatus.COMPLETED);
        return true;
    }

    @Transactional
    public DriverEarningsSummaryDto getDriverEarningsSummary(User driverUser) {
        Wallet wallet = getOrCreateWallet(driverUser);
        LocalDateTime startOfToday = LocalDate.now().atStartOfDay();

        Double todayEarnings = walletTransactionRepository.sumAmountByWalletAndTypeSince(
                wallet.getId(),
                WalletTransactionType.DRIVER_EARNING,
                startOfToday
        );

        List<WalletTransaction> recentTx = walletTransactionRepository.findByWalletIdOrderByCreatedAtDesc(wallet.getId());

        long todayRidesCount = recentTx.stream()
                .filter(t -> t.getType() == WalletTransactionType.DRIVER_EARNING && t.getCreatedAt().isAfter(startOfToday))
                .count();

        long allTimeRides = recentTx.stream()
                .filter(t -> t.getType() == WalletTransactionType.DRIVER_EARNING)
                .count();

        double allTimeEarnings = recentTx.stream()
                .filter(t -> t.getType() == WalletTransactionType.DRIVER_EARNING)
                .mapToDouble(WalletTransaction::getAmount)
                .sum();

        double todayGross = Math.round((todayEarnings / 0.80) * 100.0) / 100.0;
        double todayFee = Math.round((todayGross - todayEarnings) * 100.0) / 100.0;

        List<DriverEarningsSummaryDto.WalletTransactionDto> txDtos = recentTx.stream()
                .limit(20)
                .map(t -> DriverEarningsSummaryDto.WalletTransactionDto.builder()
                        .id(t.getId())
                        .amount(t.getAmount())
                        .postBalance(t.getPostBalance())
                        .type(t.getType().name())
                        .referenceId(t.getReferenceId())
                        .description(t.getDescription())
                        .createdAt(t.getCreatedAt().toString())
                        .build())
                .collect(Collectors.toList());

        return DriverEarningsSummaryDto.builder()
                .walletBalance(wallet.getBalance())
                .todayGrossEarnings(todayGross)
                .todayNetEarnings(todayEarnings)
                .todayPlatformFee(todayFee)
                .todayRidesCount((int) todayRidesCount)
                .allTimeEarnings(allTimeEarnings)
                .allTimeRidesCount((int) allTimeRides)
                .recentTransactions(txDtos)
                .build();
    }

    @Transactional
    public Wallet requestWithdrawal(User driverUser, Double amount, String upiId) {
        if (amount == null || amount <= 0) {
            throw new IllegalArgumentException("Withdrawal amount must be greater than zero.");
        }

        Wallet wallet = getOrCreateWallet(driverUser);
        if (wallet.getBalance() < amount) {
            throw new IllegalStateException("Insufficient wallet balance for withdrawal.");
        }

        wallet.setBalance(wallet.getBalance() - amount);
        Wallet saved = walletRepository.save(wallet);

        WalletTransaction tx = WalletTransaction.builder()
                .wallet(saved)
                .amount(-amount)
                .postBalance(saved.getBalance())
                .type(WalletTransactionType.WITHDRAWAL)
                .referenceId("WD_" + System.currentTimeMillis())
                .description("Instant payout to UPI / Bank (" + (upiId != null ? upiId : "Primary Bank") + ")")
                .build();
        walletTransactionRepository.save(tx);

        log.info("💸 [Withdrawal] Driver {} withdrew ₹{} to {}. Remaining: ₹{}",
                driverUser.getName(), amount, upiId, saved.getBalance());
        return saved;
    }

    @Transactional(readOnly = true)
    public List<WalletTransaction> getTransactionHistory(User user) {
        Wallet wallet = getOrCreateWallet(user);
        return walletTransactionRepository.findByWalletIdOrderByCreatedAtDesc(wallet.getId());
    }
}
