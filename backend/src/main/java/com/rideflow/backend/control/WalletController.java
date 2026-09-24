package com.rideflow.backend.control;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.rideflow.backend.dto.response.DriverEarningsSummaryDto;
import com.rideflow.backend.model.User;
import com.rideflow.backend.model.Wallet;
import com.rideflow.backend.model.WalletTransaction;
import com.rideflow.backend.service.WalletService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/wallet")
@RequiredArgsConstructor
public class WalletController {

    private final WalletService walletService;

    // 1. Get current authenticated user's wallet balance
    @GetMapping("/balance")
    public ResponseEntity<Map<String, Object>> getBalance(@AuthenticationPrincipal User user) {
        Wallet wallet = walletService.getOrCreateWallet(user);
        Map<String, Object> resp = new HashMap<>();
        resp.put("balance", wallet.getBalance());
        resp.put("currency", wallet.getCurrency());
        resp.put("userId", user.getId());
        resp.put("userName", user.getName());
        return ResponseEntity.ok(resp);
    }

    // 2. Top-up wallet balance
    @PostMapping("/topup")
    public ResponseEntity<Map<String, Object>> topup(
            @AuthenticationPrincipal User user,
            @RequestBody Map<String, Object> payload
    ) {
        Double amount = Double.valueOf(payload.get("amount").toString());
        String method = payload.get("method") != null ? payload.get("method").toString() : "UPI";
        String ref = payload.get("referenceId") != null ? payload.get("referenceId").toString() : null;

        Wallet updated = walletService.topup(user, amount, ref, method);

        Map<String, Object> resp = new HashMap<>();
        resp.put("message", "Wallet topped up successfully");
        resp.put("balance", updated.getBalance());
        resp.put("currency", updated.getCurrency());
        return ResponseEntity.ok(resp);
    }

    // 3. User transaction statement history
    @GetMapping("/transactions")
    public ResponseEntity<List<Map<String, Object>>> getTransactions(@AuthenticationPrincipal User user) {
        List<WalletTransaction> txs = walletService.getTransactionHistory(user);
        List<Map<String, Object>> result = txs.stream().map(t -> {
            Map<String, Object> m = new HashMap<>();
            m.put("id", t.getId());
            m.put("amount", t.getAmount());
            m.put("postBalance", t.getPostBalance());
            m.put("type", t.getType().name());
            m.put("referenceId", t.getReferenceId());
            m.put("description", t.getDescription());
            m.put("createdAt", t.getCreatedAt().toString());
            return m;
        }).collect(Collectors.toList());

        return ResponseEntity.ok(result);
    }

    // 4. Driver Daily & Weekly Earnings Dashboard
    @GetMapping("/driver/summary")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<DriverEarningsSummaryDto> getDriverEarnings(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(walletService.getDriverEarningsSummary(user));
    }

    // 5. Driver Withdraw Funds to Bank / UPI
    @PostMapping("/driver/withdraw")
    @PreAuthorize("hasRole('DRIVER')")
    public ResponseEntity<Map<String, Object>> requestWithdrawal(
            @AuthenticationPrincipal User user,
            @RequestBody Map<String, Object> payload
    ) {
        Double amount = Double.valueOf(payload.get("amount").toString());
        String upiId = payload.get("upiId") != null ? payload.get("upiId").toString() : null;

        Wallet updated = walletService.requestWithdrawal(user, amount, upiId);

        Map<String, Object> resp = new HashMap<>();
        resp.put("message", "Withdrawal processed successfully to " + (upiId != null ? upiId : "Primary Bank"));
        resp.put("balance", updated.getBalance());
        return ResponseEntity.ok(resp);
    }
}

