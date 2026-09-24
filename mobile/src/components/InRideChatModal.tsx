// mobile/src/components/InRideChatModal.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Send, MessageSquare, Car, User, Sparkles } from 'lucide-react-native';
import { mobileWs } from '../api/websocket';
import { chatApi } from '../api/client';
import type { ChatMessage, Role } from '../types';

interface InRideChatModalProps {
  visible: boolean;
  onClose: () => void;
  rideId: number;
  currentUserId: number;
  currentUserName: string;
  currentUserRole: Role;
  counterpartName: string;
  vehicleModel?: string;
  vehiclePlate?: string;
}

export const InRideChatModal: React.FC<InRideChatModalProps> = ({
  visible,
  onClose,
  rideId,
  currentUserId,
  currentUserName,
  currentUserRole,
  counterpartName,
  vehicleModel,
  vehiclePlate,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const flatListRef = useRef<FlatList>(null);

  // Quick-tap canned messages customized by role
  const riderCannedMessages = [
    "I'm waiting at the pickup gate",
    "I'm wearing a blue shirt",
    "Please call when you arrive",
    "Heavy traffic here, waiting on roadside",
  ];

  const driverCannedMessages = [
    "I'm on my way to your pickup",
    "Stuck in traffic, arriving in 2-3 mins",
    "I have arrived at the pickup location",
    "Please come near the main road gate",
  ];

  const cannedMessages =
    currentUserRole === 'ROLE_DRIVER' ? driverCannedMessages : riderCannedMessages;

  // 1. Load chat history & subscribe to STOMP WebSockets
  useEffect(() => {
    if (!visible || !rideId) return;

    // A. Fetch existing history from REST
    chatApi.getMessages(rideId)
      .then((history) => {
        setMessages(history);
      })
      .catch((err) => {
        console.warn('Failed to load chat history:', err);
      });

    // B. Subscribe to live WebSocket messages for this ride
    const unsubscribe = mobileWs.subscribeToRideChat(rideId, (incomingMsg) => {
      setMessages((prev) => {
        // Prevent duplicates if already in state by ID
        if (incomingMsg.id && prev.some((m) => m.id === incomingMsg.id)) {
          return prev;
        }

        // Replace any matching optimistic message (which has no id yet)
        const optimisticIndex = prev.findIndex(
          (m) =>
            !m.id &&
            m.senderId === incomingMsg.senderId &&
            m.message === incomingMsg.message
        );
        if (optimisticIndex !== -1) {
          const updated = [...prev];
          updated[optimisticIndex] = incomingMsg;
          return updated;
        }

        return [...prev, incomingMsg];
      });
    });

    return () => {
      unsubscribe();
    };
  }, [visible, rideId]);

  // 2. Auto-scroll on new messages
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  // 3. Send message handler
  const handleSendMessage = (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || !rideId) return;

    const newMsg: ChatMessage = {
      rideId,
      senderId: currentUserId,
      senderName: currentUserName,
      senderRole: currentUserRole === 'ROLE_DRIVER' ? 'ROLE_DRIVER' : 'ROLE_RIDER',
      message: text,
      timestamp: Date.now(),
    };

    // Optimistic UI update for instantaneous feel
    setMessages((prev) => [...prev, newMsg]);
    setInputText('');

    // If WebSocket is connected, send via STOMP WebSocket ONLY
    if (mobileWs.status === 'CONNECTED') {
      mobileWs.sendChatMessage(rideId, newMsg);
    } else {
      // Fallback to REST only when WebSocket is offline
      chatApi.sendMessage(rideId, newMsg)
        .then((saved) => {
          setMessages((prev) => {
            if (saved.id && prev.some((m) => m.id === saved.id)) return prev;
            const idx = prev.findIndex((m) => !m.id && m.message === saved.message);
            if (idx !== -1) {
              const updated = [...prev];
              updated[idx] = saved;
              return updated;
            }
            return [...prev, saved];
          });
        })
        .catch((err) => {
          console.error('Failed to send message via REST fallback:', err);
        });
    }
  };

  const formatTime = (epochMs: number) => {
    try {
      const date = new Date(epochMs);
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <SafeAreaView style={styles.modalBackdrop}>
        <KeyboardAvoidingView
          style={styles.keyboardContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 40 : 0}
        >
          <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerLeft}>
                <View style={styles.avatar}>
                  {currentUserRole === 'ROLE_DRIVER' ? (
                    <User size={20} color="#38bdf8" />
                  ) : (
                    <Car size={20} color="#10b981" />
                  )}
                </View>
                <View>
                  <Text style={styles.headerTitle}>
                    {counterpartName || (currentUserRole === 'ROLE_DRIVER' ? 'Passenger' : 'Driver Partner')}
                  </Text>
                  <Text style={styles.headerSubtitle}>
                    {vehicleModel ? `${vehicleModel} • ${vehiclePlate}` : 'Active Trip Chat'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {/* Quick Canned Chips Carousel */}
            <View style={styles.cannedSection}>
              <View style={styles.cannedHeader}>
                <Sparkles size={12} color="#10b981" />
                <Text style={styles.cannedLabel}>QUICK REPLIES</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.cannedScroll}
              >
                {cannedMessages.map((msg, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.cannedChip}
                    onPress={() => handleSendMessage(msg)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cannedChipText}>{msg}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* Messages List */}
            <FlatList
              ref={flatListRef}
              data={messages}
              keyExtractor={(item, index) => item.id?.toString() || index.toString()}
              contentContainerStyle={styles.messageList}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <MessageSquare size={36} color="#334155" />
                  <Text style={styles.emptyTitle}>In-Ride Chat</Text>
                  <Text style={styles.emptySubtitle}>
                    Send messages or tap a quick reply above to coordinate pickup.
                  </Text>
                </View>
              }
              renderItem={({ item }) => {
                const isMe = item.senderId === currentUserId;
                return (
                  <View
                    style={[
                      styles.messageRow,
                      isMe ? styles.messageRowRight : styles.messageRowLeft,
                    ]}
                  >
                    <View
                      style={[
                        styles.bubble,
                        isMe
                          ? currentUserRole === 'ROLE_DRIVER'
                            ? styles.bubbleMeDriver
                            : styles.bubbleMeRider
                          : styles.bubbleThem,
                      ]}
                    >
                      <Text
                        style={[
                          styles.messageText,
                          isMe ? styles.messageTextMe : styles.messageTextThem,
                        ]}
                      >
                        {item.message}
                      </Text>
                      <Text
                        style={[
                          styles.timeText,
                          isMe ? styles.timeTextMe : styles.timeTextThem,
                        ]}
                      >
                        {formatTime(item.timestamp)}
                      </Text>
                    </View>
                  </View>
                );
              }}
            />

            {/* Input Bar */}
            <View style={styles.inputContainer}>
              <TextInput
                style={styles.input}
                placeholder="Type a message..."
                placeholderTextColor="#64748b"
                value={inputText}
                onChangeText={setInputText}
                onSubmitEditing={() => handleSendMessage()}
                returnKeyType="send"
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  !inputText.trim() && styles.sendButtonDisabled,
                ]}
                onPress={() => handleSendMessage()}
                disabled={!inputText.trim()}
              >
                <Send size={18} color={inputText.trim() ? '#020617' : '#475569'} />
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.75)',
    justifyContent: 'flex-end',
  },
  keyboardContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  container: {
    height: '75%',
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: '#1e293b',
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    backgroundColor: '#0f172a',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cannedSection: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
    backgroundColor: '#090d16',
  },
  cannedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 16,
    marginBottom: 6,
  },
  cannedLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94a3b8',
    letterSpacing: 0.8,
  },
  cannedScroll: {
    paddingHorizontal: 16,
    gap: 8,
  },
  cannedChip: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cannedChipText: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '500',
  },
  messageList: {
    padding: 16,
    paddingBottom: 20,
    flexGrow: 1,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyTitle: {
    color: '#94a3b8',
    fontSize: 15,
    fontWeight: '600',
    marginTop: 12,
  },
  emptySubtitle: {
    color: '#475569',
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 240,
    marginTop: 4,
  },
  messageRow: {
    marginBottom: 10,
    flexDirection: 'row',
  },
  messageRowRight: {
    justifyContent: 'flex-end',
  },
  messageRowLeft: {
    justifyContent: 'flex-start',
  },
  bubble: {
    maxWidth: '80%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 18,
  },
  bubbleMeRider: {
    backgroundColor: '#10b981',
    borderBottomRightRadius: 4,
  },
  bubbleMeDriver: {
    backgroundColor: '#0284c7',
    borderBottomRightRadius: 4,
  },
  bubbleThem: {
    backgroundColor: '#1e293b',
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#334155',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 19,
  },
  messageTextMe: {
    color: '#ffffff',
    fontWeight: '500',
  },
  messageTextThem: {
    color: '#f1f5f9',
  },
  timeText: {
    fontSize: 10,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  timeTextMe: {
    color: 'rgba(255, 255, 255, 0.7)',
  },
  timeTextThem: {
    color: '#64748b',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
    backgroundColor: '#0f172a',
    gap: 10,
  },
  input: {
    flex: 1,
    backgroundColor: '#1e293b',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#10b981',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
  },
});

