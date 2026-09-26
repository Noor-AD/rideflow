// mobile/src/screens/RiderScreen.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  Platform,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LeafletMap } from '../components/LeafletMap';
import * as Location from 'expo-location';
import { useAuth } from '../context/AuthContext';
import { rideApi, walletApi } from '../api/client';
import { mobileWs } from '../api/websocket';
import { AddressSearchModal } from '../components/AddressSearchModal';
import { InRideChatModal } from '../components/InRideChatModal';
import { WalletModal } from '../components/WalletModal';
import { UpiPaymentModal } from '../components/UpiPaymentModal';
import { ScheduleRideModal } from '../components/ScheduleRideModal';
import { ScheduledRidesDrawer } from '../components/ScheduledRidesDrawer';
import { EditProfileModal } from '../components/EditProfileModal';
import { navigationService, type AddressSuggestion } from '../services/navigationService';
import type { Ride, VehicleType, RideStatus, PaymentMethod } from '../types';
import {
  Navigation,
  MapPin,
  Car,
  ShieldCheck,
  Clock,
  ArrowRight,
  LogOut,
  RefreshCw,
  Key,
  Star,
  X,
  FileText,
  Search,
  Sparkles,
  CreditCard,
  MessageSquare,
  Calendar,
  QrCode,
  Edit2,
  CheckCircle2,
} from 'lucide-react-native';

