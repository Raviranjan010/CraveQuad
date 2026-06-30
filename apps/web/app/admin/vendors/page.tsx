'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useRouter } from 'next/navigation';
import { 
  Building, 
  Check, 
  X, 
  FileText, 
  MapPin, 
  Mail, 
  Phone, 
  Loader2, 
  Bell
} from 'lucide-react';
import { socket } from '../../../lib/socket';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface VendorOnboardingRequest {
  id: string;
  businessName: string;
  description: string | null;
  status: string;
  campus: { name: string };
  openingHours: any; // Contains schedule, licenseNumber, bankDetails
  user: {
    name: string;
    email: string;
    phone: string | null;
  };
}

export default function AdminOnboardingQueue() {
  const { user, dbUser } = useAuth();
  const router = useRouter();

  const [requests, setRequests] = useState<VendorOnboardingRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [activeRejectId, setActiveRejectId] = useState<string | null>(null);
  const [liveAlert, setLiveAlert] = useState(false);

  useEffect(() => {
    // Restrict access if not ADMIN
    if (dbUser && dbUser.role !== 'ADMIN') {
      router.push('/');
    }
  }, [dbUser, router]);

  const loadRequests = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const token = await user.getIdToken();
      const res = await fetch(`${API_URL}/vendors?status=PENDING`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch (err) {
      console.error('Failed to load pending vendors:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();

    // Configure Socket.IO listener for real-time onboarding notifications
    socket.connect();
    socket.emit('join:admin');

    socket.on('vendor:registered', (newVendor: any) => {
      console.log('Received real-time vendor:registered socket event:', newVendor);
      setLiveAlert(true);
      
      // Append the new vendor live to the queue
      setRequests((prev) => {
        // Prevent duplicate appending
        if (prev.some((req) => req.id === newVendor.id)) return prev;
        return [newVendor, ...prev];
      });

      // Clear sound/banner alert after 5s
      setTimeout(() => setLiveAlert(false), 5000);
    });

    return () => {
      socket.off('vendor:registered');
    };
  }, [user]);

  const handleApprove = async (id: string) => {
    if (!user) return;
    setActioningId(id);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_URL}/vendors/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: 'APPROVED',
        }),
      });

      if (res.ok) {
        // Remove from pending list
        setRequests((prev) => prev.filter((r) => r.id !== id));
      }
    } catch (err) {
      console.error('Approval failed:', err);
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!user || !rejectionReason) return;
    setActioningId(id);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_URL}/vendors/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: 'REJECTED',
          rejectionReason,
        }),
      });

      if (res.ok) {
        setRequests((prev) => prev.filter((r) => r.id !== id));
        setActiveRejectId(null);
        setRejectionReason('');
      }
    } catch (err) {
      console.error('Rejection failed:', err);
    } finally {
      setActioningId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-10 w-10 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto w-full space-y-6">
        
        {/* Header banner */}
        <div className="flex justify-between items-center bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Onboarding Queue</h1>
            <p className="text-sm text-slate-500 mt-1">Verify licenses and bank details to approve campus vendor operations.</p>
          </div>
          <button 
            onClick={() => router.push('/admin/management')}
            className="text-xs font-semibold text-orange-500 hover:text-orange-600 transition-colors border border-orange-200 bg-orange-50 px-3 py-1.5 rounded-xl"
          >
            Manage Approved Vendors
          </button>
        </div>

        {/* Real-time Toast Alert */}
        {liveAlert && (
          <div className="flex items-center gap-3 rounded-xl bg-orange-50 border border-orange-200 p-4 text-sm text-orange-800 animate-bounce">
            <Bell className="h-5 w-5 text-orange-500 animate-swing" />
            <span className="font-semibold">New Vendor Alert:</span> A canteen has just signed up and has been added to the list in real-time.
          </div>
        )}

        {/* Request cards list */}
        {requests.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400">
            <Building className="mx-auto h-12 w-12 text-slate-200 mb-4" />
            <span className="font-medium">No pending vendor approvals.</span> All canteens are processed.
          </div>
        ) : (
          <div className="space-y-6">
            {requests.map((req) => (
              <div key={req.id} className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="p-6 space-y-4">
                  {/* Shop Details */}
                  <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                    <div>
                      <h2 className="text-xl font-bold text-slate-800">{req.businessName}</h2>
                      <p className="text-sm text-slate-500 mt-0.5">{req.description || 'No description provided.'}</p>
                      <div className="flex items-center gap-1.5 mt-2 text-xs font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded w-fit">
                        <MapPin className="h-3 w-3" /> {req.campus?.name}
                      </div>
                    </div>
                  </div>

                  {/* Owner & Compliance details grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-slate-600">
                    <div>
                      <h3 className="font-semibold text-slate-800 text-xs uppercase tracking-wider mb-2">Contact Details</h3>
                      <p className="flex items-center gap-1.5"><User className="h-4 w-4 text-slate-400" /> {req.user.name}</p>
                      <p className="flex items-center gap-1.5 mt-1"><Mail className="h-4 w-4 text-slate-400" /> {req.user.email}</p>
                      {req.user.phone && <p className="flex items-center gap-1.5 mt-1"><Phone className="h-4 w-4 text-slate-400" /> {req.user.phone}</p>}
                    </div>

                    <div>
                      <h3 className="font-semibold text-slate-800 text-xs uppercase tracking-wider mb-2">Compliance</h3>
                      <p className="flex items-center gap-1.5">
                        <FileText className="h-4 w-4 text-slate-400" /> 
                        License: <span className="font-semibold text-slate-700">{req.openingHours?.licenseNumber || 'N/A'}</span>
                      </p>
                      <p className="flex items-center gap-1.5 mt-1">
                        <Clock className="h-4 w-4 text-slate-400" />
                        Hours: {req.openingHours?.schedule?.openingTime} - {req.openingHours?.schedule?.closingTime}
                      </p>
                    </div>
                  </div>

                  {/* Secure Payout Details */}
                  {req.openingHours?.bankDetails && (
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-xs">
                      <h4 className="font-bold text-slate-700 mb-2">Financial Payout Accounts</h4>
                      <div className="grid grid-cols-2 gap-2 text-slate-600">
                        <p>Bank: <span className="font-semibold text-slate-800">{req.openingHours.bankDetails.bankName}</span></p>
                        <p>IFSC: <span className="font-semibold text-slate-800">{req.openingHours.bankDetails.ifscCode}</span></p>
                        <p>A/C: <span className="font-semibold text-slate-800">{req.openingHours.bankDetails.accountNumber}</span></p>
                        <p>UPI ID: <span className="font-semibold text-slate-800">{req.openingHours.bankDetails.upiId}</span></p>
                      </div>
                    </div>
                  )}

                  {/* Rejection input */}
                  {activeRejectId === req.id && (
                    <div className="space-y-2 border-t border-slate-100 pt-4">
                      <label className="block text-xs font-semibold text-red-600">Rejection Reason</label>
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Please input the reason for rejecting this canteen registration..."
                        rows={2}
                        className="block w-full border border-red-200 bg-red-50/20 text-slate-800 rounded-xl p-3 text-sm outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                      />
                    </div>
                  )}

                  {/* Action Controls */}
                  <div className="flex justify-end gap-3 border-t border-slate-100 pt-4">
                    {activeRejectId === req.id ? (
                      <>
                        <button
                          onClick={() => {
                            setActiveRejectId(null);
                            setRejectionReason('');
                          }}
                          className="px-4 py-2 border border-slate-300 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-50 transition-colors"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleReject(req.id)}
                          disabled={actioningId === req.id || !rejectionReason}
                          className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-semibold disabled:opacity-50 transition-all"
                        >
                          Submit Rejection
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setActiveRejectId(req.id)}
                          className="flex items-center gap-1 border border-red-200 text-red-600 hover:bg-red-50 px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
                        >
                          <X className="h-3.5 w-3.5" /> Reject Application
                        </button>
                        <button
                          onClick={() => handleApprove(req.id)}
                          disabled={actioningId === req.id}
                          className="flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-xs font-semibold transition-all shadow shadow-green-600/10"
                        >
                          <Check className="h-3.5 w-3.5" /> Approve Canteen
                        </button>
                      </>
                    )}
                  </div>

                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
