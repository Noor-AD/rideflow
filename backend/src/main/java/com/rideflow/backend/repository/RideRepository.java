package com.rideflow.backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;

import com.rideflow.backend.model.Ride;
import com.rideflow.backend.model.RideStatus;

public interface RideRepository extends JpaRepository<Ride, Long>{

    // 1. Rider Trip History
    List<Ride> findByRiderIdOrderByCreatedAtDesc(Long riderId);

    // 2. Driver Trip History
    List<Ride> findByDriverIdOrderByCreatedAtDesc(Long driverId);

    // 3. Check for Active Ride for Rider (Double-booking prevention & State recovery)
    Optional<Ride> findFirstByRiderIdAndStatusIn(Long riderId, List<RideStatus> statuses);

    // 4. Check for Active Ride for Driver (Driver busy check)
    Optional<Ride> findFirstByDriverIdAndStatusIn(Long driverId, List<RideStatus> statuses);

    // 5. Admin Fleet Live Monitoring
    List<Ride> findByStatus(RideStatus status);

    // 6. Scheduled Rides queries
    List<Ride> findByStatusAndScheduledPickupTimeBefore(RideStatus status, java.time.LocalDateTime time);
    List<Ride> findByRiderIdAndStatusOrderByScheduledPickupTimeAsc(Long riderId, RideStatus status);
}
