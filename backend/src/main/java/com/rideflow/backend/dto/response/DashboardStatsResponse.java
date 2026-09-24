package com.rideflow.backend.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DashboardStatsResponse {
    private long totalRides;
    private long activeDrivers;
    private long pendingApprovals;
    private double totalRevenue;
    private double platformCommission;
}

