package com.rideflow.backend.dto.response;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DriverEarningsSummaryDto {
    private Double walletBalance;
    private Double todayGrossEarnings;
    private Double todayNetEarnings;
    private Double todayPlatformFee;
    private Integer todayRidesCount;
    private Double allTimeEarnings;
    private Integer allTimeRidesCount;
    private List<WalletTransactionDto> recentTransactions;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class WalletTransactionDto {
        private Long id;
        private Double amount;
        private Double postBalance;
        private String type;
        private String referenceId;
        private String description;
        private String createdAt;
    }
}

