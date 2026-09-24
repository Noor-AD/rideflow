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
          AND d.current_location IS NOT NULL
          AND ST_DWithin(
                d.current_location::geography,
                ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography,
                :radiusInMeters
              )
        ORDER BY ST_Distance(
                d.current_location::geography,
                ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography
              ) ASC
        """, nativeQuery = true)
    List<DriverProfile> findNearbyAvailableDrivers(
            @Param("longitude") double longitude,
            @Param("latitude") double latitude,
            @Param("radiusInMeters") double radiusInMeters
    );

}
