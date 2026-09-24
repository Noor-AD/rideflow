// mobile/src/components/ScheduledRidesDrawer.tsx
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Calendar, Clock, MapPin, Trash2, RefreshCw } from 'lucide-react-native';
import { rideApi } from '../api/client';
import type { Ride } from '../types';

interface ScheduledRidesDrawerProps {
  visible: boolean;
  onClose: () => void;
  onRideCancelled?: () => void;
}

export const ScheduledRidesDrawer: React.FC<ScheduledRidesDrawerProps> = ({
  visible,
  onClose,
  onRideCancelled,
}) => {
  const [scheduledRides, setScheduledRides] = useState<Ride[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  const fetchScheduledRides = async () => {
    setIsLoading(true);
    try {
      const res = await rideApi.getScheduledRides();
      setScheduledRides(res);
    } catch (err) {
      console.warn('Failed to load scheduled rides:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      fetchScheduledRides();
    }
  }, [visible]);

  const handleCancel = (rideId: number) => {
    Alert.alert(
      'Cancel Scheduled Ride',
      'Are you sure you want to cancel this scheduled trip? There are no cancellation fees for advance trips.',
      [
        { text: 'Keep Ride', style: 'cancel' },
        {
          text: 'Cancel Ride',
          style: 'destructive',
          onPress: async () => {
            setCancellingId(rideId);
            try {
              await rideApi.cancelScheduledRide(rideId);
              Alert.alert('Trip Cancelled', 'Your scheduled booking has been cancelled.');
              fetchScheduledRides();
              if (onRideCancelled) onRideCancelled();
            } catch (err: any) {
              Alert.alert('Error', err.response?.data?.message || 'Could not cancel scheduled ride.');
            } finally {
              setCancellingId(null);
            }
          },
        },
      ]
    );
  };

  const formatScheduleTime = (timeStr?: string) => {
    if (!timeStr) return 'Pending time';
    try {
      const d = new Date(timeStr);
      return d.toLocaleDateString([], {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return timeStr;
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <SafeAreaView style={styles.backdrop}>
        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <Calendar size={20} color="#10b981" />
              <Text style={styles.headerTitle}>Upcoming Scheduled Trips</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={18} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          {isLoading && scheduledRides.length === 0 ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator color="#10b981" />
            </View>
          ) : (
            <FlatList
              data={scheduledRides}
              keyExtractor={(item) => item.id.toString()}
              contentContainerStyle={styles.listContainer}
              ListEmptyComponent={
                <View style={styles.emptyContainer}>
                  <Clock size={40} color="#334155" />
                  <Text style={styles.emptyTitle}>No Scheduled Rides</Text>
                  <Text style={styles.emptySubtitle}>
                    Tap "Schedule" when booking a ride to reserve a trip in advance.
                  </Text>
                </View>
              }
              renderItem={({ item }) => (
                <View style={styles.rideCard}>
                  {/* Time Badge */}
                  <View style={styles.timeBadgeRow}>
                    <View style={styles.timeBadge}>
                      <Clock size={12} color="#10b981" />
                      <Text style={styles.timeBadgeText}>
                        {formatScheduleTime(item.scheduledPickupTime)}
                      </Text>
                    </View>
                    <Text style={styles.fareText}>Est. ₹{item.fare || 0}</Text>
                  </View>

                  {/* Route */}
                  <View style={styles.routeSection}>
                    <View style={styles.pointRow}>
                      <View style={[styles.dot, { backgroundColor: '#10b981' }]} />
                      <Text style={styles.addressText} numberOfLines={1}>
                        {item.pickupAddress || 'Pickup Point'}
                      </Text>
                    </View>
                    <View style={styles.routeLine} />
                    <View style={styles.pointRow}>
                      <View style={[styles.dot, { backgroundColor: '#ef4444' }]} />
                      <Text style={styles.addressText} numberOfLines={1}>
                        {item.dropoffAddress || 'Dropoff Point'}
                      </Text>
                    </View>
                  </View>

                  {/* Footer Action */}
                  <View style={styles.cardFooter}>
                    <Text style={styles.statusNotice}>Auto-dispatches 15 mins prior</Text>
                    <TouchableOpacity
                      style={styles.cancelBtn}
                      onPress={() => handleCancel(item.id)}
                      disabled={cancellingId === item.id}
                    >
                      {cancellingId === item.id ? (
                        <ActivityIndicator size="small" color="#f43f5e" />
                      ) : (
                        <>
                          <Trash2 size={14} color="#f43f5e" />
                          <Text style={styles.cancelBtnText}>Cancel</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />
          )}
        </View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.8)',
    justifyContent: 'flex-end',
  },
  container: {
    height: '75%',
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: '#1e293b',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '700',
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContainer: {
    paddingBottom: 20,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 50,
  },
  emptyTitle: {
    color: '#94a3b8',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 12,
  },
  emptySubtitle: {
    color: '#475569',
    fontSize: 13,
    textAlign: 'center',
    maxWidth: 240,
    marginTop: 4,
  },
  rideCard: {
    backgroundColor: '#1e293b',
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  timeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  timeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  timeBadgeText: {
    color: '#10b981',
    fontSize: 12,
    fontWeight: '700',
  },
  fareText: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '800',
  },
  routeSection: {
    paddingLeft: 4,
    marginBottom: 12,
  },
  pointRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  routeLine: {
    width: 2,
    height: 12,
    backgroundColor: '#475569',
    marginLeft: 3,
    marginVertical: 2,
  },
  addressText: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '500',
    flex: 1,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#334155',
    paddingTop: 10,
  },
  statusNotice: {
    color: '#64748b',
    fontSize: 11,
  },
  cancelBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(244, 63, 94, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  cancelBtnText: {
    color: '#f43f5e',
    fontSize: 12,
    fontWeight: '700',
  },
});

