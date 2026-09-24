package com.rideflow.backend.repository;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.rideflow.backend.model.DriverApprovalStatus;
import com.rideflow.backend.model.DriverProfile;


public interface DriverRepository extends JpaRepository<DriverProfile, Long> {
    Optional<DriverProfile> findByUserId(Long userId);

    boolean existsByLicenseNumber(String licesnseNumber);
    boolean existsByVehiclePlate(String vehiclePlate);

    List<DriverProfile> findByApprovalStatus(DriverApprovalStatus status);
     @Query(value = """
        SELECT d.* FROM driver_profiles d
        WHERE d.is_online = true
          AND d.approval_status = 'VERIFIED'
          AND d.current_latitude IS NOT NULL
          AND d.current_longitude IS NOT NULL
          AND (6371000 * acos(least(1.0, greatest(-1.0,
                cos(radians(:latitude)) * cos(radians(d.current_latitude)) *
                cos(radians(d.current_longitude) - radians(:longitude)) +
                sin(radians(:latitude)) * sin(radians(d.current_latitude)))))) <= :radiusInMeters
        ORDER BY (6371000 * acos(least(1.0, greatest(-1.0,
                cos(radians(:latitude)) * cos(radians(d.current_latitude)) *
                cos(radians(d.current_longitude) - radians(:longitude)) +
                sin(radians(:latitude)) * sin(radians(d.current_latitude)))))) ASC
        """, nativeQuery = true)
    List<DriverProfile> findNearbyAvailableDrivers(
            @Param("longitude") double longitude,
            @Param("latitude") double latitude,
            @Param("radiusInMeters") double radiusInMeters
    );

}
