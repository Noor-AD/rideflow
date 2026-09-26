package com.rideflow.backend.service;

import java.util.List;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.rideflow.backend.dto.websocket.ChatMessageDto;
import com.rideflow.backend.model.ChatMessage;
import com.rideflow.backend.repository.ChatMessageRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

@Service
@RequiredArgsConstructor
@Slf4j
public class ChatService {

    private final ChatMessageRepository chatMessageRepository;

    @Transactional
    public ChatMessageDto saveMessage(Long rideId, ChatMessageDto dto) {
        long ts = dto.getTimestamp() != null ? dto.getTimestamp() : System.currentTimeMillis();
        String text = dto.getMessage() != null ? dto.getMessage().trim() : "";
        String role = dto.getSenderRole() != null ? dto.getSenderRole() : "ROLE_RIDER";

        // Deduplication: Check if an identical message was saved in the last 3.5 seconds
        List<ChatMessage> recent = chatMessageRepository.findTop5ByRideIdOrderByTimestampDesc(rideId);
        for (ChatMessage m : recent) {
            if (m.getMessage() != null && m.getMessage().trim().equalsIgnoreCase(text)
                    && Math.abs(ts - m.getTimestamp()) < 3500) {
                log.info("🛡️ Ignored duplicate chat message for ride {}: {}", rideId, text);
                dto.setId(m.getId());
                dto.setRideId(rideId);
                dto.setSenderId(m.getSenderId());
                dto.setSenderName(m.getSenderName());
                dto.setSenderRole(m.getSenderRole());
                dto.setMessage(m.getMessage());
                dto.setTimestamp(m.getTimestamp());
                return dto;
            }
        }

        ChatMessage entity = ChatMessage.builder()
                .rideId(rideId)
                .senderId(dto.getSenderId())
                .senderName(dto.getSenderName() != null ? dto.getSenderName() : "User")
                .senderRole(role)
                .message(text)
                .timestamp(ts)
                .build();

        ChatMessage saved = chatMessageRepository.save(entity);
        log.info("💬 [Ride {}] Chat message from {} ({}): {}", rideId, saved.getSenderName(), saved.getSenderRole(), saved.getMessage());

        dto.setId(saved.getId());
        dto.setRideId(rideId);
        dto.setSenderId(saved.getSenderId());
        dto.setSenderName(saved.getSenderName());
        dto.setSenderRole(saved.getSenderRole());
        dto.setMessage(saved.getMessage());
        dto.setTimestamp(saved.getTimestamp());
        return dto;
    }

    @Transactional(readOnly = true)
    public List<ChatMessageDto> getMessagesByRide(Long rideId) {
        return chatMessageRepository.findByRideIdOrderByTimestampAsc(rideId)
                .stream()
                .map(entity -> ChatMessageDto.builder()
                        .id(entity.getId())
                        .rideId(entity.getRideId())
                        .senderId(entity.getSenderId())
                        .senderName(entity.getSenderName())
                        .senderRole(entity.getSenderRole())
                        .message(entity.getMessage())
                        .timestamp(entity.getTimestamp())
                        .build())
                .collect(Collectors.toList());
    }
}

