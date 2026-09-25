import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppStateData } from '../types';

export interface AuthUser {
  uid: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
}

interface AuthContextType {
  currentUser: AuthUser | null;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  cloudSyncStatus: 'synced' | 'syncing' | 'offline' | 'error' | 'idle';
  lastSyncedAt: Date | string | null;
  loadFromCloud: () => Promise<Partial<AppStateData> | null>;
  saveToCloud: (state: AppStateData) => Promise<boolean>;
}

const defaultContextValue: AuthContextType = {
  currentUser: null,
  loginWithGoogle: async () => {},
  logout: async () => {},
  cloudSyncStatus: 'offline',
  lastSyncedAt: null,
  loadFromCloud: async () => null,
  saveToCloud: async () => false,
};

const AuthContext = createContext<AuthContextType>(defaultContextValue);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => {
    try {
      const stored = localStorage.getItem('ekdor_current_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'synced' | 'syncing' | 'offline' | 'error' | 'idle'>('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | string | null>(null);

  const loginWithGoogle = async () => {
    // Local / Offline mode login simulation
    const mockUser: AuthUser = {
      uid: 'user-' + Date.now(),
      email: 'shopkeeper@ekdor.com',
      displayName: 'দোকানদার',
    };
    setCurrentUser(mockUser);
    localStorage.setItem('ekdor_current_user', JSON.stringify(mockUser));
  };

  const logout = async () => {
    setCurrentUser(null);
    localStorage.removeItem('ekdor_current_user');
  };

  const loadFromCloud = async (): Promise<Partial<AppStateData> | null> => {
    if (!currentUser) return null;
    setCloudSyncStatus('syncing');
    try {
      const res = await fetch('/api/store-data', {
        headers: {
          Authorization: `Bearer ${currentUser.uid}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setCloudSyncStatus('synced');
        setLastSyncedAt(new Date());
        return data;
      }
      setCloudSyncStatus('idle');
      return null;
    } catch {
      setCloudSyncStatus('offline');
      return null;
    }
  };

  const saveToCloud = async (state: AppStateData): Promise<boolean> => {
    if (!currentUser) return false;
    setCloudSyncStatus('syncing');
    try {
      const res = await fetch('/api/store-data/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${currentUser.uid}`,
        },
        body: JSON.stringify(state),
      });
      if (res.ok) {
        setCloudSyncStatus('synced');
        setLastSyncedAt(new Date());
        return true;
      }
      setCloudSyncStatus('error');
      return false;
    } catch {
      setCloudSyncStatus('offline');
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loginWithGoogle,
        logout,
        cloudSyncStatus,
        lastSyncedAt,
        loadFromCloud,
        saveToCloud,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  return ctx || defaultContextValue;
}
