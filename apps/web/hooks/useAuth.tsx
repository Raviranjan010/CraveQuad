'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  onIdTokenChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { auth } from '../lib/firebase';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface AuthContextType {
  user: FirebaseUser | null;
  dbUser: any | null;
  role: string | null;
  loading: boolean;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, name: string, campusId: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [dbUser, setDbUser] = useState<any | null>(null);
  const [role, setRole] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Sync token to httpOnly cookie session
  const syncSession = async (token: string | null) => {
    if (token) {
      await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });
    } else {
      await fetch('/api/auth/session', {
        method: 'DELETE',
      });
    }
  };

  // Load user profile from NestJS backend
  const fetchProfile = async (token: string) => {
    try {
      const res = await fetch(`${API_URL}/users/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setDbUser(data);
        setRole(data.role);
      } else {
        setDbUser(null);
        setRole(null);
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
      setDbUser(null);
      setRole(null);
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const token = await user.getIdToken(true);
      await fetchProfile(token);
    }
  };

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        setUser(firebaseUser);
        const token = await firebaseUser.getIdToken();
        await syncSession(token);
        await fetchProfile(token);
      } else {
        setUser(null);
        setDbUser(null);
        setRole(null);
        await syncSession(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const loginWithEmail = async (email: string, pass: string) => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, pass);
    } finally {
      setLoading(false);
    }
  };

  const signUpWithEmail = async (email: string, pass: string, name: string, campusId: string) => {
    setLoading(true);
    try {
      // 1. Create User in Firebase Auth
      const credential = await createUserWithEmailAndPassword(auth, email, pass);
      const token = await credential.user.getIdToken();

      // 2. Sync to Postgres via NestJS Auth Controller
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, campusId }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        // Delete the Firebase user if Postgres registration fails to maintain sync
        await credential.user.delete();
        throw new Error(errorData.message || 'Failed to complete registration on backend.');
      }

      await syncSession(token);
      await fetchProfile(token);
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const credential = await signInPopup(provider);
      const token = await credential.user.getIdToken();

      // Attempt to register/fetch. If not registered, redirect client to campus selection.
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: credential.user.displayName || 'Google User' }),
      });

      if (res.ok) {
        await syncSession(token);
        await fetchProfile(token);
      }
    } finally {
      setLoading(false);
    }
  };

  // Helper function to safely wrap signInWithPopup
  const signInPopup = async (provider: GoogleAuthProvider) => {
    return signInWithPopup(auth, provider);
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      setUser(null);
      setDbUser(null);
      setRole(null);
      await syncSession(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        dbUser,
        role,
        loading,
        loginWithEmail,
        signUpWithEmail,
        loginWithGoogle,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
