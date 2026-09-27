import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar, type DashboardTab } from './components/Sidebar';
import { StatsOverview } from './components/StatsOverview';
import { LiveFleetMap } from './components/LiveFleetMap';
import { DriverQueue } from './components/DriverQueue';
import { ActiveRidesTable } from './components/ActiveRidesTable';
import { RevenueAnalytics } from './components/RevenueAnalytics';
import { LoginScreen } from './components/LoginScreen';
import { SectionErrorBoundary } from './components/SectionErrorBoundary';
import { adminApi } from './api/client';
import { wsService, type ConnectionStatus } from './api/websocket';
import type { DashboardStats, DriverProfile, Ride, AuthResponse } from './types';
import { RefreshCw } from 'lucide-react';

interface AdminSessionUser {
  id: number;
  name: string;
  email: string;
  roles: string[];
}

const getInitialAuth = (): { token: string | null; user: AdminSessionUser | null } => {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return { token: null, user: null };
    }
    const token = localStorage.getItem('rideflow_admin_token');
    const userStr = localStorage.getItem('rideflow_admin_user');
    if (!token) return { token: null, user: null };
    return { token, user: userStr ? JSON.parse(userStr) : null };
  } catch {
    return { token: null, user: null };
  }
};

export const App: React.FC = () => {
  // 0. Authentication State
  const [currentUser, setCurrentUser] = useState<AdminSessionUser | null>(() => getInitialAuth().user);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => !!getInitialAuth().token);

  // 1. Navigation & Connection State
  const [currentTab, setCurrentTab] = useState<DashboardTab>('overview');
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('CONNECTING');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 2. Data State
  const [stats, setStats] = useState<DashboardStats>({
    totalRides: 0,
    activeDrivers: 0,
    pendingApprovals: 0,
    totalRevenue: 0,
    platformCommission: 0,
  });
  const [drivers, setDrivers] = useState<DriverProfile[]>([]);
  const [pendingDrivers, setPendingDrivers] = useState<DriverProfile[]>([]);
  const [rides, setRides] = useState<Ride[]>([]);

  // 3. Fetch Dashboard Data from Backend
  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      // Fetch stats, drivers, pending queue, and rides concurrently
      const [statsRes, driversRes, pendingRes, ridesRes] = await Promise.allSettled([
        adminApi.getStats(),
        adminApi.getAllDrivers(),
        adminApi.getPendingDrivers(),
        adminApi.getAllRides(),
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value) {
        setStats(statsRes.value);
      }

      if (driversRes.status === 'fulfilled' && Array.isArray(driversRes.value)) {
        setDrivers(driversRes.value);
      }

      if (pendingRes.status === 'fulfilled' && Array.isArray(pendingRes.value)) {
        setPendingDrivers(pendingRes.value);
      }

      if (ridesRes.status === 'fulfilled' && Array.isArray(ridesRes.value)) {
        setRides(ridesRes.value);
      }
    } catch (err) {
      console.warn('Dashboard data fetch warning:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // 4. Session & Unauthorized Event Listener
  useEffect(() => {
    const handleUnauthorized = () => {
      setIsAuthenticated(false);
      setCurrentUser(null);
      wsService.disconnect();
    };

    window.addEventListener('rideflow:logout', handleUnauthorized);
    return () => window.removeEventListener('rideflow:logout', handleUnauthorized);
  }, []);

  // 5. Real-Time Telemetry & STOMP Subscriptions
  useEffect(() => {
    if (!isAuthenticated) return;

    // Initial HTTP fetch
    loadDashboardData();

    // Connect to WebSocket STOMP broker
    wsService.connect((status) => {
      setConnectionStatus(status);
    });

    // Subscribe to real-time taxi location updates
    const unsubLocation = wsService.subscribeToDriverLocations((payload) => {
      setDrivers((prevDrivers) =>
        prevDrivers.map((d) =>
          d.id === payload.driverId
            ? { ...d, currentLat: payload.latitude, currentLng: payload.longitude, latitude: payload.latitude, longitude: payload.longitude }
            : d
        )
      );
    });

    // Subscribe to real-time ride event state transitions
    const unsubRides = wsService.subscribeToRideEvents((event) => {
      setRides((prevRides) =>
        prevRides.map((r) =>
          r.id === event.rideId ? { ...r, status: event.status } : r
        )
      );
    });

    // Cleanup on component unmount or logout
    return () => {
      if (unsubLocation) unsubLocation();
      if (unsubRides) unsubRides();
      wsService.disconnect();
    };
  }, [isAuthenticated, loadDashboardData]);

  // 6. Login & Logout Handlers
  const handleLoginSuccess = (auth: AuthResponse) => {
    setCurrentUser({
      id: auth.id,
      name: auth.name,
      email: auth.email,
      roles: auth.roles,
    });
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    localStorage.removeItem('rideflow_admin_token');
    localStorage.removeItem('rideflow_admin_user');
    wsService.disconnect();
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

  // 7. Driver Approval Handler
  const handleApproveDriver = async (driverId: number) => {
    try {
      await adminApi.verifyDriver(driverId);
      // Remove from pending queue
      const approved = pendingDrivers.find((d) => d.id === driverId);
      setPendingDrivers((prev) => prev.filter((d) => d.id !== driverId));

      // Add to active fleet
      if (approved) {
        setDrivers((prev) => [...prev, { ...approved, isVerified: true, isAvailable: true, online: true }]);
        setStats((prev) => ({
          ...prev,
          activeDrivers: (prev.activeDrivers ?? 0) + 1,
          pendingApprovals: Math.max(0, (prev.pendingApprovals ?? 0) - 1),
        }));
      }
    } catch (err) {
      console.error('Failed to verify driver partner:', err);
      setPendingDrivers((prev) => prev.filter((d) => d.id !== driverId));
    }
  };

  // Auth Guard: If not logged in, show LoginScreen
  if (!isAuthenticated) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Navigation */}
      <Navbar
        connectionStatus={connectionStatus}
        adminName={currentUser?.name || 'Fleet Operations Lead'}
        adminEmail={currentUser?.email || 'admin@rideflow.test'}
        onLogout={handleLogout}
      />

      {/* Main Container: Sidebar + Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Navigation Sidebar */}
        <Sidebar
          currentTab={currentTab}
          onTabChange={(tab) => setCurrentTab(tab)}
          pendingApprovalsCount={pendingDrivers.length}
        />

        {/* Dynamic Main Workspace */}
        <main className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Header Action Row */}
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight capitalize">
                {currentTab === 'overview'
                  ? 'Operations Overview'
                  : currentTab === 'map'
                  ? 'Live GPS Fleet Grid'
                  : currentTab === 'rides'
                  ? 'Dispatch Ride Monitor'
                  : currentTab === 'drivers'
                  ? 'Driver Verification Queue'
                  : 'Platform Financial Ledger'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time metrics synchronized with Spring Boot & Redis
              </p>
            </div>

            <button
              onClick={loadDashboardData}
              disabled={isLoading}
              className="flex items-center gap-2 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-emerald-400' : ''}`} />
              <span>Refresh Feed</span>
            </button>
          </div>

          {/* TAB 1: OVERVIEW */}
          {currentTab === 'overview' && (
            <div className="space-y-6">
              <SectionErrorBoundary fallbackTitle="Overview Metrics Unavailable">
                <StatsOverview stats={stats} />
              </SectionErrorBoundary>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <SectionErrorBoundary fallbackTitle="Live Map Loading Issue">
                  <LiveFleetMap drivers={drivers} activeRides={rides} />
                </SectionErrorBoundary>

                <SectionErrorBoundary fallbackTitle="Dispatch Trips Loading Issue">
                  <ActiveRidesTable rides={rides} isLoading={isLoading} />
                </SectionErrorBoundary>
              </div>
            </div>
          )}

          {/* TAB 2: LIVE FLEET MAP */}
          {currentTab === 'map' && (
            <SectionErrorBoundary fallbackTitle="Live Map Loading Issue">
              <LiveFleetMap drivers={drivers} activeRides={rides} />
            </SectionErrorBoundary>
          )}

          {/* TAB 3: ACTIVE RIDES FEED */}
          {currentTab === 'rides' && (
            <SectionErrorBoundary fallbackTitle="Dispatch Trips Loading Issue">
              <ActiveRidesTable rides={rides} isLoading={isLoading} />
            </SectionErrorBoundary>
          )}

          {/* TAB 4: DRIVER VERIFICATION QUEUE */}
          {currentTab === 'drivers' && (
            <SectionErrorBoundary fallbackTitle="Driver Queue Loading Issue">
              <DriverQueue
                drivers={pendingDrivers}
                onApprove={handleApproveDriver}
                isLoading={isLoading}
              />
            </SectionErrorBoundary>
          )}

          {/* TAB 5: REVENUE ANALYTICS */}
          {currentTab === 'revenue' && (
            <SectionErrorBoundary fallbackTitle="Financial Ledger Loading Issue">
              <RevenueAnalytics stats={stats} />
            </SectionErrorBoundary>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;