package com.rideflow.backend.control;

import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.stereotype.Controller;

import com.rideflow.backend.dto.websocket.ChatMessageDto;
import com.rideflow.backend.dto.websocket.DriverLocationPayload;
import com.rideflow.backend.service.ChatService;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Controller
@RequiredArgsConstructor
@Slf4j
public class RideWebSocketController {

    private final ChatService chatService;

    /**
     * Driver streams GPS location packets here:
     * SEND destination: /app/rides/{rideId}/location
     *
     * Automatically forwarded to subscribers listening on:
     * SUBSCRIBE destination: /topic/rides/{rideId}/location
     */
    @MessageMapping("/rides/{rideId}/location")
    @SendTo("/topic/rides/{rideId}/location")
    public DriverLocationPayload broadcastDriverLocation(
            @DestinationVariable Long rideId,
            DriverLocationPayload payload
    ) {
        payload.setRideId(rideId);
        if (payload.getTimestamp() == null) {
            payload.setTimestamp(System.currentTimeMillis());
        }
        return payload;
    }

    /**
     * Rider or Driver sends a live in-ride chat message:
     * SEND destination: /app/rides/{rideId}/chat
     *
     * Automatically saved and forwarded to subscribers listening on:
     * SUBSCRIBE destination: /topic/rides/{rideId}/chat
     */
    @MessageMapping("/rides/{rideId}/chat")
    @SendTo("/topic/rides/{rideId}/chat")
    public ChatMessageDto handleRideChat(
            @DestinationVariable Long rideId,
            ChatMessageDto message
    ) {
        return chatService.saveMessage(rideId, message);
    }
}