import axios from 'axios';
import type { DriverProfile, Ride, DashboardStats, AuthResponse } from '../types';

const API_BASE_URL = 'https://rideflow-production-06dc.up.railway.app/api';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 1. Request Interceptor: Attach JWT Bearer Token automatically
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('rideflow_admin_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// 2. Response Interceptor: Catch 401 Unauthorized
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('Session expired or unauthorized. Clearing credentials.');
      localStorage.removeItem('rideflow_admin_token');
      localStorage.removeItem('rideflow_admin_user');
      window.dispatchEvent(new CustomEvent('rideflow:logout'));
    }
    return Promise.reject(error);
  }
);

// ==========================================
// 3. Type-Safe API Helper Functions
// ==========================================

export const authApi = {
  login: async (email: string, password: string): Promise<AuthResponse> => {
    const res = await apiClient.post<AuthResponse>('/auth/login', { email, password });
    return res.data;
  },
};

export const adminApi = {
  // Fetch pending drivers awaiting admin document verification
  getPendingDrivers: async (): Promise<DriverProfile[]> => {
    const res = await apiClient.get<DriverProfile[]>('/admin/drivers/pending');
    return res.data;
  },

  // Approve a driver profile
  verifyDriver: async (driverId: number): Promise<DriverProfile> => {
    const res = await apiClient.put<DriverProfile>(`/admin/drivers/${driverId}/verify`);
    return res.data;
  },

  // Fetch all active drivers for fleet map display
  getAllDrivers: async (): Promise<DriverProfile[]> => {
    // If backend endpoint is /drivers or /admin/drivers
    const res = await apiClient.get<DriverProfile[]>('/admin/drivers');
    return res.data;
  },

  // Fetch all rides in the system
  getAllRides: async (): Promise<Ride[]> => {
    const res = await apiClient.get<Ride[]>('/admin/rides');
    return res.data;
  },

  // Fetch revenue & platform statistics
  getStats: async (): Promise<DashboardStats> => {
    const res = await apiClient.get<DashboardStats>('/admin/stats');
    return res.data;
  },
};