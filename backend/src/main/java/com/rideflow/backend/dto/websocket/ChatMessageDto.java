package com.rideflow.backend.dto.websocket;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatMessageDto {
    private Long id;
    private Long rideId;
    private Long senderId;
    private String senderName;
    private String senderRole; // ROLE_RIDER or ROLE_DRIVER
    private String message;
    private Long timestamp;
}

