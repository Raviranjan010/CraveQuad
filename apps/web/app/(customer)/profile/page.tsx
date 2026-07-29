'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useRouter } from 'next/navigation';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Bell, 
  LogOut, 
  Store,
  Shield,
  Loader2,
  Check
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '../../../hooks/use-toast';
import { Skeleton } from '../../../components/ui/skeleton';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export default function CustomerProfilePage() {
  const { user, dbUser, logout, refreshProfile } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => {
    if (dbUser) {
      setName(dbUser.name || '');
      setPhone(dbUser.phone || '');
      setNotificationsEnabled(!!dbUser.deviceToken);
      setLoading(false);
    }
  }, [dbUser]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setUpdating(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_URL}/users/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() }),
      });

      if (res.ok) {
        await refreshProfile();
        toast({
          title: "Profile Updated",
          description: "Your settings have been saved successfully.",
        });
      } else {
        const errData = await res.json();
        toast({
          variant: "destructive",
          title: "Update Failed",
          description: errData.message || "Failed to update profile.",
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  const saveDeviceToken = async (deviceToken: string) => {
    if (!user) return;
    const token = await user.getIdToken();
    await fetch(`${API_URL}/users/me/device-token`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ token: deviceToken }),
    });
    await refreshProfile();
  };

  const handleNotificationToggle = async () => {
    if (typeof window === 'undefined') return;

    if (!notificationsEnabled) {
      // Request browser notification permission
      try {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
          const mockToken = `mock_fcm_token_${Math.random().toString(36).substring(7)}`;
          await saveDeviceToken(mockToken);
          setNotificationsEnabled(true);
          toast({
            title: "Notifications Enabled",
            description: "You will now receive order updates.",
          });
        } else {
          toast({
            variant: "destructive",
            title: "Permission Denied",
            description: "Please enable notification permissions in your browser.",
          });
        }
      } catch (err) {
        console.error('Notification error:', err);
      }
    } else {
      await saveDeviceToken('');
      setNotificationsEnabled(false);
      toast({
        title: "Notifications Disabled",
        description: "You will no longer receive push notifications.",
      });
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast({
        title: "Logged Out",
        description: "You have been successfully signed out.",
      });
      router.push('/login');
    } catch (err) {
      console.error(err);
    }
  };

  const getInitials = (fullName: string) => {
    if (!fullName) return 'U';
    return fullName
      .split(' ')
      .map((n) => n[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/50 pb-20 px-4 py-8 max-w-2xl mx-auto space-y-6">
        <Skeleton className="h-10 w-44 rounded-xl" />
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 flex items-center gap-4">
          <Skeleton className="h-16 w-16 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-28" />
          </div>
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  const userRole = dbUser?.role || 'STUDENT';
  const campusName = dbUser?.campus?.name || 'Not Configured';

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24 px-4 py-8 max-w-2xl mx-auto space-y-6">
      <h1 className="text-3xl font-black text-slate-900 tracking-tight">Account & Settings</h1>

      {/* Profile Card Summary */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm flex items-center gap-4">
        <div className="h-16 w-16 bg-gradient-to-tr from-orange-500 to-amber-500 text-white font-black text-xl flex items-center justify-center rounded-2xl shadow-md shrink-0">
          {getInitials(dbUser?.name)}
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-black text-slate-800 leading-tight">{dbUser?.name}</h2>
          <div className="flex items-center gap-2">
            <span className="text-xs bg-orange-50 border border-orange-100 text-orange-600 px-2 py-0.5 rounded-lg font-extrabold flex items-center gap-1">
              <Shield className="h-3 w-3" />
              {userRole}
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-xs text-slate-400 font-bold flex items-center gap-1">
              <MapPin className="h-3.5 w-3.5 text-slate-300" />
              {campusName}
            </span>
          </div>
        </div>
      </div>

      {/* Edit Form */}
      <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-6">
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Personal Details</h3>
        
        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div>
            <label className="block text-2xs font-bold text-slate-400 uppercase mb-1.5">Full Name</label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <User className="h-4.5 w-4.5 text-slate-400" />
              </div>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="block w-full border border-slate-200 rounded-xl pl-10 pr-3 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 text-slate-800 font-semibold"
              />
            </div>
          </div>

          <div>
            <label className="block text-2xs font-bold text-slate-400 uppercase mb-1.5">Email Address</label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Mail className="h-4.5 w-4.5 text-slate-300" />
              </div>
              <input
                type="email"
                disabled
                value={dbUser?.email || ''}
                className="block w-full border border-slate-200 bg-slate-50 text-slate-400 rounded-xl pl-10 pr-3 py-2.5 text-sm cursor-not-allowed font-medium"
              />
            </div>
          </div>

          <div>
            <label className="block text-2xs font-bold text-slate-400 uppercase mb-1.5">Phone Number</label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                <Phone className="h-4.5 w-4.5 text-slate-400" />
              </div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="block w-full border border-slate-200 rounded-xl pl-10 pr-3 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 text-slate-800 font-semibold"
                placeholder="+91 98765 43210"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              disabled={updating}
              className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl py-2.5 px-6 text-xs font-black uppercase tracking-wider shadow-sm transition-all flex items-center gap-1.5"
            >
              {updating ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                'Save Profile'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Settings Options Card */}
      <div className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm divide-y divide-slate-100">
        
        {/* Notifications Toggle */}
        <div className="p-5 flex items-center justify-between">
          <div className="flex gap-3 items-center">
            <div className="p-2.5 rounded-xl bg-blue-50 text-blue-500 shrink-0">
              <Bell className="h-5 w-5" />
            </div>
            <div>
              <span className="font-extrabold text-sm text-slate-800 block">Push Notifications</span>
              <span className="text-3xs font-semibold text-slate-400">Receive real-time order status updates</span>
            </div>
          </div>
          
          <button
            onClick={handleNotificationToggle}
            className={`w-12 h-6.5 rounded-full p-1 transition-colors duration-200 focus:outline-none flex ${
              notificationsEnabled ? 'bg-orange-500 justify-end' : 'bg-slate-200 justify-start'
            }`}
          >
            <span className="w-4.5 h-4.5 rounded-full bg-white shadow-md block" />
          </button>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="p-5 flex items-center justify-between w-full hover:bg-rose-50/20 text-left transition-colors"
        >
          <div className="flex gap-3 items-center">
            <div className="p-2.5 rounded-xl bg-rose-50 text-rose-500 shrink-0">
              <LogOut className="h-5 w-5" />
            </div>
            <div>
              <span className="font-extrabold text-sm text-slate-800 block">Sign Out</span>
              <span className="text-3xs font-semibold text-slate-400">Logout of this device</span>
            </div>
          </div>
        </button>
      </div>

      {/* Vendor CTA card */}
      {['STUDENT', 'FACULTY'].includes(userRole) && (
        <div className="bg-gradient-to-r from-orange-500 to-amber-500 text-white rounded-2xl p-6 shadow-md flex items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-sm">
            <h3 className="font-black text-lg tracking-tight flex items-center gap-1.5">
              Own a Campus Canteen?
              <Store className="h-5 w-5" />
            </h3>
            <p className="text-2xs text-white/80 font-medium leading-relaxed">
              Register your canteen on CraveQuad to start accepting online orders from students and faculty on your campus.
            </p>
          </div>
          <Link 
            href="/vendor/register"
            className="bg-white text-orange-600 hover:bg-slate-50 font-black text-2xs uppercase tracking-wider py-2.5 px-4.5 rounded-xl shrink-0 shadow-sm transition-all"
          >
            Become a Vendor
          </Link>
        </div>
      )}
    </div>
  );
}
