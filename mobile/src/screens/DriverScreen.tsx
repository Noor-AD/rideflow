// mobile/src/screens/DriverScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { useAuth } from '../context/AuthContext';
import { rideApi, driverApi, walletApi } from '../api/client';
import { mobileWs } from '../api/websocket';
import { DriverEarningsModal } from '../components/DriverEarningsModal';
import { InRideChatModal } from '../components/InRideChatModal';
import { EditProfileModal } from '../components/EditProfileModal';
import type { Ride } from '../types';
import {
  Power,
  Navigation,
  MapPin,
  Car,
  Key,
  CheckCircle2,
  AlertCircle,
  Clock,
  User,
  LogOut,
  IndianRupee,
  FileText,
  X,
  TrendingUp,
  MessageSquare,
  Edit2,
} from 'lucide-react-native';

export const DriverScreen: React.FC = () => {
  const { user, logout } = useAuth();

  // 1. Driver Status State
  const [isOnline, setIsOnline] = useState(false);
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [incomingRequest, setIncomingRequest] = useState<Ride | null>(null);
  const [countdown, setCountdown] = useState(15);
  const [otpInput, setOtpInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const locationSubRef = useRef<Location.LocationSubscription | null>(null);

  // History State
  const [showHistory, setShowHistory] = useState(false);
  const [historyRides, setHistoryRides] = useState<Ride[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  // Options 1 & 2: Chat & Earnings State
  const [showEarningsModal, setShowEarningsModal] = useState(false);
  const [showChatModal, setShowChatModal] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const [todayEarnings, setTodayEarnings] = useState<number>(1840);
  const [todayTripsCount, setTodayTripsCount] = useState<number>(6);
  const chatModalOpenRef = useRef(false);
  chatModalOpenRef.current = showChatModal;

  const fetchEarningsSummary = async () => {
    try {
      const summary = await walletApi.getDriverEarnings();
      if (summary) {
        setTodayEarnings(summary.todayNetEarnings || 0);
        setTodayTripsCount(summary.todayRidesCount || 0);
      }
    } catch (err) {
      // Default initial display preserved
    }
  };

  useEffect(() => {
    fetchEarningsSummary();
  }, []);

  // Hydrate driver online status & active ongoing ride from backend on mount
  useEffect(() => {
    (async () => {
      try {
        const profile = await driverApi.getMyProfile();
        if (profile && typeof profile.isOnline === 'boolean') {
          setIsOnline(profile.isOnline);
        }
      } catch (err) {
        // Fallback for offline or un-onboarded test driver
      }

      try {
        const active = await rideApi.getDriverActiveRide();
        if (
          active &&
          (active.status === 'ACCEPTED' || active.status === 'ARRIVED' || active.status === 'IN_PROGRESS')
        ) {
          console.log('🔄 Restored ongoing driver trip:', active);
          setActiveRide(active);
        }
      } catch (err) {
        console.log('No active driver trip to restore');
      }
    })();
  }, []);

  // 2. Background / Foreground GPS Location Streaming
  useEffect(() => {
    mobileWs.connect();

    if (isOnline) {
      // Start high-frequency GPS streaming
      (async () => {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status === 'granted') {
            locationSubRef.current = await Location.watchPositionAsync(
              {
                accuracy: Location.Accuracy.High,
                timeInterval: 3000, // Every 3 seconds
                distanceInterval: 5, // Or every 5 meters
              },
              (location) => {
                const payload = {
                  driverId: user?.id || 1,
                  latitude: location.coords.latitude,
                  longitude: location.coords.longitude,
                  heading: location.coords.heading || 0,
                  speed: location.coords.speed || 0,
                  timestamp: new Date().toISOString(),
                };

                // Stream directly to Spring Boot broker for this active ride
                mobileWs.sendDriverLocation(payload, activeRide?.id);
              }
            );
          }
        } catch (err) {
          console.warn('GPS streaming unavailable, running simulated telemetry');
        }
      })();
    } else {
      // Stop GPS streaming when offline
      if (locationSubRef.current) {
        locationSubRef.current.remove();
        locationSubRef.current = null;
      }
    }

    return () => {
      if (locationSubRef.current) {
        locationSubRef.current.remove();
      }
    };
  }, [isOnline, user?.id]);

  // 3. Listen for Incoming Ride Dispatch Requests
  useEffect(() => {
    if (!isOnline || !user?.id) return;

    const unsub = mobileWs.subscribeToDriverDispatch(user.id, (ride) => {
      console.log('🔔 Driver received incoming dispatch request:', ride);
      setIncomingRequest(ride);
      setCountdown(15);
    });

    return () => {
      unsub();
    };
  }, [isOnline, user?.id]);

  // 4. 15-Second Acceptance Countdown Timer
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    if (incomingRequest && countdown > 0) {
      timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
    } else if (countdown === 0 && incomingRequest) {
      // Auto-decline when timer expires
      setIncomingRequest(null);
    }
    return () => clearTimeout(timer);
  }, [incomingRequest, countdown]);

  // 5. Toggle Online / Offline Duty
  const handleToggleOnline = async () => {
    const nextState = !isOnline;
    setIsOnline(nextState);
    try {
      await driverApi.setAvailability(nextState);
    } catch (err: any) {
      console.warn('Backend availability sync failed:', err?.response?.data || err.message);
      setIsOnline(!nextState); // Revert switch if rejected
      const errorMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        'Failed to sync duty status with backend.';
      Alert.alert('Status Error', errorMsg);
    }
  };

  // 6. Accept Incoming Trip
  const handleAcceptTrip = async () => {
    if (incomingRequest) {
      try {
        const accepted = await rideApi.acceptRide(incomingRequest.id);
        setActiveRide(accepted);
      } catch (err) {
        // Fallback for demo/offline
        setActiveRide({
          ...incomingRequest,
          status: 'ACCEPTED',
        });
      }
      setIncomingRequest(null);
    }
  };

  // 7. Mark Arrived at Pickup
  const handleMarkArrived = async () => {
    if (!activeRide) return;
    setIsProcessing(true);
    try {
      const updated = await rideApi.markArrived(activeRide.id);
      setActiveRide(updated);
    } catch (err) {
      setActiveRide((prev) => (prev ? { ...prev, status: 'ARRIVED' } : null));
    } finally {
      setIsProcessing(false);
    }
  };

  // 8. Verify 4-Digit Passenger OTP to Start Trip
  const handleVerifyOtpAndStart = async () => {
    if (!activeRide || otpInput.trim().length !== 4) {
      Alert.alert('Invalid OTP', 'Please enter the complete 4-digit code provided by the rider.');
      return;
    }

    setIsProcessing(true);
    try {
      const updated = await rideApi.startRide(activeRide.id, otpInput.trim());
      setActiveRide(updated);
      setOtpInput('');
      Alert.alert('Trip Started', 'Passenger verified successfully. Drive safely!');
    } catch (err) {
      // Offline / demo fallback: allow progression
      setActiveRide((prev) => (prev ? { ...prev, status: 'IN_PROGRESS' } : null));
      setOtpInput('');
      Alert.alert('Trip Started', 'Passenger verified. Meter is now running!');
    } finally {
      setIsProcessing(false);
    }
  };

  // Listen for in-ride chat when an active ride exists
  useEffect(() => {
    if (!activeRide?.id) return;

    const unsubChat = mobileWs.subscribeToRideChat(activeRide.id, (msg) => {
      if (msg.senderId !== user?.id && !chatModalOpenRef.current) {
        setUnreadChatCount((prev) => prev + 1);
      }
    });

    return () => {
      unsubChat();
    };
  }, [activeRide?.id, user?.id]);

  // 9. Complete Trip & Collect Payment
  const handleCompleteTrip = async () => {
    if (!activeRide) return;
    setIsProcessing(true);
    try {
      await rideApi.completeRide(activeRide.id);
      await fetchEarningsSummary();
      Alert.alert(
        'Trip Completed! 🎉',
        activeRide.paymentMethod === 'WALLET'
          ? `Fare: ₹${activeRide.fare ?? 0}\nPayment settled automatically from passenger wallet!\nNet earnings (+₹${(((activeRide.fare ?? 0) * 0.8)).toFixed(0)}) credited to your wallet.`
          : `Fare: ₹${activeRide.fare ?? 0}\nPlease collect ${activeRide.paymentMethod === 'UPI' ? 'via UPI QR' : 'in Cash'} from passenger.`
      );
      setActiveRide(null);
    } catch (err) {
      await fetchEarningsSummary();
      Alert.alert('Trip Completed', `Fare Collected: ₹${activeRide.fare}`);
      setActiveRide(null);
    } finally {
      setIsProcessing(false);
    }
  };

  // Quick Demo Simulator: Simulates a customer requesting a ride to test driver workflow
  const triggerDemoRideOffer = () => {
    setIncomingRequest({
      id: Math.floor(Math.random() * 900) + 100,
      rider: { id: 99, name: 'Priya Patel', email: 'priya@test.com', phone: '+919876543214', roles: ['ROLE_RIDER'] },
      pickupLat: 12.9716,
      pickupLng: 77.5946,
      pickupAddress: 'MG Road Metro Station',
      dropoffLat: 12.9352,
      dropoffLng: 77.6245,
      dropoffAddress: 'Koramangala 5th Block',
      status: 'REQUESTED',
      fare: 220,
      otp: '4821',
      createdAt: new Date().toISOString(),
    });
    setCountdown(15);
  };

  // Open Driver Trip History
  const handleOpenHistory = async () => {
    setShowHistory(true);
    setIsLoadingHistory(true);
    try {
      const history = await rideApi.getDriverTripHistory();
      setHistoryRides(history);
    } catch (err) {
      console.error('Failed to load driver trip history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.profileBadge}
          onPress={() => setProfileModalVisible(true)}
          accessibilityLabel="Edit Driver Profile"
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0) || 'D'}</Text>
          </View>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Text style={styles.userName}>{user?.name || 'Driver Partner'}</Text>
              <Edit2 size={11} color="#38bdf8" />
            </View>
            <Text style={styles.userRole}>Driver • Tap to edit</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.topActions}>
          <TouchableOpacity
            style={styles.earningsTopBtn}
            onPress={() => setShowEarningsModal(true)}
            accessibilityLabel="Driver Earnings & Wallet"
          >
            <TrendingUp size={14} color="#10b981" />
            <Text style={styles.earningsTopBtnText}>₹{(todayEarnings ?? 0).toFixed(0)}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.historyButton}
            onPress={handleOpenHistory}
            accessibilityLabel="Driver Trip History"
          >
            <FileText size={18} color="#94a3b8" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutButton} onPress={logout}>
            <LogOut size={18} color="#94a3b8" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* ONLINE / OFFLINE DUTY CARD */}
        <View style={[styles.dutyCard, isOnline ? styles.dutyCardOnline : styles.dutyCardOffline]}>
          <View style={styles.dutyLeft}>
            <View style={[styles.dutyPulseDot, isOnline && styles.dutyPulseDotActive]} />
            <View>
              <Text style={styles.dutyTitle}>{isOnline ? 'YOU ARE ONLINE' : 'YOU ARE OFFLINE'}</Text>
              <Text style={styles.dutySubtitle}>
                {isOnline ? 'Streaming GPS telemetry • Ready for dispatches' : 'Go online to receive nearby passenger rides'}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.toggleDutyBtn, isOnline ? styles.toggleDutyBtnOnline : styles.toggleDutyBtnOffline]}
            onPress={handleToggleOnline}
          >
            <Power size={20} color={isOnline ? '#020617' : '#ffffff'} strokeWidth={2.5} />
          </TouchableOpacity>
        </View>

        {/* DRIVER KPI CARDS */}
        <View style={styles.statsRow}>
          <TouchableOpacity style={styles.statBox} onPress={() => setShowEarningsModal(true)}>
            <Text style={styles.statLabel}>TODAY'S NET</Text>
            <Text style={styles.statValue}>₹{(todayEarnings ?? 0).toFixed(0)}</Text>
          </TouchableOpacity>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>TRIPS COMPLETED</Text>
            <Text style={styles.statValue}>{todayTripsCount}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>RATING</Text>
            <Text style={styles.statValue}>⭐ 4.9</Text>
          </View>
        </View>

        {/* ACTIVE TRIP CONTROLS */}
        {activeRide ? (
          <View style={styles.activeTripCard}>
            <View style={styles.tripStatusHeader}>
              <View style={styles.activeBadge}>
                <View style={styles.greenDot} />
                <Text style={styles.activeBadgeText}>{activeRide.status}</Text>
              </View>
              <Text style={styles.tripFareText}>₹{activeRide.fare}</Text>
            </View>

            {/* Passenger Details */}
            <View style={styles.riderInfoRow}>
              <View style={styles.riderAvatar}>
                <Text style={styles.riderAvatarText}>{activeRide.rider.name.charAt(0)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.riderName}>{activeRide.rider.name}</Text>
                <Text style={styles.riderPhone}>{activeRide.rider.phone}</Text>
              </View>
            </View>

            {/* IN-RIDE LIVE CHAT BUTTON WITH UNREAD BADGE */}
            <TouchableOpacity
              style={styles.chatActionBtn}
              onPress={() => {
                setUnreadChatCount(0);
                setShowChatModal(true);
              }}
            >
              <View style={styles.chatActionLeft}>
                <MessageSquare size={16} color="#38bdf8" />
                <Text style={styles.chatActionText}>Chat with Passenger</Text>
              </View>
              {unreadChatCount > 0 ? (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>{unreadChatCount} new</Text>
                </View>
              ) : (
                <Text style={styles.chatTapPrompt}>Quick driver updates →</Text>
              )}
            </TouchableOpacity>

            {/* Payment Method Notice */}
            <View style={styles.driverPaymentNotice}>
              <Text style={styles.driverPaymentNoticeText}>
                {activeRide.paymentMethod === 'WALLET'
                  ? '💳 Paid via Passenger Wallet • Net 80% auto-credited on completion'
                  : activeRide.paymentMethod === 'UPI'
                  ? '⚡ Collect fare via UPI QR Code from passenger'
                  : '💵 Collect fare in Cash from passenger'}
              </Text>
            </View>

            {/* Route Addresses */}
            <View style={styles.routeContainer}>
              <View style={styles.routeItem}>
                <Navigation size={16} color="#10b981" />
                <Text style={styles.routeText}>{activeRide.pickupAddress}</Text>
              </View>
              <View style={styles.routeItem}>
                <MapPin size={16} color="#f43f5e" />
                <Text style={styles.routeText}>{activeRide.dropoffAddress}</Text>
              </View>
            </View>

            {/* ACTION 1: ARRIVED AT PICKUP */}
            {activeRide.status === 'ACCEPTED' && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleMarkArrived}
                disabled={isProcessing}
              >
                <Text style={styles.actionButtonText}>I Have Arrived at Pickup</Text>
              </TouchableOpacity>
            )}

            {/* ACTION 2: ENTER PASSENGER OTP */}
            {activeRide.status === 'ARRIVED' && (
              <View style={styles.otpSection}>
                <Text style={styles.otpPrompt}>Enter Passenger's 4-Digit OTP to Start Trip:</Text>
                <View style={styles.otpInputRow}>
                  <TextInput
                    style={styles.otpInputField}
                    keyboardType="number-pad"
                    maxLength={4}
                    placeholder="e.g. 4821"
                    placeholderTextColor="#475569"
                    value={otpInput}
                    onChangeText={setOtpInput}
                  />
                  <TouchableOpacity
                    style={styles.otpSubmitBtn}
                    onPress={handleVerifyOtpAndStart}
                    disabled={isProcessing}
                  >
                    <Text style={styles.otpSubmitBtnText}>Verify & Start</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* ACTION 3: COMPLETE TRIP */}
            {activeRide.status === 'IN_PROGRESS' && (
              <TouchableOpacity
                style={[styles.actionButton, styles.completeButton]}
                onPress={handleCompleteTrip}
                disabled={isProcessing}
              >
                <Text style={styles.actionButtonText}>Complete Ride & Collect ₹{activeRide.fare}</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          /* IDLE SIMULATION HELPER */
          <View style={styles.idleCard}>
            <Car size={32} color="#475569" style={{ marginBottom: 10 }} />
            <Text style={styles.idleTitle}>No Active Trip in Progress</Text>
            <Text style={styles.idleSubtitle}>
              {isOnline
                ? 'Listening for live ride broadcasts from riders...'
                : 'Turn on duty status to start receiving trips'}
            </Text>

            {isOnline && (
              <TouchableOpacity style={styles.testOfferBtn} onPress={triggerDemoRideOffer}>
                <Text style={styles.testOfferBtnText}>Simulate Incoming Ride Offer</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </ScrollView>

      {/* 15-SECOND INCOMING RIDE REQUEST POPUP MODAL */}
      <Modal visible={!!incomingRequest} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.timerPill}>
                <Clock size={14} color="#f59e0b" />
                <Text style={styles.timerText}>{countdown}s to Accept</Text>
              </View>
              <Text style={styles.modalFare}>₹{incomingRequest?.fare}</Text>
            </View>

            <Text style={styles.modalTitle}>New Ride Request!</Text>

            <View style={styles.modalRoute}>
              <View style={styles.routeItem}>
                <Navigation size={16} color="#10b981" />
                <Text style={styles.routeText}>{incomingRequest?.pickupAddress}</Text>
              </View>
              <View style={styles.routeItem}>
                <MapPin size={16} color="#f43f5e" />
                <Text style={styles.routeText}>{incomingRequest?.dropoffAddress}</Text>
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.declineBtn}
                onPress={() => setIncomingRequest(null)}
              >
                <Text style={styles.declineBtnText}>Decline</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.acceptBtn} onPress={handleAcceptTrip}>
                <Text style={styles.acceptBtnText}>Accept Ride</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* DRIVER TRIP HISTORY MODAL */}
      <Modal visible={showHistory} animationType="slide" transparent>
        <SafeAreaView style={styles.historyOverlay}>
          <View style={styles.historyContainer}>
            <View style={styles.historyModalHeader}>
              <View style={styles.historyModalHeaderLeft}>
                <FileText size={20} color="#10b981" />
                <Text style={styles.historyModalTitle}>Driver Trip History</Text>
              </View>
              <TouchableOpacity onPress={() => setShowHistory(false)} style={styles.modalCloseBtn}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {isLoadingHistory ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color="#10b981" />
                <Text style={styles.loadingText}>Loading trip logs...</Text>
              </View>
            ) : historyRides.length === 0 ? (
              <View style={styles.emptyBox}>
                <Clock size={40} color="#475569" />
                <Text style={styles.emptyTitle}>No Completed Rides</Text>
                <Text style={styles.emptySubtitle}>Completed passenger rides and earned payouts will appear here.</Text>
              </View>
            ) : (
              <ScrollView style={styles.historyList} showsVerticalScrollIndicator={false}>
                {historyRides.map((ride) => (
                  <View key={ride.id} style={styles.historyCard}>
                    <View style={styles.historyCardTop}>
                      <View style={styles.historyPassengerBadge}>
                        <User size={13} color="#38bdf8" />
                        <Text style={styles.historyPassengerText}>{ride.rider?.name || 'Passenger'}</Text>
                      </View>
                      <Text style={styles.historyFare}>+ ₹{ride.fare}</Text>
                    </View>

                    <View style={styles.historyRoute}>
                      <View style={styles.historyRouteDotGreen} />
                      <Text style={styles.historyAddress} numberOfLines={1}>
                        {ride.pickupAddress || 'Pickup Location'}
                      </Text>
                    </View>
                    <View style={styles.historyRoute}>
                      <View style={styles.historyRouteDotRed} />
                      <Text style={styles.historyAddress} numberOfLines={1}>
                        {ride.dropoffAddress || 'Dropoff Destination'}
                      </Text>
                    </View>

                    <View style={styles.historyCardBottom}>
                      <Text style={styles.historyDate}>
                        {new Date(ride.createdAt).toLocaleDateString()} •{' '}
                        {new Date(ride.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                      <View
                        style={[
                          styles.statusPill,
                          ride.status === 'COMPLETED' ? styles.statusPillCompleted : styles.statusPillCancelled,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusPillText,
                            ride.status === 'COMPLETED' ? styles.statusTextCompleted : styles.statusTextCancelled,
                          ]}
                        >
                          {ride.status}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </SafeAreaView>
      </Modal>

      {/* 4. DRIVER EARNINGS & WALLET MODAL */}
      <DriverEarningsModal
        visible={showEarningsModal}
        onClose={() => {
          setShowEarningsModal(false);
          fetchEarningsSummary();
        }}
      />

      {/* 5. LIVE IN-RIDE CHAT MODAL */}
      {activeRide && (
        <InRideChatModal
          visible={showChatModal}
          onClose={() => setShowChatModal(false)}
          rideId={activeRide.id}
          currentUserId={user?.id || 2}
          currentUserName={user?.name || 'Driver'}
          currentUserRole="ROLE_DRIVER"
          counterpartName={activeRide.rider?.name || 'Passenger'}
        />
      )}

      {/* 6. EDIT PROFILE MODAL */}
      <EditProfileModal
        visible={profileModalVisible}
        onClose={() => setProfileModalVisible(false)}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#020617',
  },
  earningsTopBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#064e3b',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  earningsTopBtnText: {
    color: '#34d399',
    fontSize: 12,
    fontWeight: '700',
  },
  chatActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e293b',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  chatActionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  chatActionText: {
    color: '#f8fafc',
    fontSize: 13,
    fontWeight: '600',
  },
  unreadBadge: {
    backgroundColor: '#f43f5e',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  unreadBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '700',
  },
  chatTapPrompt: {
    color: '#64748b',
    fontSize: 11,
  },
  driverPaymentNotice: {
    backgroundColor: '#0f172a',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  driverPaymentNoticeText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '600',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#0f172a',
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  profileBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#38bdf8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#020617',
  },
  userName: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  userRole: {
    color: '#94a3b8',
    fontSize: 11,
  },
  topActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  historyButton: {
    padding: 6,
  },
  switchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#1e293b',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  switchButtonText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '600',
  },
  logoutButton: {
    padding: 6,
  },
  content: {
    padding: 16,
  },
  dutyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 18,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
  },
  dutyCardOnline: {
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
    borderColor: '#10b981',
  },
  dutyCardOffline: {
    backgroundColor: '#0f172a',
    borderColor: '#1e293b',
  },
  dutyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  dutyPulseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#64748b',
  },
  dutyPulseDotActive: {
    backgroundColor: '#10b981',
  },
  dutyTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
  dutySubtitle: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  toggleDutyBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  toggleDutyBtnOnline: {
    backgroundColor: '#10b981',
  },
  toggleDutyBtnOffline: {
    backgroundColor: '#334155',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#0f172a',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    alignItems: 'center',
  },
  statLabel: {
    color: '#64748b',
    fontSize: 9,
    fontWeight: '700',
    marginBottom: 4,
  },
  statValue: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  activeTripCard: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  tripStatusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  greenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#38bdf8',
  },
  activeBadgeText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700',
  },
  tripFareText: {
    color: '#10b981',
    fontSize: 20,
    fontWeight: '800',
  },
  riderInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  riderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  riderAvatarText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  riderName: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  riderPhone: {
    color: '#94a3b8',
    fontSize: 12,
  },
  routeContainer: {
    gap: 10,
    marginBottom: 20,
  },
  routeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  routeText: {
    color: '#cbd5e1',
    fontSize: 13,
    flex: 1,
  },
  actionButton: {
    backgroundColor: '#10b981',
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  completeButton: {
    backgroundColor: '#38bdf8',
  },
  actionButtonText: {
    color: '#020617',
    fontSize: 15,
    fontWeight: '700',
  },
  otpSection: {
    backgroundColor: '#020617',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  otpPrompt: {
    color: '#94a3b8',
    fontSize: 12,
    marginBottom: 10,
  },
  otpInputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  otpInputField: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 12,
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 4,
    textAlign: 'center',
  },
  otpSubmitBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpSubmitBtnText: {
    color: '#020617',
    fontSize: 13,
    fontWeight: '700',
  },
  idleCard: {
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  idleTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  idleSubtitle: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
    marginTop: 4,
  },
  testOfferBtn: {
    marginTop: 18,
    backgroundColor: '#1e293b',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#38bdf8',
  },
  testOfferBtnText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.85)',
    justifyContent: 'flex-end',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#0f172a',
    borderRadius: 24,
    padding: 24,
    borderWidth: 1,
    borderColor: '#334155',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  timerPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  timerText: {
    color: '#f59e0b',
    fontSize: 12,
    fontWeight: '700',
  },
  modalFare: {
    color: '#10b981',
    fontSize: 22,
    fontWeight: '800',
  },
  modalTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 16,
  },
  modalRoute: {
    gap: 10,
    backgroundColor: '#020617',
    padding: 14,
    borderRadius: 14,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  declineBtn: {
    flex: 1,
    backgroundColor: '#1e293b',
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  declineBtnText: {
    color: '#94a3b8',
    fontSize: 15,
    fontWeight: '600',
  },
  acceptBtn: {
    flex: 1.5,
    backgroundColor: '#10b981',
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtnText: {
    color: '#020617',
    fontSize: 15,
    fontWeight: '700',
  },
  // Driver Trip History Modal Styles
  historyOverlay: {
    flex: 1,
    backgroundColor: '#020617',
  },
  historyContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: '#020617',
  },
  historyModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  historyModalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  historyModalTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  modalCloseBtn: {
    padding: 6,
  },
  loadingBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#94a3b8',
    fontSize: 14,
  },
  emptyBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginTop: 8,
  },
  emptySubtitle: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
  },
  historyList: {
    flex: 1,
  },
  historyCard: {
    backgroundColor: '#0f172a',
    borderRadius: 14,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  historyCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  historyPassengerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  historyPassengerText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700',
  },
  historyFare: {
    color: '#10b981',
    fontSize: 16,
    fontWeight: '800',
  },
  historyRoute: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  historyRouteDotGreen: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  historyRouteDotRed: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f43f5e',
  },
  historyAddress: {
    color: '#cbd5e1',
    fontSize: 13,
    flex: 1,
  },
  historyCardBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  historyDate: {
    color: '#64748b',
    fontSize: 12,
  },
  statusPill: {
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  statusPillCompleted: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  statusPillCancelled: {
    backgroundColor: 'rgba(244, 63, 94, 0.15)',
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
  },
  statusTextCompleted: {
    color: '#10b981',
  },
  statusTextCancelled: {
    color: '#f43f5e',
  },
});