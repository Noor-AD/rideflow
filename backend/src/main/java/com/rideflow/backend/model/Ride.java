package com.rideflow.backend.model;

import java.time.LocalDateTime;


import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name="rides")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Ride {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 1. Who is involved
    @ManyToOne(fetch=FetchType.LAZY)
    @JoinColumn(name="rider_id",nullable=false)
    private User rider;

    @ManyToOne(fetch= FetchType.LAZY)
    @JoinColumn(name="driver_id")
    private DriverProfile driver;

    // 2.Where are they going
    @Column(nullable = false)
    private Double pickupLat;

    @Column(nullable = false)
    private Double pickupLng;

    @Column(nullable=false)
    private String pickupAddress;

    @Column(nullable = false)
    private Double dropoffLat;

    @Column(nullable = false)
    private Double dropoffLng;

    @Column(nullable=false)
    private String dropoffAddress;

    // 3. Distance and Fare
    private Double distanceKm;
    private Double durationMinutes;
    private Double estimatedFare;
    private Double actualFare;

    // 4, Verification OTP (4 digits)
    @Column(length=4)
    private String otp;

    // 5.Lifecycle status
    @Enumerated(EnumType.STRING)
    @Column(nullable=false)
    private VehicleType vehicleType;

    @Enumerated(EnumType.STRING)
    @Column(nullable=false)
    @Builder.Default
    private RideStatus status = RideStatus.REQUESTED;

    @Enumerated(EnumType.STRING)
    @Column(nullable=false)
    private PaymentMethod paymentMethod;

    @Enumerated(EnumType.STRING)
    @Column(nullable=false)
    @Builder.Default
    private PaymentStatus paymentStatus = PaymentStatus.PENDING;

    // 6. Timestamps
    private LocalDateTime createdAt;
    private LocalDateTime acceptedAt;
    private LocalDateTime startedAt;
    private LocalDateTime completedAt;

    // 7. Advance Booking (Scheduled Rides)
    private LocalDateTime scheduledPickupTime;
    @Builder.Default
    private Boolean isScheduled = false;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        if (this.isScheduled == null) {
            this.isScheduled = false;
        }
    }
}
