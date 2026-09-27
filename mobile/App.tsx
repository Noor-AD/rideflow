// mobile/App.tsx
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, LogBox, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Updates from 'expo-updates';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { AuthScreen } from './src/screens/AuthScreen';
import { RiderScreen } from './src/screens/RiderScreen';
import { DriverScreen } from './src/screens/DriverScreen';

// Clear developer yellow warning boxes/lines on phone UI
LogBox.ignoreAllLogs();

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Unhandled App Crash caught by ErrorBoundary:', error, errorInfo);
  }

  handleReset = async () => {
    try {
      await AsyncStorage.removeItem('rideflow_token');
      await AsyncStorage.removeItem('rideflow_user');
    } catch (_) {}
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.errorContainer}>
          <Text style={styles.errorIcon}>⚠️</Text>
          <Text style={styles.errorTitle}>Something went wrong</Text>
          <Text style={styles.errorMessage}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </Text>
          <TouchableOpacity style={styles.resetButton} onPress={this.handleReset}>
            <Text style={styles.resetButtonText}>Reset Session & Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading, activeRole } = useAuth();
  const [updateMsg, setUpdateMsg] = useState<string | null>(null);

  // Check for Over-The-Air updates and auto-reload with on-screen notice
  useEffect(() => {
    if (__DEV__) return;

    async function checkOtaUpdate() {
      try {
        if (!Updates.isEnabled) return;
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          setUpdateMsg('🔄 Downloading latest update...');
          await Updates.fetchUpdateAsync();
          setUpdateMsg('✅ Update installed! Reloading app...');
          setTimeout(async () => {
            try {
              await Updates.reloadAsync();
            } catch (_) {}
          }, 800);
        }
      } catch (err) {
        console.log('Update check error:', err);
      }
    }

    checkOtaUpdate();
  }, []);

  // 1. Show smooth splash loading while restoring AsyncStorage session
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#10b981" />
        <StatusBar style="light" />
      </View>
    );
  }

  // 2. Unauthenticated: Render Login & Registration
  if (!isAuthenticated) {
    return (
      <>
        {updateMsg && (
          <View style={styles.updateBanner}>
            <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={styles.updateText}>{updateMsg}</Text>
          </View>
        )}
        <AuthScreen />
        <StatusBar style="light" />
      </>
    );
  }

  // 3. Authenticated: Render active role experience
  return (
    <>
      {updateMsg && (
        <View style={styles.updateBanner}>
          <ActivityIndicator size="small" color="#ffffff" style={{ marginRight: 8 }} />
          <Text style={styles.updateText}>{updateMsg}</Text>
        </View>
      )}
      {activeRole === 'ROLE_DRIVER' ? <DriverScreen /> : <RiderScreen />}
      <StatusBar style="light" />
    </>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <ErrorBoundary>
        <AuthProvider>
          <AppContent />
        </AuthProvider>
      </ErrorBoundary>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#020617', // slate-950
    alignItems: 'center',
    justifyContent: 'center',
  },
  updateBanner: {
    position: 'absolute',
    top: 50,
    alignSelf: 'center',
    backgroundColor: '#0284c7',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 99999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 10,
  },
  updateText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  errorIcon: {
    fontSize: 48,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#f8fafc',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  resetButton: {
    backgroundColor: '#10b981',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
  },
  resetButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});