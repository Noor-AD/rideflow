package com.rideflow.backend.dto.websocket;

import com.rideflow.backend.dto.response.RideResponse;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RideEventPayload {

    private String eventType;
    private Long rideId;
    private String message;
    private RideResponse data;
}
