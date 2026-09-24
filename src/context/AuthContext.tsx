import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import { auth, googleAuthProvider } from '../lib/firebase';
import { AppStateData } from '../types';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
  cloudSyncStatus: 'idle' | 'syncing' | 'synced' | 'error';
  lastSyncedAt: Date | null;
  syncError: string | null;
  loadFromCloud: () => Promise<Partial<AppStateData> | null>;
  saveToCloud: (data: AppStateData) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('idle');
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setLoading(false);

      if (user) {
        try {
          const token = await user.getIdToken();
          await fetch('/api/auth/sync-user', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              name: user.displayName || 'দোকানদার',
            }),
          });
        } catch (err) {
          console.error('Error syncing user profile on backend:', err);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    try {
      setLoading(true);
      await signInWithPopup(auth, googleAuthProvider);
    } catch (err: any) {
      console.error('Login error:', err);
      alert('গুগল লগইনে সমস্যা হয়েছে: ' + (err.message || 'অনুগ্রহ করে আবার চেষ্টা করুন'));
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const getIdToken = async (): Promise<string | null> => {
    if (!currentUser) return null;
    return await currentUser.getIdToken();
  };

  const loadFromCloud = async (): Promise<Partial<AppStateData> | null> => {
    if (!currentUser) return null;
    try {
      setCloudSyncStatus('syncing');
      setSyncError(null);
      const token = await currentUser.getIdToken();
      const res = await fetch('/api/store-data', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to load data: ${res.statusText}`);
      }

      const data = await res.json();
      setCloudSyncStatus('synced');
      setLastSyncedAt(new Date());
      return data;
    } catch (err: any) {
      console.error('Error loading data from Cloud SQL:', err);
      setCloudSyncStatus('error');
      setSyncError(err.message || 'ক্লাউড থেকে ডাটা লোড করা যায়নি');
      return null;
    }
  };

  const saveToCloud = async (data: AppStateData): Promise<boolean> => {
    if (!currentUser) return false;
    try {
      setCloudSyncStatus('syncing');
      setSyncError(null);
      const token = await currentUser.getIdToken();
      const res = await fetch('/api/store-data/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        throw new Error(`Failed to save data: ${res.statusText}`);
      }

      setCloudSyncStatus('synced');
      setLastSyncedAt(new Date());
      return true;
    } catch (err: any) {
      console.error('Error saving data to Cloud SQL:', err);
      setCloudSyncStatus('error');
      setSyncError(err.message || 'ক্লাউডে ডাটা সেভ করা যায়নি');
      return false;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        loading,
        loginWithGoogle,
        logout,
        getIdToken,
        cloudSyncStatus,
        lastSyncedAt,
        syncError,
        loadFromCloud,
        saveToCloud,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
