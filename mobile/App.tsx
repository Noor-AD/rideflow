// mobile/App.tsx
import React from 'react';
import { StyleSheet, View, ActivityIndicator } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { AuthScreen } from './src/screens/AuthScreen';
import { RiderScreen } from './src/screens/RiderScreen';
import { DriverScreen } from './src/screens/DriverScreen';

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading, activeRole } = useAuth();

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
        <AuthScreen />
        <StatusBar style="light" />
      </>
    );
  }

  // 3. Authenticated: Render active role experience
  return (
    <>
      {activeRole === 'ROLE_DRIVER' ? <DriverScreen /> : <RiderScreen />}
      <StatusBar style="light" />
    </>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
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
});