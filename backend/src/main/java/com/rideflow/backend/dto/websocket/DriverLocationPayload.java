package com.rideflow.backend.dto.websocket;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DriverLocationPayload {

    private Long driverId;
    private Long rideId;
    private Double latitude;
    private Double longitude;
    private Double bearing; // 0° to 360° heading for car rotation on map
    private Double speed;   // Speed in km/h
    private Long timestamp;
}
