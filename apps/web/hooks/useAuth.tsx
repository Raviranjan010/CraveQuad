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
  loginWithEmail: (email: string, pass: string) => Promise<any>;
  signUpWithEmail: (email: string, pass: string, name: string, campusId: string, role: 'STUDENT' | 'FACULTY') => Promise<any>;
  loginWithGoogle: () => Promise<{ isNewUser: boolean; role?: string; vendorStatus?: string }>;
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
    try {
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
    } catch (err) {
      console.error('Session sync error:', err);
    }
  };

  // Load user profile from NestJS backend
  const fetchProfileDirectly = async (token: string): Promise<any | null> => {
    try {
      const res = await fetch(`${API_URL}/users/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (res.ok) {
        return await res.json();
      }
      return null;
    } catch (err) {
      console.error('Error fetching profile directly:', err);
      return null;
    }
  };

  const refreshProfile = async () => {
    if (user) {
      const token = await user.getIdToken(true);
      const profile = await fetchProfileDirectly(token);
      setDbUser(profile);
      if (profile) {
        setRole(profile.role);
      }
    }
  };

  useEffect(() => {
    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        setUser(firebaseUser);
        const token = await firebaseUser.getIdToken();
        await syncSession(token);
        // Requirement 2: Auto-fetch from GET /auth/me (/users/me) if user is logged in but dbUser is null
        const profile = await fetchProfileDirectly(token);
        setDbUser(profile);
        if (profile) {
          setRole(profile.role);
        }
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

  const loginWithEmail = async (email: string, pass: string): Promise<any> => {
    setLoading(true);
    try {
      const lowerEmail = email.toLowerCase();
      // Handle mock login patterns for local development
      if (lowerEmail.includes('nescafe')) {
        const mockUid = 'mock-nescafe-owner-uid';
        const mockUser = {
          uid: mockUid,
          email,
          displayName: 'Ramesh Sen',
          getIdToken: async () => mockUid,
        } as any;
        setUser(mockUser);
        await syncSession(mockUid);
        const profile = await fetchProfileDirectly(mockUid);
        setDbUser(profile);
        setRole(profile ? profile.role : 'VENDOR');
        return profile;
      }
      if (lowerEmail.includes('canteen')) {
        const mockUid = 'mock-canteen-owner-uid';
        const mockUser = {
          uid: mockUid,
          email,
          displayName: 'Sanjeev Kumar',
          getIdToken: async () => mockUid,
        } as any;
        setUser(mockUser);
        await syncSession(mockUid);
        const profile = await fetchProfileDirectly(mockUid);
        setDbUser(profile);
        setRole(profile ? profile.role : 'VENDOR');
        return profile;
      }
      if (lowerEmail.includes('bakery')) {
        const mockUid = 'mock-bakery-owner-uid';
        const mockUser = {
          uid: mockUid,
          email,
          displayName: 'Aditya Mehta',
          getIdToken: async () => mockUid,
        } as any;
        setUser(mockUser);
        await syncSession(mockUid);
        const profile = await fetchProfileDirectly(mockUid);
        setDbUser(profile);
        setRole(profile ? profile.role : 'VENDOR');
        return profile;
      }
      if (lowerEmail.includes('rider') || lowerEmail.includes('rahul')) {
        const mockUid = 'mock-delivery-rider-uid';
        const mockUser = {
          uid: mockUid,
          email,
          displayName: 'Rahul Kumar',
          getIdToken: async () => mockUid,
        } as any;
        setUser(mockUser);
        await syncSession(mockUid);
        const profile = await fetchProfileDirectly(mockUid);
        setDbUser(profile);
        setRole(profile ? profile.role : 'DELIVERY_PARTNER');
        return profile;
      }
      if (lowerEmail.includes('student') || lowerEmail.includes('aarav') || lowerEmail.includes('bits.ac.in')) {
        const mockUid = 'mock-student-uid';
        const mockUser = {
          uid: mockUid,
          email: 'aarav.patel@student.bits.ac.in',
          displayName: 'Aarav Patel',
          getIdToken: async () => mockUid,
        } as any;
        setUser(mockUser);
        await syncSession(mockUid);
        const profile = await fetchProfileDirectly(mockUid);
        setDbUser(profile);
        setRole(profile ? profile.role : 'STUDENT');
        return profile;
      }
      
      const credential = await signInWithEmailAndPassword(auth, email, pass);
      const token = await credential.user.getIdToken();
      await syncSession(token);
      const profile = await fetchProfileDirectly(token);
      setDbUser(profile);
      if (profile) {
        setRole(profile.role);
      }
      return profile;
    } catch (err: any) {
      console.error('Firebase login failed:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signUpWithEmail = async (
    email: string, 
    pass: string, 
    name: string, 
    campusId: string, 
    role: 'STUDENT' | 'FACULTY'
  ): Promise<any> => {
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
        body: JSON.stringify({ name, campusId, role }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        // Delete the Firebase user if Postgres registration fails to maintain sync
        await credential.user.delete();
        throw new Error(errorData.message || 'Failed to complete registration on backend.');
      }

      await syncSession(token);
      const profile = await fetchProfileDirectly(token);
      setDbUser(profile);
      if (profile) {
        setRole(profile.role);
      }
      return profile;
    } catch (err) {
      console.error('Signup error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async (): Promise<{ isNewUser: boolean; role?: string; vendorStatus?: string }> => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const credential = await signInWithPopup(auth, provider);
      const firebaseUser = credential.user;
      setUser(firebaseUser);
      const token = await firebaseUser.getIdToken();

      // 1. Sync session cookie
      await syncSession(token);

      // 2. Fetch profile from /users/me
      const profile = await fetchProfileDirectly(token);
      if (profile) {
        setDbUser(profile);
        setRole(profile.role);
        return { 
          isNewUser: false, 
          role: profile.role, 
          vendorStatus: profile.vendor?.status 
        };
      } else {
        setDbUser(null);
        setRole(null);
        return { isNewUser: true };
      }
    } catch (err) {
      console.error('Google Sign-In failed:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      setUser(null);
      setDbUser(null);
      setRole(null);
      await syncSession(null);
      window.location.href = '/login';
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
