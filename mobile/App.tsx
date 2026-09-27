// mobile/App.tsx
import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text, ActivityIndicator, LogBox } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Updates from 'expo-updates';
import { AuthProvider, useAuth } from './src/context/AuthContext';
import { AuthScreen } from './src/screens/AuthScreen';
import { RiderScreen } from './src/screens/RiderScreen';
import { DriverScreen } from './src/screens/DriverScreen';

// Clear developer yellow warning boxes/lines on phone UI
LogBox.ignoreAllLogs();

const AppContent: React.FC = () => {
  const { isAuthenticated, isLoading, activeRole } = useAuth();
  const [updateMsg, setUpdateMsg] = useState<string | null>(null);

  // Check for Over-The-Air updates and auto-reload with on-screen notice
  useEffect(() => {
    if (__DEV__) return;

    async function checkOtaUpdate() {
      try {
        const update = await Updates.checkForUpdateAsync();
        if (update.isAvailable) {
          setUpdateMsg('🔄 Downloading latest update...');
          await Updates.fetchUpdateAsync();
          setUpdateMsg('✅ Update installed! Reloading app...');
          setTimeout(async () => {
            await Updates.reloadAsync();
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
});