export const RiderScreen: React.FC = () => {
  const { user, logout } = useAuth();

  // 1. Coordinates & Addresses State (Default: MG Road to Koramangala, Bengaluru)
  const [pickupCoords, setPickupCoords] = useState({
    latitude: 12.9716,
    longitude: 77.5946,
  });
  const [pickupAddress, setPickupAddress] = useState('MG Road Metro Station');

  const [dropoffCoords, setDropoffCoords] = useState({
    latitude: 12.9352,
    longitude: 77.6245,
  });
  const [dropoffAddress, setDropoffAddress] = useState('Koramangala 5th Block');

  // Address Search Modal State
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [searchMode, setSearchMode] = useState<'PICKUP' | 'DROPOFF'>('DROPOFF');

  // Smart Navigation & OSRM Road Geometry States
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([]);
  const [routeDistanceKm, setRouteDistanceKm] = useState<number>(7.5);
  const [routeDurationMins, setRouteDurationMins] = useState<number>(14);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState<boolean>(false);

  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType>('PREMIUM');
  const [activeRide, setActiveRide] = useState<Ride | null>(null);
  const [isBooking, setIsBooking] = useState(false);
  const [driverLocation, setDriverLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const simIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // History & Rating States
  const [showHistory, setShowHistory] = useState(false);
  const [historyRides, setHistoryRides] = useState<Ride[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [completedRideDetails, setCompletedRideDetails] = useState<any>(null);
  const [completedRideId, setCompletedRideId] = useState<number | null>(null);
  const [selectedRating, setSelectedRating] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [isSubmittingRating, setIsSubmittingRating] = useState(false);

  // Options 1, 2 & 4: Live Chat, Wallet & Scheduled Rides State
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>('WALLET');
  const [walletModalVisible, setWalletModalVisible] = useState(false);
  const [scheduledDrawerVisible, setScheduledDrawerVisible] = useState(false);
  const [scheduleModalVisible, setScheduleModalVisible] = useState(false);
  const [scheduledTime, setScheduledTime] = useState<string | null>(null);
  const [chatModalVisible, setChatModalVisible] = useState(false);
  const [upiModalVisible, setUpiModalVisible] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);
  const chatModalOpenRef = useRef(false);
  chatModalOpenRef.current = chatModalVisible;

  // Hydrate Wallet Balance on mount
  const fetchWalletBalance = async () => {
    try {
      const res = await walletApi.getBalance();
      setWalletBalance(res?.balance ?? 0);
    } catch (err) {
      // Offline fallback
      setWalletBalance(0);
    }
  };

  useEffect(() => {
    fetchWalletBalance();
  }, []);

  useEffect(() => {
    return () => {
      if (simIntervalRef.current) clearInterval(simIntervalRef.current);
    };
  }, []);

  // 1.5 Active Ride Recovery on App Launch / Reload
  useEffect(() => {
    (async () => {
      try {
        const active = await rideApi.getRiderActiveRide();
        if (
          active &&
          (active.status === 'REQUESTED' ||
            active.status === 'ACCEPTED' ||
            active.status === 'ARRIVED' ||
            active.status === 'IN_PROGRESS')
        ) {
          console.log('🔄 Restored ongoing rider trip:', active);
          setActiveRide(active);
        }
      } catch (err) {
        console.log('No active rider trip to restore');
      }
    })();
  }, []);

  // 2. Request GPS Permission on Mount
  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          const currentPickup = {
            latitude: loc.coords.latitude,
            longitude: loc.coords.longitude,
          };
          const currentDropoff = {
            latitude: loc.coords.latitude + 0.025,
            longitude: loc.coords.longitude + 0.02,
          };
          setPickupCoords(currentPickup);
          setPickupAddress('My Current Location');
          setDropoffCoords(currentDropoff);
        }
      } catch (err) {
        console.log('📍 GPS permission unavailable or offline, defaulting to Bangalore center fallback');
      }
    })();
  }, []);

  // 2.5 Fetch real street road route & geometry whenever pickupCoords or dropoffCoords change
  useEffect(() => {
    let isCancelled = false;
    (async () => {
      setIsCalculatingRoute(true);
      try {
        const details = await navigationService.getDrivingRoute(pickupCoords, dropoffCoords);
        if (!isCancelled) {
          setRouteCoordinates(details.coordinates);
          setRouteDistanceKm(details.distanceKm);
          setRouteDurationMins(details.durationMins);
        }
      } catch (err) {
        console.warn('Failed to calculate road route:', err);
      } finally {
        if (!isCancelled) setIsCalculatingRoute(false);
      }
    })();

    return () => {
      isCancelled = true;
    };
  }, [pickupCoords.latitude, pickupCoords.longitude, dropoffCoords.latitude, dropoffCoords.longitude]);

  // 3. Connect to WebSocket & Listen for Ride Updates + Live Driver GPS
  useEffect(() => {
    mobileWs.connect();

    if (!activeRide) return;

    // A. Subscribe to ride status transitions (ACCEPTED, ARRIVED, IN_PROGRESS, COMPLETED, CANCELLED)
    const unsubStatus = mobileWs.subscribeToRideUpdates(activeRide.id, (event: any) => {
      console.log('⚡ Rider received STOMP update:', event);

      const status: RideStatus | undefined =
        event.status ||
        event.data?.status ||
        (event.eventType === 'TRIP_COMPLETED' ? 'COMPLETED' :
         event.eventType === 'RIDE_ACCEPTED' ? 'ACCEPTED' :
         event.eventType === 'DRIVER_ARRIVED' ? 'ARRIVED' :
         event.eventType === 'TRIP_STARTED' ? 'IN_PROGRESS' :
         event.eventType === 'RIDE_CANCELLED' ? 'CANCELLED' : undefined);

      if (!status) return;

      if (status === 'COMPLETED' || event.eventType === 'TRIP_COMPLETED') {
        const fullRide = {
          ...activeRide,
          ...(event.data || {}),
          status: 'COMPLETED' as RideStatus,
          fare: event.data?.actualFare || event.data?.estimatedFare || activeRide.fare,
        };
        setCompletedRideDetails(fullRide);
        setCompletedRideId(activeRide.id);
        setShowRatingModal(true);
        setActiveRide(null);
        setDriverLocation(null);
        fetchWalletBalance();
        Alert.alert('Trip Completed 🎉', 'You have arrived at your destination! Thank you for riding with RideFlow.');
        return;
      }

      setActiveRide((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          status,
          ...(event.data || {}),
        };
      });

      if (status === 'ACCEPTED' || status === 'ARRIVED' || status === 'IN_PROGRESS') {
        const dLat = event.driverLat || event.data?.driverLat;
        const dLng = event.driverLng || event.data?.driverLng;
        if (dLat && dLng) {
          setDriverLocation({
            latitude: dLat,
            longitude: dLng,
          });
        }
      } else {
        setDriverLocation(null);
      }
    });

    // B. Subscribe to high-frequency live driver GPS coordinates
    const unsubLocation = mobileWs.subscribeToDriverLocation(activeRide.id, (loc) => {
      // Only display driver location once driver has accepted
      if (activeRide.status === 'ACCEPTED' || activeRide.status === 'ARRIVED' || activeRide.status === 'IN_PROGRESS') {
        setDriverLocation({
          latitude: loc.latitude,
          longitude: loc.longitude,
        });
      }
    });

    // C. Subscribe to live in-ride chat
    const unsubChat = mobileWs.subscribeToRideChat(activeRide.id, (msg) => {
      if (msg.senderId !== user?.id && !chatModalOpenRef.current) {
        setUnreadChatCount((prev) => prev + 1);
      }
    });

    return () => {
      unsubStatus();
      unsubLocation();
      unsubChat();
    };
  }, [activeRide?.id]);

  // 3.5 Fallback Watchdog Polling for active ride status in case STOMP socket drops
  useEffect(() => {
    if (!activeRide?.id || activeRide.status === 'COMPLETED') return;

    const pollInterval = setInterval(async () => {
      try {
        const current = await rideApi.getRiderActiveRide();
        if (current && current.status) {
          if (current.status !== activeRide.status) {
            setActiveRide((prev) => (prev ? { ...prev, ...current } : current));
          }
        } else {
          // Ongoing active ride returned null -> trip completed or cancelled on server!
          const history = await rideApi.getRiderTripHistory();
          const latest = history?.[0];
          if (latest && (latest.id === activeRide.id || latest.status === 'COMPLETED')) {
            const fullRide = {
              ...activeRide,
              ...latest,
              fare: latest.actualFare || latest.estimatedFare || activeRide.fare,
            };
            setCompletedRideDetails(fullRide);
            setCompletedRideId(latest.id);
            setShowRatingModal(true);
            setActiveRide(null);
            setDriverLocation(null);
            fetchWalletBalance();
          }
        }
      } catch (pollErr) {
        // Silently ignore intermittent network error
      }
    }, 2500);

    return () => clearInterval(pollInterval);
  }, [activeRide?.id, activeRide?.status]);

  const economyFare = navigationService.calculateFare(routeDistanceKm, 'ECONOMY');
  const premiumFare = navigationService.calculateFare(routeDistanceKm, 'PREMIUM');
  const suvFare = navigationService.calculateFare(routeDistanceKm, 'SUV');

  const selectedFare =
    selectedVehicle === 'ECONOMY'
      ? economyFare
      : selectedVehicle === 'PREMIUM'
      ? premiumFare
      : suvFare;

  const handleSelectLocation = (location: AddressSuggestion) => {
    if (searchMode === 'PICKUP') {
      setPickupCoords({
        latitude: location.latitude,
        longitude: location.longitude,
      });
      setPickupAddress(location.shortName);
    } else {
      setDropoffCoords({
        latitude: location.latitude,
        longitude: location.longitude,
      });
      setDropoffAddress(location.shortName);
    }
  };

  // 4. Request / Book a Ride
  const handleBookRide = async () => {
    setIsBooking(true);
    setDriverLocation(null);
    try {
      const ride = await rideApi.bookRide({
        pickupLat: pickupCoords.latitude,
        pickupLng: pickupCoords.longitude,
        dropoffLat: dropoffCoords.latitude,
        dropoffLng: dropoffCoords.longitude,
        pickupAddress,
        dropoffAddress,
        vehicleType: selectedVehicle,
        paymentMethod: selectedPaymentMethod,
        scheduledPickupTime: scheduledTime || undefined,
      });

      if (scheduledTime) {
        Alert.alert(
          'Ride Scheduled! 🗓️',
          `Your ${selectedVehicle} ride has been scheduled for ${new Date(scheduledTime).toLocaleString([], {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })}.\n\nA driver will be matched and dispatched automatically 15 minutes before pickup.`,
          [
            {
              text: 'View Scheduled Trips',
              onPress: () => setScheduledDrawerVisible(true),
            },
            { text: 'OK' },
          ]
        );
        setScheduledTime(null);
      } else {
        setActiveRide(ride);
      }
    } catch (err: any) {
      console.error('Ride booking failed:', err);
      // Fallback Demo Ride if backend driver matching is running locally without active drivers
      setActiveRide({
        id: Math.floor(Math.random() * 900) + 100,
        rider: user!,
        pickupLat: pickupCoords.latitude,
        pickupLng: pickupCoords.longitude,
        pickupAddress,
        dropoffLat: dropoffCoords.latitude,
        dropoffLng: dropoffCoords.longitude,
        dropoffAddress,
        status: 'REQUESTED',
        fare: selectedFare,
        otp: '4821', // 4-digit security OTP
        createdAt: new Date().toISOString(),
        paymentMethod: selectedPaymentMethod,
      });
    } finally {
      setIsBooking(false);
    }
  };

  const handleCancelRide = async () => {
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
      simIntervalRef.current = null;
    }
    if (activeRide?.id) {
      try {
        await rideApi.cancelRide(activeRide.id);
      } catch (err) {
        console.log('Cancel ride local fallback');
      }
    }
    setActiveRide(null);
    setDriverLocation(null);
  };

  // Open Trip History
  const handleOpenHistory = async () => {
    setShowHistory(true);
    setIsLoadingHistory(true);
    try {
      const history = await rideApi.getRiderTripHistory();
      setHistoryRides(history);
    } catch (err) {
      console.error('Failed to load rider trip history:', err);
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Submit Driver Rating
  const handleSubmitRating = async () => {
    if (!completedRideId) {
      setShowRatingModal(false);
      return;
    }
    setIsSubmittingRating(true);
    try {
      await rideApi.rateRide(completedRideId, selectedRating, ratingComment);
      Alert.alert('Rating Submitted', 'Thank you! Your rating has been recorded.');
    } catch (err) {
      Alert.alert('Rating Submitted', 'Thank you for your rating!');
    } finally {
      setIsSubmittingRating(false);
      setShowRatingModal(false);
      setCompletedRideId(null);
      setRatingComment('');
      setSelectedRating(5);
      setActiveRide(null);
      setDriverLocation(null);
    }
  };

  // Smooth live telemetry approaching simulator for demo & testing
  const startDriverApproachSimulation = () => {
    if (simIntervalRef.current) {
      clearInterval(simIntervalRef.current);
    }

    // Mark ride as ACCEPTED
    setActiveRide((prev) => (prev ? { ...prev, status: 'ACCEPTED' } : null));

    // Start ~1.2 km away north-east of pickup
    let currentLat = pickupCoords.latitude + 0.0095;
    let currentLng = pickupCoords.longitude + 0.0085;
    const targetLat = pickupCoords.latitude;
    const targetLng = pickupCoords.longitude;
    const totalSteps = 15;
    const stepLat = (targetLat - currentLat) / totalSteps;
    const stepLng = (targetLng - currentLng) / totalSteps;
    let currentStep = 0;

    setDriverLocation({ latitude: currentLat, longitude: currentLng });

    simIntervalRef.current = setInterval(() => {
      currentStep++;
      currentLat += stepLat;
      currentLng += stepLng;

      setDriverLocation({
        latitude: currentLat,
        longitude: currentLng,
      });

      // Stream to WebSocket broker as well
      if (activeRide) {
        mobileWs.sendDriverLocation({
          driverId: 1,
          latitude: currentLat,
          longitude: currentLng,
          heading: 225,
          speed: 38,
          timestamp: new Date().toISOString(),
        }, activeRide.id);
      }

      if (currentStep >= totalSteps) {
        if (simIntervalRef.current) clearInterval(simIntervalRef.current);
        simIntervalRef.current = null;
        setActiveRide((prev) => (prev ? { ...prev, status: 'ARRIVED' } : null));
        Alert.alert('Driver Arrived!', 'Your driver has reached the pickup location outside.');
      }
    }, 1200);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Top Floating App Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity
          style={styles.profileBadge}
          onPress={() => setProfileModalVisible(true)}
          accessibilityLabel="Edit Profile"
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.charAt(0) || 'R'}</Text>
          </View>
          <View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
              <Text style={styles.userName}>{user?.name || 'Passenger'}</Text>
              <Edit2 size={11} color="#38bdf8" />
            </View>
            <Text style={styles.userRole}>Rider • Tap to edit</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.topActions}>
          <TouchableOpacity
            style={styles.walletTopBtn}
            onPress={() => setWalletModalVisible(true)}
            accessibilityLabel="RideFlow Wallet"
          >
            <CreditCard size={14} color="#10b981" />
            <Text style={styles.walletTopBtnText}>₹{(walletBalance ?? 0).toFixed(0)}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.historyButton}
            onPress={() => setScheduledDrawerVisible(true)}
            accessibilityLabel="Scheduled Trips"
          >
            <Calendar size={18} color="#38bdf8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.historyButton}
            onPress={handleOpenHistory}
            accessibilityLabel="Trip History"
          >
            <FileText size={18} color="#94a3b8" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.logoutButton} onPress={logout}>
            <LogOut size={18} color="#94a3b8" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Interactive Street Route & Address Selector */}
      {!activeRide && (
        <View style={styles.routeSelectorCard}>
          {/* Pickup Selection Row */}
          <TouchableOpacity
            style={styles.routeRow}
            onPress={() => {
              setSearchMode('PICKUP');
              setSearchModalVisible(true);
            }}
          >
            <View style={styles.routeDotPickup} />
            <View style={styles.routeTextWrap}>
              <Text style={styles.routeMiniLabel}>PICKUP LOCATION</Text>
              <Text style={styles.routeAddressMain} numberOfLines={1}>
                {pickupAddress}
              </Text>
            </View>
            <View style={styles.routeEditPill}>
              <Text style={styles.routeEditPillText}>Change</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.routeSeparator} />

          {/* Destination Selection Row */}
          <TouchableOpacity
            style={styles.routeRow}
            onPress={() => {
              setSearchMode('DROPOFF');
              setSearchModalVisible(true);
            }}
          >
            <View style={styles.routeDotDropoff} />
            <View style={styles.routeTextWrap}>
              <Text style={styles.routeMiniLabel}>WHERE TO?</Text>
              <Text style={styles.routeAddressMain} numberOfLines={1}>
                {dropoffAddress}
              </Text>
            </View>
            <View style={[styles.routeEditPill, styles.routeEditPillDropoff]}>
              <Search size={12} color="#38bdf8" />
              <Text style={[styles.routeEditPillText, { color: '#38bdf8' }]}>Search</Text>
            </View>
          </TouchableOpacity>

          {/* Dynamic Road Distance & ETA Pill */}
          <View style={styles.routeEtaBar}>
            {isCalculatingRoute ? (
              <View style={styles.etaLoadingRow}>
                <ActivityIndicator size="small" color="#10b981" />
                <Text style={styles.etaLoadingText}>Calculating road route...</Text>
              </View>
            ) : (
              <View style={styles.etaInfoRow}>
                <View style={styles.etaBadge}>
                  <Navigation size={12} color="#10b981" />
                  <Text style={styles.etaBadgeText}>{routeDistanceKm} km road distance</Text>
                </View>
                <View style={styles.etaBadgeTime}>
                  <Clock size={12} color="#f59e0b" />
                  <Text style={styles.etaBadgeTimeText}>~{routeDurationMins} mins driving</Text>
                </View>
              </View>
            )}
          </View>
        </View>
      )}

      {/* Main Interactive Map (Zero-Config OpenStreetMap / Leaflet) */}
      <View style={styles.mapContainer}>
        <LeafletMap
          pickupCoords={pickupCoords}
          dropoffCoords={dropoffCoords}
          driverLocation={driverLocation}
          routeCoordinates={routeCoordinates}
          rideStatus={activeRide?.status}
        />
      </View>

      {/* Floating Bottom Card / Action Sheet */}
      <View style={styles.bottomCard}>
        {!activeRide ? (
          /* STATE 1: VEHICLE TIER SELECTION & FARE ESTIMATE */
          <View>
            <Text style={styles.cardHeader}>Choose your ride tier</Text>

            <View style={styles.vehicleRow}>
              {/* TIER 1: ECONOMY */}
              <TouchableOpacity
                style={[styles.vehicleOption, selectedVehicle === 'ECONOMY' && styles.vehicleOptionSelected]}
                onPress={() => setSelectedVehicle('ECONOMY')}
              >
                <Text style={styles.vehicleEmoji}>🛺</Text>
                <Text style={styles.vehicleTitle}>Economy</Text>
                <Text style={styles.vehicleFare}>₹{economyFare}</Text>
              </TouchableOpacity>

              {/* TIER 2: PREMIUM */}
              <TouchableOpacity
                style={[styles.vehicleOption, selectedVehicle === 'PREMIUM' && styles.vehicleOptionSelected]}
                onPress={() => setSelectedVehicle('PREMIUM')}
              >
                <Text style={styles.vehicleEmoji}>🚗</Text>
                <Text style={styles.vehicleTitle}>Premium</Text>
                <Text style={styles.vehicleFare}>₹{premiumFare}</Text>
              </TouchableOpacity>

              {/* TIER 3: SUV */}
              <TouchableOpacity
                style={[styles.vehicleOption, selectedVehicle === 'SUV' && styles.vehicleOptionSelected]}
                onPress={() => setSelectedVehicle('SUV')}
              >
                <Text style={styles.vehicleEmoji}>🚙</Text>
                <Text style={styles.vehicleTitle}>SUV</Text>
                <Text style={styles.vehicleFare}>₹{suvFare}</Text>
              </TouchableOpacity>
            </View>

            {/* Advance Scheduling Option */}
            {scheduledTime ? (
              <View style={styles.scheduledPillRow}>
                <View style={styles.scheduledPillLeft}>
                  <Calendar size={14} color="#38bdf8" />
                  <Text style={styles.scheduledPillText}>
                    Pickup: {new Date(scheduledTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}, {new Date(scheduledTime).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setScheduledTime(null)} style={styles.removeScheduleBtn}>
                  <X size={14} color="#94a3b8" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.scheduleActionBtn}
                onPress={() => setScheduleModalVisible(true)}
              >
                <Clock size={14} color="#38bdf8" />
                <Text style={styles.scheduleActionText}>Schedule for Later (Airport / Advance)</Text>
              </TouchableOpacity>
            )}

            {/* Payment Method Selector */}
            <View style={styles.paymentSection}>
              <Text style={styles.paymentSectionTitle}>Payment Method</Text>
              <View style={styles.paymentMethodRow}>
                <TouchableOpacity
                  style={[
                    styles.paymentMethodChip,
                    selectedPaymentMethod === 'WALLET' && styles.paymentMethodChipSelected,
                  ]}
                  onPress={() => setSelectedPaymentMethod('WALLET')}
                >
                  <CreditCard size={13} color={selectedPaymentMethod === 'WALLET' ? '#10b981' : '#94a3b8'} />
                  <Text
                    style={[
                      styles.paymentMethodChipText,
                      selectedPaymentMethod === 'WALLET' && styles.paymentMethodChipTextSelected,
                    ]}
                  >
                    Wallet (₹{(walletBalance ?? 0).toFixed(0)})
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.paymentMethodChip,
                    selectedPaymentMethod === 'UPI' && styles.paymentMethodChipSelected,
                  ]}
                  onPress={() => setSelectedPaymentMethod('UPI')}
                >
                  <QrCode size={13} color={selectedPaymentMethod === 'UPI' ? '#38bdf8' : '#94a3b8'} />
                  <Text
                    style={[
                      styles.paymentMethodChipText,
                      selectedPaymentMethod === 'UPI' && styles.paymentMethodChipTextSelected,
                    ]}
                  >
                    UPI QR
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.paymentMethodChip,
                    selectedPaymentMethod === 'CASH' && styles.paymentMethodChipSelected,
                  ]}
                  onPress={() => setSelectedPaymentMethod('CASH')}
                >
                  <Text style={styles.cashIconText}>💵</Text>
                  <Text
                    style={[
                      styles.paymentMethodChipText,
                      selectedPaymentMethod === 'CASH' && styles.paymentMethodChipTextSelected,
                    ]}
                  >
                    Cash
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Book Now Button */}
            <TouchableOpacity
              style={styles.bookButton}
              onPress={handleBookRide}
              disabled={isBooking}
            >
              {isBooking ? (
                <ActivityIndicator color="#020617" />
              ) : (
                <>
                  <Text style={styles.bookButtonText}>
                    {scheduledTime ? `Schedule ${selectedVehicle} Ride` : `Confirm & Book ${selectedVehicle}`}
                  </Text>
                  <ArrowRight size={18} color="#020617" strokeWidth={2.5} />
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          /* STATE 2: ACTIVE RIDE & 4-DIGIT OTP SECURITY CARD */
          <View>
            <View style={styles.rideStatusHeader}>
              <View style={styles.statusBadge}>
                <View style={styles.statusDot} />
                <Text style={styles.statusText}>{activeRide.status}</Text>
              </View>
              <Text style={styles.rideIdText}>TRIP #{activeRide.id}</Text>
            </View>

            {/* Prominent 4-Digit Ride Start OTP */}
            <View style={styles.otpCard}>
              <View style={styles.otpLeft}>
                <Key size={20} color="#10b981" />
                <View>
                  <Text style={styles.otpLabel}>START RIDE OTP</Text>
                  <Text style={styles.otpValue}>{activeRide.otp || '4821'}</Text>
                </View>
              </View>
              <Text style={styles.otpHint}>Share with driver to start trip</Text>
            </View>

            {/* IN-RIDE LIVE CHAT BUTTON WITH UNREAD BADGE */}
            <TouchableOpacity
              style={styles.chatActionBtn}
              onPress={() => {
                setUnreadChatCount(0);
                setChatModalVisible(true);
              }}
            >
              <View style={styles.chatActionLeft}>
                <MessageSquare size={18} color="#38bdf8" />
                <Text style={styles.chatActionText}>Chat with Driver</Text>
              </View>
              {unreadChatCount > 0 ? (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadBadgeText}>{unreadChatCount} new</Text>
                </View>
              ) : (
                <Text style={styles.chatTapPrompt}>Quick messages available →</Text>
              )}
            </TouchableOpacity>

            {/* Live Driver En-Route Status Banner or Simulation Trigger */}
            {driverLocation ? (
              <View style={styles.enRouteBanner}>
                <View style={styles.enRouteLeft}>
                  <Car size={16} color="#38bdf8" />
                  <View style={styles.enRoutePulseDot} />
                  <Text style={styles.enRouteText}>
                    {activeRide.status === 'ARRIVED'
                      ? 'Driver has arrived outside!'
                      : 'Driver approaching • Live GPS tracking'}
                  </Text>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.simulateApproachBtn}
                onPress={startDriverApproachSimulation}
              >
                <Car size={16} color="#38bdf8" />
                <Text style={styles.simulateApproachBtnText}>
                  ▶ Watch Driver Approaching (Live Demo)
                </Text>
              </TouchableOpacity>
            )}

            {/* Trip Details & Payment Badge */}
            <View style={styles.tripInfoRow}>
              <Text style={styles.infoLabel}>Estimated Fare</Text>
              <Text style={styles.fareAmount}>₹{activeRide.fare}</Text>
            </View>

            {/* Dynamic Payment State Pill or Action */}
            {activeRide.paymentMethod === 'UPI' ? (
              <TouchableOpacity
                style={styles.upiPayActionBtn}
                onPress={() => setUpiModalVisible(true)}
              >
                <QrCode size={16} color="#020617" />
                <Text style={styles.upiPayActionBtnText}>Scan & Pay ₹{activeRide.fare} via UPI QR</Text>
              </TouchableOpacity>
            ) : activeRide.paymentMethod === 'WALLET' ? (
              <View style={styles.walletPaidPill}>
                <ShieldCheck size={14} color="#10b981" />
                <Text style={styles.walletPaidPillText}>
                  Paid via RideFlow Wallet (auto-deducted on completion)
                </Text>
              </View>
            ) : (
              <View style={styles.cashNoticePill}>
                <Text style={styles.cashNoticePillText}>💵 Pay ₹{activeRide.fare} Cash directly to driver</Text>
              </View>
            )}

            {/* Cancel Button */}
            <TouchableOpacity style={styles.cancelButton} onPress={handleCancelRide}>
              <Text style={styles.cancelButtonText}>Cancel Ride</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* TRIP HISTORY MODAL */}
      <Modal visible={showHistory} animationType="slide" transparent>
        <SafeAreaView style={styles.modalOverlay}>
          <View style={styles.historyContainer}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <FileText size={20} color="#10b981" />
                <Text style={styles.modalTitle}>Trip History</Text>
              </View>
              <TouchableOpacity onPress={() => setShowHistory(false)} style={styles.modalCloseBtn}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {isLoadingHistory ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color="#10b981" />
                <Text style={styles.loadingText}>Loading past rides...</Text>
              </View>
            ) : historyRides.length === 0 ? (
              <View style={styles.emptyBox}>
                <Clock size={40} color="#475569" />
                <Text style={styles.emptyTitle}>No Trips Yet</Text>
                <Text style={styles.emptySubtitle}>Your completed rides and receipts will appear here.</Text>
              </View>
            ) : (
              <ScrollView style={styles.historyList} showsVerticalScrollIndicator={false}>
                {historyRides.map((ride) => (
                  <View key={ride.id} style={styles.historyCard}>
                    <View style={styles.historyCardTop}>
                      <View style={styles.historyVehicleBadge}>
                        <Text style={styles.historyVehicleText}>{ride.vehicleType || ride.driver?.vehicleType || 'ECONOMY'}</Text>
                      </View>
                      <Text style={styles.historyFare}>₹{ride.actualFare || ride.estimatedFare || ride.fare || 0}</Text>
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
                        {navigationService.formatDateTime(ride.createdAt).full}
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

      {/* 5-STAR POST-TRIP DRIVER RATING & RECEIPT MODAL */}
      <Modal visible={showRatingModal} animationType="fade" transparent>
        <View style={styles.ratingOverlay}>
          <View style={styles.ratingCard}>
            <View style={styles.ratingHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <CheckCircle2 size={22} color="#10b981" />
                <Text style={styles.ratingTitle}>Trip Completed!</Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setShowRatingModal(false);
                  setCompletedRideDetails(null);
                  setActiveRide(null);
                  setDriverLocation(null);
                }}
              >
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {/* Trip Fare & Receipt Box */}
            <View style={styles.receiptBox}>
              <View style={styles.receiptTopRow}>
                <View>
                  <Text style={styles.receiptFareLabel}>TOTAL FARE</Text>
                  <Text style={styles.receiptFareValue}>
                    ₹{completedRideDetails?.actualFare || completedRideDetails?.estimatedFare || completedRideDetails?.fare || selectedFare}
                  </Text>
                </View>
                <View style={styles.receiptPaidBadge}>
                  <Text style={styles.receiptPaidBadgeText}>
                    PAID ({completedRideDetails?.paymentMethod || selectedPaymentMethod || 'CASH'})
                  </Text>
                </View>
              </View>

              <View style={styles.receiptDivider} />

              <View style={styles.receiptRouteRow}>
                <MapPin size={13} color="#10b981" />
                <Text style={styles.receiptRouteText} numberOfLines={1}>
                  {completedRideDetails?.pickupAddress || pickupAddress}
                </Text>
              </View>
              <View style={styles.receiptRouteRow}>
                <Navigation size={13} color="#f43f5e" />
                <Text style={styles.receiptRouteText} numberOfLines={1}>
                  {completedRideDetails?.dropoffAddress || dropoffAddress}
                </Text>
              </View>
            </View>

            <Text style={styles.ratingSubtitle}>
              How was your ride experience with {completedRideDetails?.driverName || 'your driver'}?
            </Text>

            {/* Clickable 5 Stars */}
            <View style={styles.starsRow}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity
                  key={star}
                  onPress={() => setSelectedRating(star)}
                  style={styles.starBtn}
                >
                  <Star
                    size={30}
                    color={star <= selectedRating ? '#fbbf24' : '#334155'}
                    fill={star <= selectedRating ? '#fbbf24' : 'transparent'}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.commentInput}
              placeholder="Leave a comment or compliment (optional)..."
              placeholderTextColor="#64748b"
              value={ratingComment}
              onChangeText={setRatingComment}
              multiline
              numberOfLines={3}
            />

            <TouchableOpacity
              style={styles.submitRatingBtn}
              onPress={handleSubmitRating}
              disabled={isSubmittingRating}
            >
              {isSubmittingRating ? (
                <ActivityIndicator color="#020617" />
              ) : (
                <Text style={styles.submitRatingBtnText}>Submit Rating & Done</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* 3. LIVE ADDRESS AUTOCOMPLETE SEARCH MODAL */}
      <AddressSearchModal
        visible={searchModalVisible}
        mode={searchMode}
        currentAddress={searchMode === 'PICKUP' ? pickupAddress : dropoffAddress}
        onClose={() => setSearchModalVisible(false)}
        onSelectLocation={handleSelectLocation}
      />

      {/* 4. DIGITAL WALLET & INSTANT TOPUP MODAL */}
      <WalletModal
        visible={walletModalVisible}
        onClose={() => {
          setWalletModalVisible(false);
          fetchWalletBalance();
        }}
        onBalanceUpdated={(newBal) => setWalletBalance(newBal)}
      />

      {/* 5. ADVANCE RIDE SCHEDULER MODAL */}
      <ScheduleRideModal
        visible={scheduleModalVisible}
        onClose={() => setScheduleModalVisible(false)}
        onConfirmSchedule={(isoTime) => {
          setScheduledTime(isoTime);
          setScheduleModalVisible(false);
        }}
      />

      {/* 6. UPCOMING SCHEDULED RIDES DRAWER */}
      <ScheduledRidesDrawer
        visible={scheduledDrawerVisible}
        onClose={() => setScheduledDrawerVisible(false)}
      />

      {/* 7. LIVE IN-RIDE CHAT MODAL */}
      {activeRide && (
        <InRideChatModal
          visible={chatModalVisible}
          onClose={() => setChatModalVisible(false)}
          rideId={activeRide.id}
          currentUserId={user?.id || 1}
          currentUserName={user?.name || 'Passenger'}
          currentUserRole="ROLE_RIDER"
          counterpartName={activeRide.driver?.user?.name || 'Driver'}
          vehicleModel={activeRide.driver?.vehicleModel || `${activeRide.vehicleType || 'RideFlow'} Car`}
          vehiclePlate={activeRide.driver?.vehiclePlate || 'KA-01-EQ-9872'}
        />
      )}

      {/* 8. INSTANT UPI QR PAYMENT MODAL */}
      {activeRide && (
        <UpiPaymentModal
          visible={upiModalVisible}
          onClose={() => setUpiModalVisible(false)}
          fareAmount={activeRide.fare}
          rideId={activeRide.id}
          onPaymentSuccess={() => {
            setUpiModalVisible(false);
          }}
        />
      )}

      {/* 9. EDIT PROFILE MODAL */}
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
  walletTopBtn: {
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
  walletTopBtnText: {
    color: '#34d399',
    fontSize: 12,
    fontWeight: '700',
  },
  scheduledPillRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0c4a6e',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#0284c7',
  },
  scheduledPillLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  scheduledPillText: {
    color: '#e0f2fe',
    fontSize: 12,
    fontWeight: '600',
  },
  removeScheduleBtn: {
    padding: 2,
  },
  scheduleActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#0f172a',
    paddingVertical: 8,
    borderRadius: 8,
    marginVertical: 8,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#38bdf8',
  },
  scheduleActionText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '600',
  },
  paymentSection: {
    marginVertical: 8,
  },
  paymentSectionTitle: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  paymentMethodRow: {
    flexDirection: 'row',
    gap: 8,
  },
  paymentMethodChip: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    backgroundColor: '#0f172a',
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  paymentMethodChipSelected: {
    borderColor: '#10b981',
    backgroundColor: '#064e3b33',
  },
  paymentMethodChipText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  paymentMethodChipTextSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  cashIconText: {
    fontSize: 12,
  },
  chatActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e293b',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 10,
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
  upiPayActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#38bdf8',
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  upiPayActionBtnText: {
    color: '#020617',
    fontSize: 13,
    fontWeight: '700',
  },
  walletPaidPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#064e3b33',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#059669',
  },
  walletPaidPillText: {
    color: '#34d399',
    fontSize: 11,
    fontWeight: '600',
  },
  cashNoticePill: {
    backgroundColor: '#1e293b',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cashNoticePillText: {
    color: '#94a3b8',
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
    zIndex: 10,
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
    backgroundColor: '#10b981',
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
    marginLeft: 'auto',
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
    borderColor: '#38bdf8',
  },
  switchButtonText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '600',
  },
  logoutButton: {
    padding: 6,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#0f172a',
  },
  map: {
    width: '100%',
    height: '100%',
  },
  recenterButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    zIndex: 10,
  },
  pickupPin: {
    width: 38,
    height: 38,
    backgroundColor: '#10b981',
    borderRadius: 19,
    borderWidth: 2,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
  dropoffPin: {
    width: 38,
    height: 38,
    backgroundColor: '#f43f5e',
    borderRadius: 19,
    borderWidth: 2,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
  driverPin: {
    width: 38,
    height: 38,
    backgroundColor: '#38bdf8',
    borderRadius: 19,
    borderWidth: 2,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
  bottomCard: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  cardHeader: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 14,
  },
  vehicleRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  vehicleOption: {
    flex: 1,
    backgroundColor: '#1e293b',
    padding: 12,
    borderRadius: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  vehicleOptionSelected: {
    borderColor: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  vehicleEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  vehicleTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  vehicleFare: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '800',
    marginTop: 2,
  },
  bookButton: {
    backgroundColor: '#10b981',
    borderRadius: 14,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  bookButtonText: {
    color: '#020617',
    fontSize: 15,
    fontWeight: '700',
  },
  rideStatusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10b981',
  },
  statusText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '700',
  },
  rideIdText: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  otpCard: {
    backgroundColor: '#020617',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 14,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  otpLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  otpLabel: {
    color: '#94a3b8',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  otpValue: {
    color: '#10b981',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 2,
  },
  otpHint: {
    color: '#64748b',
    fontSize: 11,
    maxWidth: 120,
    textAlign: 'right',
  },
  tripInfoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  infoLabel: {
    color: '#94a3b8',
    fontSize: 14,
  },
  fareAmount: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
  },
  cancelButton: {
    backgroundColor: 'rgba(244, 63, 94, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(244, 63, 94, 0.3)',
    borderRadius: 12,
    paddingVertical: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#fb7185',
    fontSize: 14,
    fontWeight: '600',
  },
  enRouteBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(56, 189, 248, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  enRouteLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  enRoutePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#38bdf8',
  },
  enRouteText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '600',
  },
  simulateApproachBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.35)',
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 14,
    marginBottom: 14,
  },
  simulateApproachBtnText: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '700',
  },
  historyButton: {
    padding: 6,
    marginRight: 4,
  },
  // Modal Overlays & Containers
  modalOverlay: {
    flex: 1,
    backgroundColor: '#020617',
  },
  historyContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: '#020617',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  modalTitle: {
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
  historyVehicleBadge: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  historyVehicleText: {
    color: '#38bdf8',
    fontSize: 11,
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
  // Rating Modal
  ratingOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  ratingCard: {
    width: '100%',
    backgroundColor: '#0f172a',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  ratingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  ratingTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
  },
  ratingSubtitle: {
    color: '#94a3b8',
    fontSize: 13,
    marginBottom: 16,
    textAlign: 'center',
  },
  receiptBox: {
    backgroundColor: '#020617',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  receiptTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  receiptFareLabel: {
    color: '#64748b',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  receiptFareValue: {
    color: '#10b981',
    fontSize: 22,
    fontWeight: '800',
  },
  receiptPaidBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
  },
  receiptPaidBadgeText: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: '800',
  },
  receiptDivider: {
    height: 1,
    backgroundColor: '#1e293b',
    marginVertical: 10,
  },
  receiptRouteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginVertical: 3,
  },
  receiptRouteText: {
    color: '#cbd5e1',
    fontSize: 12,
    flex: 1,
  },
  starsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    marginBottom: 20,
  },
  starBtn: {
    padding: 4,
  },
  commentInput: {
    backgroundColor: '#020617',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 12,
    color: '#ffffff',
    fontSize: 13,
    marginBottom: 18,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  submitRatingBtn: {
    backgroundColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 13,
    alignItems: 'center',
  },
  submitRatingBtnText: {
    color: '#020617',
    fontSize: 15,
    fontWeight: '700',
  },
  // Route Selector & ETA Badge Styles
  routeSelectorCard: {
    backgroundColor: '#0f172a',
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 12,
    zIndex: 20,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 10,
  },
  routeDotPickup: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10b981',
  },
  routeDotDropoff: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#f43f5e',
  },
  routeTextWrap: {
    flex: 1,
  },
  routeMiniLabel: {
    color: '#64748b',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  routeAddressMain: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  routeEditPill: {
    backgroundColor: '#1e293b',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  routeEditPillDropoff: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  routeEditPillText: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '600',
  },
  routeSeparator: {
    height: 1,
    backgroundColor: '#1e293b',
    marginVertical: 4,
    marginLeft: 18,
  },
  routeEtaBar: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  etaLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'center',
  },
  etaLoadingText: {
    color: '#94a3b8',
    fontSize: 11,
  },
  etaInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  etaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  etaBadgeText: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: '700',
  },
  etaBadgeTime: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  etaBadgeTimeText: {
    color: '#f59e0b',
    fontSize: 11,
    fontWeight: '700',
  },
});