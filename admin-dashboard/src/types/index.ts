// 1. User & Role Types
export type Role = 'ROLE_RIDER' | 'ROLE_DRIVER' | 'ROLE_ADMIN';

export interface User {
  id: number;
  name: string;
  email: string;
  phone: string;
  roles: Role[];
}

export interface AuthResponse {
  token: string;
  type: string;
  id: number;
  name: string;
  email: string;
  roles: string[];
}

// 2. Driver & Vehicle Models
export type VehicleType = 'SEDAN' | 'SUV' | 'AUTO' | 'BIKE' | 'ECONOMY' | 'PREMIUM';

export interface DriverProfile {
  id: number;
  userId?: number;
  user?: User;
  driverName?: string;
  driverPhone?: string;
  licenseNumber: string;
  vehicleType: VehicleType;
  vehicleNumber?: string;
  vehiclePlate?: string;
  vehicleModel?: string;
  isAvailable?: boolean;
  isVerified?: boolean;
  online?: boolean;
  approvalStatus?: string;
  currentLat?: number;
  currentLng?: number;
  latitude?: number;
  longitude?: number;
  rating: number;
  totalRides?: number;
}

// 3. Ride & Trip State Machine
export type RideStatus =
  | 'REQUESTED'
  | 'ACCEPTED'
  | 'ARRIVED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export interface Ride {
  id: number;
  riderId?: number;
  riderName?: string;
  riderPhone?: string;
  driverId?: number;
  driverName?: string;
  driverPhone?: string;
  vehiclePlate?: string;
  vehicleModel?: string;
  vehicleType?: string;
  rider?: User;
  driver?: DriverProfile;
  pickupLat: number;
  pickupLng: number;
  pickupAddress?: string;
  dropoffLat: number;
  dropoffLng: number;
  dropoffAddress?: string;
  distanceKm?: number;
  durationMinutes?: number;
  estimatedFare?: number;
  actualFare?: number;
  fare: number;
  otp?: string;
  status: RideStatus;
  paymentMethod?: string;
  paymentStatus?: string;
  createdAt: string;
  updatedAt?: string;
  acceptedAt?: string;
  startedAt?: string;
  completedAt?: string;
}

// 4. Payment & Commission Types
export type PaymentStatus = 'PENDING' | 'COMPLETED' | 'FAILED' | 'REFUNDED';

export interface Payment {
  id: number;
  rideId: number;
  amount: number;
  status: PaymentStatus;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  driverEarning: number;
  platformFee: number;
  createdAt: string;
}

// 5. Real-Time Telemetry & STOMP Payloads
export interface DriverLocationPayload {
  driverId: number;
  rideId?: number;
  latitude: number;
  longitude: number;
  bearing?: number;
  speed?: number;
}

export interface RideEventPayload {
  rideId: number;
  status: RideStatus;
  driverId?: number;
  timestamp: string;
  message?: string;
}

// 6. Admin Dashboard Summary Metrics
export interface DashboardStats {
  totalRides: number;
  activeDrivers: number;
  pendingApprovals: number;
  totalRevenue: number;
  platformCommission: number;
}