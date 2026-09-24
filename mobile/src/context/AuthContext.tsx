// mobile/src/context/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { User, Role, AuthResponse } from '../types';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  activeRole: Role;
  login: (authData: AuthResponse) => Promise<void>;
  logout: () => Promise<void>;
  switchRole: (role: Role) => void;
  updateUser: (updatedData: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'rideflow_token';
const USER_KEY = 'rideflow_user';

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeRole, setActiveRole] = useState<Role>('ROLE_RIDER');

  // 1. Restore persistent session from AsyncStorage on app cold-start
  useEffect(() => {
    const restoreSession = async () => {
      try {
        const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
        const storedUser = await AsyncStorage.getItem(USER_KEY);

        if (storedToken && storedUser) {
          const parsedUser: User = JSON.parse(storedUser);
          setToken(storedToken);
          setUser(parsedUser);

          // Default to the first role assigned to the user
          if (parsedUser.roles && parsedUser.roles.length > 0) {
            setActiveRole(parsedUser.roles.includes('ROLE_DRIVER') ? 'ROLE_DRIVER' : 'ROLE_RIDER');
          }
        }
      } catch (err) {
        console.warn('Failed to restore mobile auth session:', err);
      } finally {
        setIsLoading(false);
      }
    };

    restoreSession();
  }, []);

  // 2. Handle Login Success
  const login = async (authData: AuthResponse) => {
    try {
      const userObj: User = {
        id: authData.id,
        name: authData.name,
        email: authData.email,
        phone: '', // Populated by profile or registration
        roles: authData.roles as Role[],
      };

      await AsyncStorage.setItem(TOKEN_KEY, authData.token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(userObj));

      setToken(authData.token);
      setUser(userObj);

      // Automatically set active role based on user permissions
      if (userObj.roles.includes('ROLE_DRIVER')) {
        setActiveRole('ROLE_DRIVER');
      } else {
        setActiveRole('ROLE_RIDER');
      }
    } catch (err) {
      console.error('Failed to persist mobile auth session:', err);
      throw err;
    }
  };

  // 3. Handle Logout & Purge Storage
  const logout = async () => {
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
      await AsyncStorage.removeItem(USER_KEY);
      setToken(null);
      setUser(null);
      setActiveRole('ROLE_RIDER');
    } catch (err) {
      console.error('Failed to purge mobile auth session:', err);
    }
  };

  // 4. Switch between Rider and Driver modes
  const switchRole = (role: Role) => {
    if (role === 'ROLE_DRIVER' && !user?.roles?.includes('ROLE_DRIVER')) {
      Alert.alert(
        'Driver Account Required',
        'This account is registered as a Passenger. Please log out and sign in with a Driver account (driver3992@test.com) to access the Driver console.'
      );
      return;
    }
    if (role === 'ROLE_RIDER' && !user?.roles?.includes('ROLE_RIDER')) {
      Alert.alert(
        'Rider Account Required',
        'This account does not have Passenger permissions. Please log in with a Passenger account.'
      );
      return;
    }
    setActiveRole(role);
  };

  // 5. Update Cached User Profile
  const updateUser = async (updatedData: Partial<User>) => {
    if (!user) return;
    const mergedUser = { ...user, ...updatedData };
    setUser(mergedUser);
    try {
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(mergedUser));
    } catch (e) {
      console.warn('Failed to update stored user:', e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isLoading,
        activeRole,
        login,
        logout,
        switchRole,
        updateUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// 5. Custom Hook for clean, type-safe access across all screens
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};