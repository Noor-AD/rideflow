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

        ChatMessage entity = ChatMessage.builder()
                .rideId(rideId)
                .senderId(dto.getSenderId())
                .senderName(dto.getSenderName() != null ? dto.getSenderName() : "User")
                .senderRole(dto.getSenderRole() != null ? dto.getSenderRole() : "ROLE_RIDER")
                .message(dto.getMessage())
                .timestamp(ts)
                .build();

        ChatMessage saved = chatMessageRepository.save(entity);
        log.info("💬 [Ride {}] Chat message from {} ({}): {}", rideId, saved.getSenderName(), saved.getSenderRole(), saved.getMessage());

        dto.setId(saved.getId());
        dto.setRideId(rideId);
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

