// mobile/src/api/client.ts
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  User,
  AuthResponse,
  Ride,
  DriverProfile,
  ChatMessage,
  Wallet,
  WalletTransaction,
  DriverEarningsSummary,
  UserProfileResponse,
} from '../types';

export const getBaseUrl = (): string => {
  return 'https://rideflow-production-06dc.up.railway.app/api';
};

export const apiClient = axios.create({
  baseURL: getBaseUrl(),
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 2. Request Interceptor: Retrieve JWT from AsyncStorage and inject into headers
apiClient.interceptors.request.use(
  async (config) => {
    try {
      const token = await AsyncStorage.getItem('rideflow_token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (err) {
      console.warn('Failed to read token from AsyncStorage:', err);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 3. Response Interceptor: Handle 401 Unauthorized (Expired Session)
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      console.warn('Session expired. Purging mobile credentials.');
      await AsyncStorage.removeItem('rideflow_token');
      await AsyncStorage.removeItem('rideflow_user');
    }
    return Promise.reject(error);
  }
);

// ==========================================
// 4. Strongly-Typed Mobile REST API Endpoints
// ==========================================

export const authApi = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>('/auth/login', { email, password });
    return res.data;
  },

  sendOtp: async (phone: string): Promise<{ message: string; phone: string; otp?: string }> => {
    const res = await apiClient.post('/auth/send-otp', { phone });
    return res.data;
  },

  verifyOtp: async (phone: string, otp: string): Promise<{ message: string; phone: string }> => {
    const res = await apiClient.post('/auth/verify-otp', { phone, otp });
    return res.data;
  },

  signup: async (payload: {
    name: string;
    email: string;
    password: string;
    phone: string;
    role?: 'ROLE_RIDER' | 'ROLE_DRIVER';
  }): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>('/auth/signup', payload);
    return res.data;
  },
};

export const rideApi = {
  // Rider: Book a new trip (/api/rides/request)
  bookRide: async (payload: {
    pickupLat: number;
    pickupLng: number;
    dropoffLat: number;
    dropoffLng: number;
    pickupAddress: string;
    dropoffAddress: string;
    vehicleType: string;
    paymentMethod?: string;
    scheduledPickupTime?: string;
  }): Promise<Ride> => {
    // Map UI vehicle options to backend VehicleType enum (ECONOMY, PREMIUM, SUV)
    let mappedVehicle = payload.vehicleType;
    if (mappedVehicle === 'AUTO') mappedVehicle = 'ECONOMY';
    if (mappedVehicle === 'SEDAN') mappedVehicle = 'PREMIUM';

    const res = await apiClient.post<Ride>('/rides/request', {
      ...payload,
      vehicleType: mappedVehicle,
      paymentMethod: payload.paymentMethod || 'CASH',
      scheduledPickupTime: payload.scheduledPickupTime,
    });
    return res.data;
  },

  // Rider: Get upcoming advance scheduled trips (/api/rides/scheduled)
  getScheduledRides: async (): Promise<Ride[]> => {
    const res = await apiClient.get<Ride[]>('/rides/scheduled');
    return res.data || [];
  },

  // Rider: Cancel an upcoming scheduled trip (/api/rides/{rideId}/cancel-scheduled)
  cancelScheduledRide: async (rideId: number): Promise<Ride> => {
    const res = await apiClient.post<Ride>(`/rides/${rideId}/cancel-scheduled`);
    return res.data;
  },

  // Driver: Accept a requested trip (/api/rides/{rideId}/accept)
  acceptRide: async (rideId: number): Promise<Ride> => {
    const res = await apiClient.post<Ride>(`/rides/${rideId}/accept`);
    return res.data;
  },

  // Driver: Arrived at pickup (/api/rides/{rideId}/arrived)
  markArrived: async (rideId: number): Promise<Ride> => {
    const res = await apiClient.post<Ride>(`/rides/${rideId}/arrived`);
    return res.data;
  },

  // Driver: Start ride with passenger's 4-digit OTP (/api/rides/{rideId}/start)
  startRide: async (rideId: number, otp: string): Promise<Ride> => {
    const res = await apiClient.post<Ride>(`/rides/${rideId}/start`, { otp });
    return res.data;
  },

  // Driver: Complete ride & calculate final fare (/api/rides/{rideId}/complete)
  completeRide: async (rideId: number): Promise<Ride> => {
    const res = await apiClient.post<Ride>(`/rides/${rideId}/complete`);
    return res.data;
  },

  // Cancel an active ride (/api/rides/{rideId}/cancel)
  cancelRide: async (rideId: number): Promise<Ride> => {
    const res = await apiClient.post<Ride>(`/rides/${rideId}/cancel`);
    return res.data;
  },

  // Rider Active Ride Recovery
  getRiderActiveRide: async (): Promise<Ride | null> => {
    try {
      const res = await apiClient.get<Ride>('/rides/rider/active');
      return res.data || null;
    } catch {
      return null;
    }
  },

  // Driver Active Ride Recovery
  getDriverActiveRide: async (): Promise<Ride | null> => {
    try {
      const res = await apiClient.get<Ride>('/rides/driver/active');
      return res.data || null;
    } catch {
      return null;
    }
  },

  // Rider: Past Trip History (/api/rides/rider/history)
  getRiderTripHistory: async (): Promise<Ride[]> => {
    const res = await apiClient.get<Ride[]>('/rides/rider/history');
    return res.data || [];
  },

  // Driver: Past Trip History (/api/rides/driver/history)
  getDriverTripHistory: async (): Promise<Ride[]> => {
    const res = await apiClient.get<Ride[]>('/rides/driver/history');
    return res.data || [];
  },

  // Rider: Rate a completed trip (/api/rides/{rideId}/rate)
  rateRide: async (rideId: number, rating: number, comment?: string): Promise<Ride> => {
    const res = await apiClient.post<Ride>(`/rides/${rideId}/rate`, { rating, comment });
    return res.data;
  },
};

