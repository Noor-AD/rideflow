// mobile/src/components/ScheduleRideModal.tsx
import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { X, Calendar, Clock, CheckCircle2, Sparkles } from 'lucide-react-native';

interface ScheduleRideModalProps {
  visible: boolean;
  onClose: () => void;
  onConfirmSchedule: (scheduledTimeIso: string) => void;
}

export const ScheduleRideModal: React.FC<ScheduleRideModalProps> = ({
  visible,
  onClose,
  onConfirmSchedule,
}) => {
  // Preset scheduling options
  const now = new Date();

  const getFutureDate = (hoursAhead: number, setSpecificHour?: number) => {
    const d = new Date(now.getTime() + hoursAhead * 60 * 60 * 1000);
    if (setSpecificHour !== undefined) {
      d.setHours(setSpecificHour, 0, 0, 0);
    }
    return d;
  };

  const tomorrow8AM = new Date(now);
  tomorrow8AM.setDate(tomorrow8AM.getDate() + 1);
  tomorrow8AM.setHours(8, 0, 0, 0);

  const tomorrow6PM = new Date(now);
  tomorrow6PM.setDate(tomorrow6PM.getDate() + 1);
  tomorrow6PM.setHours(18, 0, 0, 0);

  const presets = [
    {
      label: 'In 1 Hour',
      subtitle: `${getFutureDate(1).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} today`,
      date: getFutureDate(1),
    },
    {
      label: 'In 3 Hours',
      subtitle: `${getFutureDate(3).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} today`,
      date: getFutureDate(3),
    },
    {
      label: 'Tomorrow Morning',
      subtitle: '8:00 AM (Airport / Work)',
      date: tomorrow8AM,
    },
    {
      label: 'Tomorrow Evening',
      subtitle: '6:00 PM (Return Trip)',
      date: tomorrow6PM,
    },
  ];

  const [selectedIndex, setSelectedIndex] = useState<number>(0);

  const handleConfirm = () => {
    const selectedDate = presets[selectedIndex].date;
    // Format as ISO string without milliseconds/timezone issues: YYYY-MM-DDTHH:mm:ss
    const pad = (n: number) => n.toString().padStart(2, '0');
    const isoString = `${selectedDate.getFullYear()}-${pad(selectedDate.getMonth() + 1)}-${pad(selectedDate.getDate())}T${pad(selectedDate.getHours())}:${pad(selectedDate.getMinutes())}:00`;
    onConfirmSchedule(isoString);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <SafeAreaView style={styles.backdrop}>
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Calendar size={20} color="#10b981" />
              <Text style={styles.headerTitle}>Schedule for Later</Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={18} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <Text style={styles.infoText}>
            Choose when you'd like your driver to arrive. We will automatically assign and dispatch the nearest driver 15 minutes before your pickup.
          </Text>

          {/* Quick Presets */}
          <View style={styles.presetSection}>
            <View style={styles.presetLabelRow}>
              <Sparkles size={12} color="#10b981" />
              <Text style={styles.presetLabel}>CHOOSE PICKUP TIME</Text>
            </View>

            {presets.map((preset, index) => {
              const isSelected = selectedIndex === index;
              return (
                <TouchableOpacity
                  key={index}
                  style={[styles.presetRow, isSelected && styles.presetRowSelected]}
                  onPress={() => setSelectedIndex(index)}
                  activeOpacity={0.7}
                >
                  <View style={styles.rowLeft}>
                    <View
                      style={[
                        styles.iconCircle,
                        isSelected ? styles.iconCircleSelected : styles.iconCircleDefault,
                      ]}
                    >
                      <Clock size={16} color={isSelected ? '#10b981' : '#64748b'} />
                    </View>
                    <View>
                      <Text style={[styles.rowLabel, isSelected && styles.rowLabelSelected]}>
                        {preset.label}
                      </Text>
                      <Text style={styles.rowSubtitle}>{preset.subtitle}</Text>
                    </View>
                  </View>

                  <View style={[styles.radioCircle, isSelected && styles.radioCircleSelected]}>
                    {isSelected && <View style={styles.radioInner} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Confirm Button */}
          <TouchableOpacity style={styles.confirmBtn} onPress={handleConfirm}>
            <CheckCircle2 size={18} color="#020617" strokeWidth={2.5} />
            <Text style={styles.confirmBtnText}>
              Set Pickup for {presets[selectedIndex].label}
            </Text>
          </TouchableOpacity>
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
  card: {
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
    marginBottom: 10,
  },
  headerLeft: {
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
  infoText: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  presetSection: {
    marginBottom: 20,
  },
  presetLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  presetLabel: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.8,
  },
  presetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#334155',
  },
  presetRowSelected: {
    backgroundColor: '#064e3b',
    borderColor: '#10b981',
  },
  rowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconCircleDefault: {
    backgroundColor: '#0f172a',
  },
  iconCircleSelected: {
    backgroundColor: 'rgba(16, 185, 129, 0.2)',
  },
  rowLabel: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '600',
  },
  rowLabelSelected: {
    color: '#ffffff',
    fontWeight: '700',
  },
  rowSubtitle: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  radioCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#64748b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioCircleSelected: {
    borderColor: '#10b981',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#10b981',
  },
  confirmBtn: {
    backgroundColor: '#10b981',
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  confirmBtnText: {
    color: '#020617',
    fontSize: 15,
    fontWeight: '700',
  },
});

