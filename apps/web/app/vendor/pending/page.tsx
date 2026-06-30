'use client';

import React from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { Clock, AlertTriangle, XOctagon, LogOut, RefreshCw } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function VendorPendingPage() {
  const { dbUser, logout, refreshProfile } = useAuth();
  const router = useRouter();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  const status = dbUser?.vendor?.status || 'PENDING';

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 px-4 text-center">
      <div className="w-full max-w-md bg-white p-8 rounded-2xl border border-slate-200/80 shadow-xl space-y-6">
        
        {/* Status Render */}
        {status === 'PENDING' && (
          <div className="flex flex-col items-center">
            <div className="h-16 w-16 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-600 mb-4 animate-pulse">
              <Clock className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Review in Progress</h2>
            <p className="mt-2 text-sm text-slate-500">
              Your canteen registration for <span className="font-semibold text-slate-700">"{dbUser?.vendor?.businessName}"</span> is currently pending approval by the campus administrator.
            </p>
            <p className="mt-2 text-xs text-slate-400">
              We are verifying your license number and bank credentials. This usually takes less than 24 hours.
            </p>
          </div>
        )}

        {status === 'REJECTED' && (
          <div className="flex flex-col items-center">
            <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center text-red-600 mb-4">
              <XOctagon className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Registration Rejected</h2>
            <p className="mt-2 text-sm text-slate-500">
              We regret to inform you that your vendor application has been rejected by the administrator.
            </p>
            {dbUser?.notifications?.[0] && (
              <div className="mt-4 p-3 bg-red-50 border border-red-150 rounded-xl text-left text-xs text-red-700">
                <span className="font-semibold block mb-1">Reason:</span>
                {dbUser.notifications[0].body}
              </div>
            )}
          </div>
        )}

        {status === 'SUSPENDED' && (
          <div className="flex flex-col items-center">
            <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 mb-4">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <h2 className="text-2xl font-bold text-slate-800">Account Suspended</h2>
            <p className="mt-2 text-sm text-slate-500">
              Your vendor dashboard access has been suspended by the campus administrator.
            </p>
            <p className="mt-2 text-xs text-slate-400">
              Please contact the campus administration office to reactivate your portal.
            </p>
          </div>
        )}

        {status === 'APPROVED' && (
          <div className="flex flex-col items-center">
            <h2 className="text-2xl font-bold text-green-600">Application Approved!</h2>
            <p className="mt-2 text-sm text-slate-500">
              Your profile is verified. Click below to enter your manager dashboard.
            </p>
            <button
              onClick={() => router.push('/vendor/dashboard')}
              className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white rounded-xl py-2.5 font-semibold transition-colors"
            >
              Go to Dashboard
            </button>
          </div>
        )}

        {/* Buttons */}
        <div className="grid grid-cols-2 gap-4 border-t border-slate-100 pt-6">
          <button
            onClick={refreshProfile}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className="h-4 w-4" /> Check Status
          </button>
          
          <button
            onClick={handleLogout}
            className="flex items-center justify-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors"
          >
            <LogOut className="h-4 w-4" /> Logout
          </button>
        </div>
      </div>
    </div>
  );
}
