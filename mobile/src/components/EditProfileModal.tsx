// mobile/src/components/EditProfileModal.tsx
import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  X,
  User as UserIcon,
  Mail,
  Phone,
  Car,
  Lock,
  ShieldCheck,
  Check,
  Star,
  Award,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { userApi } from '../api/client';
import type { VehicleType } from '../types';

interface EditProfileModalProps {
  visible: boolean;
  onClose: () => void;
  onProfileUpdated?: (updatedName: string) => void;
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  visible,
  onClose,
  onProfileUpdated,
}) => {
  const { user, updateUser, activeRole } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>('PREMIUM');
  const [licenseNumber, setLicenseNumber] = useState('');
  const [driverRating, setDriverRating] = useState<number | null>(null);
  const [totalRides, setTotalRides] = useState<number | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isDriver = activeRole === 'ROLE_DRIVER' || (user?.roles && user.roles.includes('ROLE_DRIVER'));

  // Load latest profile from backend whenever opened
  useEffect(() => {
    if (!visible) return;

    setName(user?.name || '');
    setPhone(user?.phone || '');

    const fetchProfile = async () => {
      setIsLoading(true);
      try {
        const profile = await userApi.getProfile();
        setName(profile.name || user?.name || '');
        setPhone(profile.phone || user?.phone || '');

        if (profile.driver) {
          setVehicleModel(profile.driver.vehicleModel || '');
          setVehiclePlate(profile.driver.vehiclePlate || '');
          setVehicleType(profile.driver.vehicleType || 'PREMIUM');
          setLicenseNumber(profile.driver.licenseNumber || '');
          setDriverRating(profile.driver.rating ?? 5.0);
          setTotalRides(profile.driver.totalRides ?? 0);
        }
      } catch (err) {
        console.log('Profile fetch using cached state');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProfile();
  }, [visible, user]);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Full Name cannot be empty.');
      return;
    }

    setIsSaving(true);
    try {
      const payload: {
        name: string;
        phone?: string;
        vehicleModel?: string;
        vehiclePlate?: string;
        vehicleType?: string;
      } = {
        name: name.trim(),
        phone: phone.trim() || undefined,
      };

      if (isDriver) {
        if (vehicleModel.trim()) payload.vehicleModel = vehicleModel.trim();
        if (vehiclePlate.trim()) payload.vehiclePlate = vehiclePlate.trim().toUpperCase();
        payload.vehicleType = vehicleType;
      }

      const updated = await userApi.updateProfile(payload);

      // Update local React Context & AsyncStorage
      await updateUser({
        name: updated.name,
        phone: updated.phone,
      });

      if (onProfileUpdated) {
        onProfileUpdated(updated.name);
      }

      Alert.alert('Profile Updated! 🎉', 'Your profile details have been successfully saved.', [
        {
          text: 'Done',
          onPress: onClose,
        },
      ]);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Could not update profile';
      Alert.alert('Update Failed', msg);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <SafeAreaView style={styles.backdrop}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.keyboardContainer}
        >
          <View style={styles.card}>
            {/* Header */}
            <View style={styles.header}>
              <View>
                <Text style={styles.headerTitle}>Edit Profile</Text>
                <Text style={styles.headerSubtitle}>Manage your personal information</Text>
              </View>
              <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
                <X size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>

            {isLoading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color="#38bdf8" />
                <Text style={styles.loadingText}>Loading profile details...</Text>
              </View>
            ) : (
              <ScrollView
                style={styles.scrollArea}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                {/* Avatar Badge & Role */}
                <View style={styles.avatarSection}>
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarText}>{name ? name.charAt(0).toUpperCase() : 'U'}</Text>
                  </View>
                  <Text style={styles.avatarName}>{name || 'RideFlow User'}</Text>
                  <View style={styles.rolePill}>
                    <ShieldCheck size={12} color="#38bdf8" />
                    <Text style={styles.rolePillText}>
                      {isDriver ? 'VERIFIED DRIVER PARTNER' : 'VERIFIED PASSENGER'}
                    </Text>
                  </View>

                  {/* Driver Quick Stats */}
                  {isDriver && driverRating !== null && (
                    <View style={styles.driverStatsRow}>
                      <View style={styles.driverStatItem}>
                        <Star size={13} color="#f59e0b" fill="#f59e0b" />
                        <Text style={styles.driverStatText}>{driverRating.toFixed(1)} Rating</Text>
                      </View>
                      <View style={styles.driverStatDivider} />
                      <View style={styles.driverStatItem}>
                        <Award size={13} color="#10b981" />
                        <Text style={styles.driverStatText}>{totalRides ?? 0} Trips Completed</Text>
                      </View>
                    </View>
                  )}
                </View>

                {/* Form Fields */}
                <View style={styles.section}>
                  <Text style={styles.sectionLabel}>ACCOUNT DETAILS</Text>

                  {/* Full Name */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.fieldTitle}>Full Name</Text>
                    <View style={styles.inputWrap}>
                      <UserIcon size={16} color="#94a3b8" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        value={name}
                        onChangeText={setName}
                        placeholder="Enter full name"
                        placeholderTextColor="#64748b"
                        autoCapitalize="words"
                      />
                    </View>
                  </View>

                  {/* Email (Read-Only) */}
                  <View style={styles.inputGroup}>
                    <View style={styles.fieldTitleRow}>
                      <Text style={styles.fieldTitle}>Email Address</Text>
                      <View style={styles.lockBadge}>
                        <Lock size={10} color="#94a3b8" />
                        <Text style={styles.lockBadgeText}>Verified</Text>
                      </View>
                    </View>
                    <View style={[styles.inputWrap, styles.inputDisabled]}>
                      <Mail size={16} color="#64748b" style={styles.inputIcon} />
                      <TextInput
                        style={[styles.input, styles.inputTextDisabled]}
                        value={user?.email || ''}
                        editable={false}
                      />
                    </View>
                  </View>

                  {/* Phone Number */}
                  <View style={styles.inputGroup}>
                    <Text style={styles.fieldTitle}>Phone Number</Text>
                    <View style={styles.inputWrap}>
                      <Phone size={16} color="#94a3b8" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        value={phone}
                        onChangeText={setPhone}
                        placeholder="+91 9876543210"
                        placeholderTextColor="#64748b"
                        keyboardType="phone-pad"
                      />
                    </View>
                  </View>
                </View>

                {/* Driver Vehicle Details (If Driver) */}
                {isDriver && (
                  <View style={styles.section}>
                    <Text style={styles.sectionLabel}>VEHICLE SPECIFICATIONS</Text>

                    {/* Vehicle Model */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.fieldTitle}>Vehicle Model</Text>
                      <View style={styles.inputWrap}>
                        <Car size={16} color="#94a3b8" style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          value={vehicleModel}
                          onChangeText={setVehicleModel}
                          placeholder="e.g. Maruti Suzuki Dzire"
                          placeholderTextColor="#64748b"
                        />
                      </View>
                    </View>

                    {/* License Plate Number */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.fieldTitle}>Vehicle Registration Plate</Text>
                      <View style={styles.inputWrap}>
                        <TextInput
                          style={styles.input}
                          value={vehiclePlate}
                          onChangeText={setVehiclePlate}
                          placeholder="KA-01-AB-1234"
                          placeholderTextColor="#64748b"
                          autoCapitalize="characters"
                        />
                      </View>
                    </View>

                    {/* Vehicle Type Selector */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.fieldTitle}>Vehicle Category</Text>
                      <View style={styles.typeSelector}>
                        {(['ECONOMY', 'PREMIUM', 'SUV'] as VehicleType[]).map((type) => (
                          <TouchableOpacity
                            key={type}
                            style={[
                              styles.typeBtn,
                              vehicleType === type && styles.typeBtnActive,
                            ]}
                            onPress={() => setVehicleType(type)}
                          >
                            <Text
                              style={[
                                styles.typeBtnText,
                                vehicleType === type && styles.typeBtnTextActive,
                              ]}
                            >
                              {type}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    {/* License Number (Read-only for safety) */}
                    {licenseNumber ? (
                      <View style={styles.inputGroup}>
                        <View style={styles.fieldTitleRow}>
                          <Text style={styles.fieldTitle}>Driving License</Text>
                          <View style={styles.lockBadge}>
                            <Lock size={10} color="#94a3b8" />
                            <Text style={styles.lockBadgeText}>RTO Registered</Text>
                          </View>
                        </View>
                        <View style={[styles.inputWrap, styles.inputDisabled]}>
                          <TextInput
                            style={[styles.input, styles.inputTextDisabled]}
                            value={licenseNumber}
                            editable={false}
                          />
                        </View>
                      </View>
                    ) : null}
                  </View>
                )}
              </ScrollView>
            )}

            {/* Bottom Actions */}
            <View style={styles.footer}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={isSaving}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
                onPress={handleSave}
                disabled={isSaving || isLoading}
              >
                {isSaving ? (
                  <ActivityIndicator size="small" color="#020617" />
                ) : (
                  <>
                    <Check size={18} color="#020617" />
                    <Text style={styles.saveBtnText}>Save Changes</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(2, 6, 23, 0.82)',
    justifyContent: 'flex-end',
  },
  keyboardContainer: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  card: {
    backgroundColor: '#0f172a',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: '#1e293b',
    maxHeight: '90%',
    paddingBottom: Platform.OS === 'ios' ? 20 : 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#f8fafc',
    letterSpacing: -0.4,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingBox: {
    padding: 60,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 12,
  },
  scrollArea: {
    maxHeight: 520,
  },
  scrollContent: {
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 24,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#0284c7',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#38bdf8',
    shadowColor: '#38bdf8',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
  },
  avatarText: {
    fontSize: 30,
    fontWeight: '900',
    color: '#ffffff',
  },
  avatarName: {
    fontSize: 17,
    fontWeight: '800',
    color: '#f8fafc',
    marginTop: 10,
  },
  rolePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 6,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
  },
  rolePillText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#38bdf8',
    letterSpacing: 0.5,
  },
  driverStatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 14,
    marginTop: 10,
    gap: 12,
  },
  driverStatItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  driverStatText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#e2e8f0',
  },
  driverStatDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#334155',
  },
  section: {
    marginBottom: 20,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#64748b',
    letterSpacing: 0.8,
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 14,
  },
  fieldTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  fieldTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#cbd5e1',
    marginBottom: 6,
  },
  lockBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1e293b',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  lockBadgeText: {
    fontSize: 10,
    color: '#94a3b8',
    fontWeight: '600',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e293b',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 14,
  },
  inputDisabled: {
    backgroundColor: '#090d16',
    borderColor: '#1e293b',
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    height: 48,
    fontSize: 14,
    color: '#f8fafc',
    fontWeight: '500',
  },
  inputTextDisabled: {
    color: '#64748b',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  typeBtn: {
    flex: 1,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    alignItems: 'center',
    justifyContent: 'center',
  },
  typeBtnActive: {
    backgroundColor: '#38bdf8',
    borderColor: '#38bdf8',
  },
  typeBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#94a3b8',
  },
  typeBtnTextActive: {
    color: '#020617',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 22,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#1e293b',
  },
  cancelBtn: {
    flex: 1,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#cbd5e1',
  },
  saveBtn: {
    flex: 2,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#38bdf8',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#38bdf8',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  saveBtnDisabled: {
    opacity: 0.6,
  },
  saveBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#020617',
  },
});

