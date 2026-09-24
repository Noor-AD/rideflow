// mobile/src/screens/AuthScreen.tsx
import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../context/AuthContext';
import { authApi, driverApi } from '../api/client';
import {
  Car,
  Shield,
  Mail,
  Lock,
  ArrowRight,
  User,
  Smartphone,
  CheckCircle2,
  FileText,
  KeyRound,
  Sparkles,
  Eye,
  EyeOff,
} from 'lucide-react-native';
import type { VehicleType } from '../types';

export const AuthScreen: React.FC = () => {
  const { login } = useAuth();

  // Auth Mode: 'LOGIN' vs 'REGISTER'
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Registration Role: Rider vs Driver Partner
  const [registerRole, setRegisterRole] = useState<'ROLE_RIDER' | 'ROLE_DRIVER'>('ROLE_RIDER');

  // Login Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegisterPassword, setShowRegisterPassword] = useState(false);

  // Signup Common Form States
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('+91');
  const [otp, setOtp] = useState('');
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isPhoneVerified, setIsPhoneVerified] = useState(false);
  const [sentOtpHint, setSentOtpHint] = useState<string | null>(null);

  // Driver Vehicle Specific States
  const [vehicleType, setVehicleType] = useState<VehicleType>('PREMIUM');
  const [vehicleModel, setVehicleModel] = useState('');
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [licenseNumber, setLicenseNumber] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // 1. Handle Login
  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const authData = await authApi.login(email.trim(), password);
      await login(authData);
    } catch (err: any) {
      console.error('Mobile login failed:', err);
      const serverMsg = err.response?.data?.message || err.response?.data?.error;
      setErrorMessage(serverMsg || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Handle Send OTP
  const handleSendOtp = async () => {
    if (!phone || phone.trim().length < 10) {
      setErrorMessage('Please enter a valid 10-digit phone number with country code (e.g. +919876543210).');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await authApi.sendOtp(phone.trim());
      setIsOtpSent(true);
      if (res.otp) {
        setSentOtpHint(res.otp);
        setOtp(res.otp); // Auto-fill for convenience during testing
      } else {
        setSentOtpHint('123456');
      }
      Alert.alert('Verification Code Sent', `A 6-digit OTP has been generated for ${phone.trim()}.`);
    } catch (err: any) {
      const serverMsg = err.response?.data?.message || err.response?.data?.error;
      setErrorMessage(serverMsg || 'Failed to send verification OTP.');
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Handle Verify OTP
  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      setErrorMessage('Please enter the 6-digit OTP code.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      await authApi.verifyOtp(phone.trim(), otp.trim());
      setIsPhoneVerified(true);
      Alert.alert('Verified!', 'Your phone number has been verified successfully.');
    } catch (err: any) {
      const serverMsg = err.response?.data?.message || err.response?.data?.error;
      setErrorMessage(serverMsg || 'Invalid OTP code. You can use 123456 for testing.');
    } finally {
      setIsLoading(false);
    }
  };

  // 4. Handle Registration
  const handleRegister = async () => {
    if (!name.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!email.trim()) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }
    if (!password || password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }
    if (!isPhoneVerified) {
      setErrorMessage('Please verify your phone number via OTP first.');
      return;
    }

    // Driver specific validations
    if (registerRole === 'ROLE_DRIVER') {
      if (!vehicleModel.trim()) {
        setErrorMessage('Please enter your vehicle model (e.g. Maruti Suzuki Dzire).');
        return;
      }
      if (!vehiclePlate.trim()) {
        setErrorMessage('Please enter your vehicle number plate (e.g. KA-01-AB-1234).');
        return;
      }
      if (!licenseNumber.trim()) {
        setErrorMessage('Please enter your driving license number.');
        return;
      }
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Step A: Register the user in Spring Boot
      const authData = await authApi.signup({
        name: name.trim(),
        email: email.trim(),
        password,
        phone: phone.trim(),
        role: registerRole,
      });

      // Step B: If Driver, complete vehicle onboarding
      if (registerRole === 'ROLE_DRIVER') {
        try {
          await driverApi.onboard(
            {
              licenseNumber: licenseNumber.trim(),
              vehiclePlate: vehiclePlate.trim().toUpperCase(),
              vehicleModel: vehicleModel.trim(),
              vehicleType,
            },
            authData.token
          );
        } catch (onboardErr) {
          console.warn('Driver vehicle onboarding notice:', onboardErr);
        }

        Alert.alert(
          'Driver Partner Registered!',
          'Your account and vehicle details were submitted. Once verified by Admin, you can accept passenger trips.',
          [{ text: 'Continue', onPress: () => login(authData) }]
        );
        await login(authData);
      } else {
        // Rider registration complete
        Alert.alert('Welcome to RideFlow!', 'Your rider account is ready to book trips.', [
          { text: 'Start Riding', onPress: () => login(authData) },
        ]);
        await login(authData);
      }
    } catch (err: any) {
      console.error('Registration failed:', err);
      const serverMsg = err.response?.data?.message || err.response?.data?.error;
      setErrorMessage(serverMsg || 'Registration failed. Email or phone may already exist.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Brand */}
          <View style={styles.header}>
            <View style={styles.iconCircle}>
              <Car size={36} color="#020617" strokeWidth={2.5} />
            </View>
            <Text style={styles.brandTitle}>RideFlow</Text>
            <Text style={styles.brandSubtitle}>Real-Time Taxi Booking & Fleet Mobility</Text>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            {/* Top Switcher: Sign In vs Create Account */}
            <View style={styles.modeSwitcher}>
              <TouchableOpacity
                style={[styles.modeTab, authMode === 'LOGIN' && styles.modeTabActive]}
                onPress={() => {
                  setAuthMode('LOGIN');
                  setErrorMessage(null);
                }}
              >
                <Text style={[styles.modeTabText, authMode === 'LOGIN' && styles.modeTabTextActive]}>
                  Sign In
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modeTab, authMode === 'REGISTER' && styles.modeTabActive]}
                onPress={() => {
                  setAuthMode('REGISTER');
                  setErrorMessage(null);
                }}
              >
                <Text style={[styles.modeTabText, authMode === 'REGISTER' && styles.modeTabTextActive]}>
                  Create Account
                </Text>
              </TouchableOpacity>
            </View>

            {/* Error Banner */}
            {errorMessage ? (
              <View style={styles.errorBox}>
                <Text style={styles.errorText}>{errorMessage}</Text>
              </View>
            ) : null}

            {authMode === 'LOGIN' ? (
              /* ================= LOGIN FORM ================= */
              <View>
                {/* Email Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>EMAIL ADDRESS</Text>
                  <View style={styles.inputWrapper}>
                    <Mail size={18} color="#64748b" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="rider@rideflow.test"
                      placeholderTextColor="#475569"
                      autoCapitalize="none"
                      keyboardType="email-address"
                      value={email}
                      onChangeText={setEmail}
                      editable={!isLoading}
                    />
                  </View>
                </View>

                {/* Password Input */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>PASSWORD</Text>
                  <View style={styles.inputWrapper}>
                    <Lock size={18} color="#64748b" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="••••••••••••"
                      placeholderTextColor="#475569"
                      secureTextEntry={!showLoginPassword}
                      value={password}
                      onChangeText={setPassword}
                      editable={!isLoading}
                    />
                    <TouchableOpacity
                      onPress={() => setShowLoginPassword((prev) => !prev)}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      style={styles.eyeIconBtn}
                    >
                      {showLoginPassword ? (
                        <EyeOff size={18} color="#94a3b8" />
                      ) : (
                        <Eye size={18} color="#94a3b8" />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                  style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
                  onPress={handleLogin}
                  disabled={isLoading}
                  activeOpacity={0.8}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#020617" />
                  ) : (
                    <>
                      <Text style={styles.submitButtonText}>Sign In</Text>
                      <ArrowRight size={18} color="#020617" strokeWidth={2.5} />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              /* ================= REGISTRATION FORM ================= */
              <View>
                {/* Role Selector: Rider vs Driver */}
                <Text style={styles.label}>SELECT ACCOUNT TYPE</Text>
                <View style={styles.roleSelectorRow}>
                  <TouchableOpacity
                    style={[
                      styles.roleOption,
                      registerRole === 'ROLE_RIDER' && styles.roleOptionSelected,
                    ]}
                    onPress={() => setRegisterRole('ROLE_RIDER')}
                  >
                    <Text style={styles.roleEmoji}>🙋‍♂️</Text>
                    <Text style={styles.roleTitle}>Passenger</Text>
                    <Text style={styles.roleSubtitle}>Book rides anytime</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.roleOption,
                      registerRole === 'ROLE_DRIVER' && styles.roleOptionSelected,
                    ]}
                    onPress={() => setRegisterRole('ROLE_DRIVER')}
                  >
                    <Text style={styles.roleEmoji}>🚗</Text>
                    <Text style={styles.roleTitle}>Driver Partner</Text>
                    <Text style={styles.roleSubtitle}>Earn driving rides</Text>
                  </TouchableOpacity>
                </View>

                {/* Full Name */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>FULL NAME</Text>
                  <View style={styles.inputWrapper}>
                    <User size={18} color="#64748b" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. Ramesh Kumar"
                      placeholderTextColor="#475569"
                      value={name}
                      onChangeText={setName}
                      editable={!isLoading}
                    />
                  </View>
                </View>

                {/* Email Address */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>EMAIL ADDRESS</Text>
                  <View style={styles.inputWrapper}>
                    <Mail size={18} color="#64748b" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="e.g. ramesh@example.com"
                      placeholderTextColor="#475569"
                      autoCapitalize="none"
                      keyboardType="email-address"
                      value={email}
                      onChangeText={setEmail}
                      editable={!isLoading}
                    />
                  </View>
                </View>

                {/* Password */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>CREATE PASSWORD</Text>
                  <View style={styles.inputWrapper}>
                    <Lock size={18} color="#64748b" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Min. 6 characters"
                      placeholderTextColor="#475569"
                      secureTextEntry={!showRegisterPassword}
                      value={password}
                      onChangeText={setPassword}
                      editable={!isLoading}
                    />
                    <TouchableOpacity
                      onPress={() => setShowRegisterPassword((prev) => !prev)}
                      hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
                      style={styles.eyeIconBtn}
                    >
                      {showRegisterPassword ? (
                        <EyeOff size={18} color="#94a3b8" />
                      ) : (
                        <Eye size={18} color="#94a3b8" />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Phone Number & OTP Verification Section */}
                <View style={styles.inputGroup}>
                  <View style={styles.phoneLabelRow}>
                    <Text style={styles.label}>MOBILE PHONE NUMBER</Text>
                    {isPhoneVerified && (
                      <View style={styles.verifiedBadge}>
                        <CheckCircle2 size={12} color="#10b981" />
                        <Text style={styles.verifiedBadgeText}>Verified</Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.phoneInputRow}>
                    <View style={[styles.inputWrapper, { flex: 1 }]}>
                      <Smartphone size={18} color="#64748b" style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        placeholder="+919876543210"
                        placeholderTextColor="#475569"
                        keyboardType="phone-pad"
                        value={phone}
                        onChangeText={(t) => {
                          setPhone(t);
                          setIsPhoneVerified(false);
                          setIsOtpSent(false);
                        }}
                        editable={!isPhoneVerified && !isLoading}
                      />
                    </View>

                    {!isPhoneVerified && (
                      <TouchableOpacity
                        style={styles.otpActionBtn}
                        onPress={handleSendOtp}
                        disabled={isLoading}
                      >
                        <Text style={styles.otpActionBtnText}>
                          {isOtpSent ? 'Resend' : 'Send OTP'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>

                {/* 6-Digit OTP Input (Shown once OTP is requested) */}
                {isOtpSent && !isPhoneVerified && (
                  <View style={styles.otpCard}>
                    <View style={styles.otpCardHeader}>
                      <KeyRound size={16} color="#38bdf8" />
                      <Text style={styles.otpCardTitle}>Enter 6-Digit Verification Code</Text>
                    </View>

                    <View style={styles.otpInputRow}>
                      <TextInput
                        style={styles.otpInput}
                        placeholder="123456"
                        placeholderTextColor="#475569"
                        keyboardType="number-pad"
                        maxLength={6}
                        value={otp}
                        onChangeText={setOtp}
                      />
                      <TouchableOpacity
                        style={styles.verifyOtpBtn}
                        onPress={handleVerifyOtp}
                        disabled={isLoading}
                      >
                        <Text style={styles.verifyOtpBtnText}>Verify</Text>
                      </TouchableOpacity>
                    </View>

                    {sentOtpHint ? (
                      <Text style={styles.otpDevHint}>
                        💡 Testing Code: <Text style={{ color: '#38bdf8', fontWeight: '800' }}>{sentOtpHint}</Text> (or master: 123456)
                      </Text>
                    ) : null}
                  </View>
                )}

                {/* Driver Partner Specific Vehicle Fields */}
                {registerRole === 'ROLE_DRIVER' && (
                  <View style={styles.driverSection}>
                    <View style={styles.driverSectionHeader}>
                      <FileText size={16} color="#38bdf8" />
                      <Text style={styles.driverSectionTitle}>VEHICLE & PERMIT DETAILS</Text>
                    </View>

                    {/* Vehicle Tier Selection */}
                    <Text style={[styles.label, { marginTop: 10 }]}>VEHICLE CLASS</Text>
                    <View style={styles.vehicleClassRow}>
                      <TouchableOpacity
                        style={[
                          styles.vehicleClassBtn,
                          vehicleType === 'ECONOMY' && styles.vehicleClassBtnSelected,
                        ]}
                        onPress={() => setVehicleType('ECONOMY')}
                      >
                        <Text style={styles.vehicleClassText}>🛺 Economy / Auto</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.vehicleClassBtn,
                          vehicleType === 'PREMIUM' && styles.vehicleClassBtnSelected,
                        ]}
                        onPress={() => setVehicleType('PREMIUM')}
                      >
                        <Text style={styles.vehicleClassText}>🚗 Sedan</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[
                          styles.vehicleClassBtn,
                          vehicleType === 'SUV' && styles.vehicleClassBtnSelected,
                        ]}
                        onPress={() => setVehicleType('SUV')}
                      >
                        <Text style={styles.vehicleClassText}>🚙 SUV</Text>
                      </TouchableOpacity>
                    </View>

                    {/* Vehicle Model */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>VEHICLE MAKE & MODEL</Text>
                      <TextInput
                        style={styles.driverInput}
                        placeholder="e.g. Maruti Suzuki Dzire"
                        placeholderTextColor="#475569"
                        value={vehicleModel}
                        onChangeText={setVehicleModel}
                      />
                    </View>

                    {/* Vehicle Plate */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>LICENSE NUMBER PLATE</Text>
                      <TextInput
                        style={styles.driverInput}
                        placeholder="e.g. KA-05-MN-5678"
                        placeholderTextColor="#475569"
                        autoCapitalize="characters"
                        value={vehiclePlate}
                        onChangeText={setVehiclePlate}
                      />
                    </View>

                    {/* Driving License */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>DRIVING LICENSE NUMBER</Text>
                      <TextInput
                        style={styles.driverInput}
                        placeholder="e.g. DL-0420220012345"
                        placeholderTextColor="#475569"
                        autoCapitalize="characters"
                        value={licenseNumber}
                        onChangeText={setLicenseNumber}
                      />
                    </View>
                  </View>
                )}

                {/* Final Register Submit Button */}
                <TouchableOpacity
                  style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
                  onPress={handleRegister}
                  disabled={isLoading}
                  activeOpacity={0.8}
                >
                  {isLoading ? (
                    <ActivityIndicator color="#020617" />
                  ) : (
                    <>
                      <Text style={styles.submitButtonText}>
                        {registerRole === 'ROLE_DRIVER'
                          ? 'Register as Driver Partner'
                          : 'Complete Rider Registration'}
                      </Text>
                      <ArrowRight size={18} color="#020617" strokeWidth={2.5} />
                    </>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#020617', // slate-950
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: 20,
    paddingBottom: 40,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: '#10b981', // emerald-500
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  brandSubtitle: {
    fontSize: 13,
    color: '#94a3b8',
    marginTop: 2,
  },
  card: {
    backgroundColor: '#0f172a',
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
    elevation: 10,
  },
  modeSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#020617',
    borderRadius: 14,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#1e293b',
  },
  modeTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 10,
  },
  modeTabActive: {
    backgroundColor: '#1e293b',
  },
  modeTabText: {
    color: '#64748b',
    fontSize: 13,
    fontWeight: '700',
  },
  modeTabTextActive: {
    color: '#ffffff',
  },
  roleSelectorRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  roleOption: {
    flex: 1,
    backgroundColor: '#020617',
    borderWidth: 1.5,
    borderColor: '#1e293b',
    borderRadius: 14,
    padding: 12,
    alignItems: 'center',
  },
  roleOptionSelected: {
    borderColor: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
  },
  roleEmoji: {
    fontSize: 22,
    marginBottom: 4,
  },
  roleTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  roleSubtitle: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 2,
  },
  errorBox: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    borderWidth: 1,
    borderColor: '#ef4444',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#f87171',
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 14,
  },
  label: {
    color: '#94a3b8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#020617',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    paddingVertical: 12,
  },
  phoneLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  verifiedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 10,
  },
  verifiedBadgeText: {
    color: '#10b981',
    fontSize: 11,
    fontWeight: '700',
  },
  phoneInputRow: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
  },
  otpActionBtn: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#38bdf8',
    paddingHorizontal: 14,
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpActionBtnText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700',
  },
  otpCard: {
    backgroundColor: '#020617',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.3)',
    marginBottom: 16,
  },
  otpCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  otpCardTitle: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '700',
  },
  otpInputRow: {
    flexDirection: 'row',
    gap: 10,
  },
  otpInput: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: 4,
    height: 44,
  },
  verifyOtpBtn: {
    backgroundColor: '#10b981',
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    height: 44,
  },
  verifyOtpBtnText: {
    color: '#020617',
    fontSize: 13,
    fontWeight: '700',
  },
  otpDevHint: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 8,
    textAlign: 'center',
  },
  driverSection: {
    backgroundColor: '#020617',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#1e293b',
    marginBottom: 16,
  },
  driverSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#1e293b',
  },
  driverSectionTitle: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  vehicleClassRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  vehicleClassBtn: {
    flex: 1,
    backgroundColor: '#0f172a',
    borderWidth: 1,
    borderColor: '#334155',
    paddingVertical: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  vehicleClassBtnSelected: {
    borderColor: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
  },
  vehicleClassText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
  },
  driverInput: {
    backgroundColor: '#0f172a',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#334155',
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#ffffff',
    fontSize: 13,
  },
  submitButton: {
    backgroundColor: '#10b981',
    height: 50,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 10,
    shadowColor: '#10b981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#020617',
    fontSize: 15,
    fontWeight: '700',
  },
  eyeIconBtn: {
    padding: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