export const driverApi = {
  // Toggle Driver Online / Offline duty status (PATCH /api/drivers/availability?isOnline=...)
  setAvailability: async (isOnlineOrId: boolean | number, maybeOnline?: boolean): Promise<DriverProfile> => {
    const isOnline = typeof isOnlineOrId === 'boolean' ? isOnlineOrId : !!maybeOnline;
    const res = await apiClient.patch<DriverProfile>('/drivers/availability', null, {
      params: { isOnline },
    });
    return res.data;
  },

  // Get authenticated driver's profile (GET /api/drivers/me)
  getMyProfile: async (): Promise<DriverProfile> => {
    const res = await apiClient.get<DriverProfile>('/drivers/me');
    return res.data;
  },

  // Driver vehicle & documents onboarding (POST /api/drivers/onboard)
  onboard: async (
    payload: {
      licenseNumber: string;
      vehiclePlate: string;
      vehicleModel: string;
      vehicleType: string;
    },
    token?: string
  ): Promise<DriverProfile> => {
    const config = token ? { headers: { Authorization: `Bearer ${token}` } } : undefined;
    const res = await apiClient.post<DriverProfile>('/drivers/onboard', payload, config);
    return res.data;
  },
};

// ==========================================
// 5. In-App Live Chat API
// ==========================================
export const chatApi = {
  // Fetch message history for an active trip
  getMessages: async (rideId: number): Promise<ChatMessage[]> => {
    const res = await apiClient.get<ChatMessage[]>(`/rides/${rideId}/chat`);
    return res.data || [];
  },

  // Fallback REST endpoint to send message
  sendMessage: async (rideId: number, message: Partial<ChatMessage>): Promise<ChatMessage> => {
    const res = await apiClient.post<ChatMessage>(`/rides/${rideId}/chat`, message);
    return res.data;
  },
};

// ==========================================
// 6. Digital Wallet & Fintech API
// ==========================================
export const walletApi = {
  // Get wallet balance for current user
  getBalance: async (): Promise<Wallet> => {
    const res = await apiClient.get<Wallet>('/wallet/balance');
    return res.data;
  },

  // Top-up wallet balance
  topup: async (
    amount: number,
    method = 'UPI',
    referenceId?: string
  ): Promise<{ message: string; balance: number; currency: string }> => {
    const res = await apiClient.post('/wallet/topup', { amount, method, referenceId });
    return res.data;
  },

  // Get transaction ledger statements
  getTransactions: async (): Promise<WalletTransaction[]> => {
    const res = await apiClient.get<WalletTransaction[]>('/wallet/transactions');
    return res.data || [];
  },

  // Driver: Get today's & all-time earnings summary
  getDriverEarnings: async (): Promise<DriverEarningsSummary> => {
    const res = await apiClient.get<DriverEarningsSummary>('/wallet/driver/summary');
    return res.data;
  },

  // Driver: Request withdrawal to Bank / UPI
  driverWithdraw: async (
    amount: number,
    upiId?: string
  ): Promise<{ message: string; balance: number }> => {
    const res = await apiClient.post('/wallet/driver/withdraw', { amount, upiId });
    return res.data;
  },
};

// ==========================================
// 7. User & Driver Profile API
// ==========================================
export const userApi = {
  // Get current user profile
  getProfile: async (): Promise<UserProfileResponse> => {
    const res = await apiClient.get<UserProfileResponse>('/users/profile');
    return res.data;
  },

  // Update profile
  updateProfile: async (payload: {
    name: string;
    phone?: string;
    vehicleModel?: string;
    vehiclePlate?: string;
    vehicleType?: string;
  }): Promise<UserProfileResponse> => {
    const res = await apiClient.put<UserProfileResponse>('/users/profile', payload);
    return res.data;
  },
};
