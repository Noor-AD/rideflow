// mobile/src/types/index.ts

// 1. Roles & User Model
export type Role = 'ROLE_RIDER' | 'ROLE_DRIVER' | 'ROLE_ADMIN';

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  roles: Role[];
}

export interface UserProfileResponse {
  id: number;
  name: string;
  email: string;
  phone: string;
  roles: Role[];
  driver?: {
    driverId: number;
    licenseNumber: string;
    vehiclePlate: string;
    vehicleModel: string;
    vehicleType: VehicleType;
    approvalStatus: string;
    rating: number;
    totalRides: number;
    isOnline: boolean;
  };
}

export interface AuthResponse {
  token: string;
  type: string;
  id: number;
  name: string;
  email: string;
  roles: string[];
}

// 2. Vehicle & Payment Models
export type VehicleType = 'ECONOMY' | 'PREMIUM' | 'SUV';
export type PaymentMethod = 'CASH' | 'CARD' | 'WALLET' | 'UPI';

export interface DriverProfile {
  id: number;
  userId?: number;
  driverName?: string;
  driverPhone?: string;
  user?: User;
  licenseNumber: string;
  vehiclePlate?: string;
  vehicleModel?: string;
  vehicleType: VehicleType;
  vehicleNumber?: string;
  isOnline: boolean;
  isAvailable?: boolean;
  approvalStatus?: string;
  isVerified?: boolean;
  latitude?: number;
  longitude?: number;
  currentLat?: number;
  currentLng?: number;
  rating: number;
  totalRides?: number;
}

// 3. Ride State Machine
export type RideStatus =
  | 'REQUESTED'
  | 'ACCEPTED'
  | 'ARRIVED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'SCHEDULED';

export interface Ride {
  id: number;
  rider: User;
  driver?: DriverProfile;
  pickupLat: number;
  pickupLng: number;
  pickupAddress?: string;
  dropoffLat: number;
  dropoffLng: number;
  dropoffAddress?: string;
  status: RideStatus;
  fare: number;
  actualFare?: number;
  estimatedFare?: number;
  otp?: string; // 4-digit ride start OTP displayed to passenger
  vehicleType?: VehicleType;
  paymentMethod?: PaymentMethod;
  scheduledPickupTime?: string;
  isScheduled?: boolean;
  createdAt: string;
  updatedAt?: string;
}

// 4. Real-time Telemetry Payloads
export interface DriverLocationPayload {
  driverId: number;
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  timestamp: string;
}

export interface RideEventPayload {
  rideId: number;
  status?: RideStatus;
  eventType?: string;
  driverId?: number;
  driverLat?: number;
  driverLng?: number;
  message?: string;
  data?: any;
  timestamp?: string;
}

// 5. In-App Live Chat Message
export interface ChatMessage {
  id?: number;
  rideId: number;
  senderId: number;
  senderName: string;
  senderRole: 'ROLE_RIDER' | 'ROLE_DRIVER';
  message: string;
  timestamp: number;
}

// 6. Digital Wallet & Fintech Models
export interface Wallet {
  balance: number;
  currency: string;
  userId?: number;
  userName?: string;
}

export interface WalletTransaction {
  id: number;
  amount: number;
  postBalance: number;
  type: 'TOPUP' | 'RIDE_PAYMENT' | 'DRIVER_EARNING' | 'WITHDRAWAL';
  referenceId: string;
  description: string;
  createdAt: string;
}

export interface DriverEarningsSummary {
  walletBalance: number;
  todayGrossEarnings: number;
  todayNetEarnings: number;
  todayPlatformFee: number;
  todayRidesCount: number;
  allTimeEarnings: number;
  allTimeRidesCount: number;
  recentTransactions: WalletTransaction[];
}