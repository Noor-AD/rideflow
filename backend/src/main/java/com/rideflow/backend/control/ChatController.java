package com.rideflow.backend.control;

import java.util.List;

import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.rideflow.backend.dto.websocket.ChatMessageDto;
import com.rideflow.backend.model.User;
import com.rideflow.backend.service.ChatService;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/rides/{rideId}/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;
    private final SimpMessagingTemplate messagingTemplate;

    @GetMapping
    public ResponseEntity<List<ChatMessageDto>> getChatHistory(@PathVariable Long rideId) {
        return ResponseEntity.ok(chatService.getMessagesByRide(rideId));
    }

    @PostMapping
    public ResponseEntity<ChatMessageDto> sendMessage(
            @PathVariable Long rideId,
            @AuthenticationPrincipal User user,
            @RequestBody ChatMessageDto request
    ) {
        if (user != null) {
            request.setSenderId(user.getId());
            request.setSenderName(user.getName());
            if (user.getRoles() != null && !user.getRoles().isEmpty()) {
                request.setSenderRole(user.getRoles().iterator().next().name());
            }
        }

        ChatMessageDto saved = chatService.saveMessage(rideId, request);
        // Also broadcast on WebSocket topic
        messagingTemplate.convertAndSend("/topic/rides/" + rideId + "/chat", saved);
        return ResponseEntity.ok(saved);
    }
}

