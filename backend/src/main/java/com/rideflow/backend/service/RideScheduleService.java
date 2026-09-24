package com.rideflow.backend.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.rideflow.backend.model.Ride;
import com.rideflow.backend.model.RideStatus;
import com.rideflow.backend.repository.RideRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class RideScheduleService {

    private final RideRepository rideRepository;
    private final RideService rideService;

    /**
     * Runs every 30 seconds:
     * Dispatches scheduled rides that are due within 15 minutes of pickup time.
     */
    @Scheduled(fixedRate = 30000)
    @Transactional
    public void processScheduledRides() {
        LocalDateTime cutoff = LocalDateTime.now().plusMinutes(15);
        List<Ride> dueRides = rideRepository.findByStatusAndScheduledPickupTimeBefore(RideStatus.SCHEDULED, cutoff);

        if (!dueRides.isEmpty()) {
            log.info("⏰ [Schedule Service] Found {} scheduled rides due for dispatch within 15 mins", dueRides.size());
            for (Ride ride : dueRides) {
                try {
                    log.info("🚀 [Schedule Service] Dispatching scheduled Ride #{} for Rider {} (Scheduled at {})",
                            ride.getId(), ride.getRider().getName(), ride.getScheduledPickupTime());
                    rideService.dispatchScheduledRide(ride);
                } catch (Exception ex) {
                    log.error("Failed to dispatch scheduled ride #{}: {}", ride.getId(), ex.getMessage(), ex);
                }
            }
        }
    }
}

