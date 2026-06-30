'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useRouter } from 'next/navigation';
import { 
  Building, 
  MapPin, 
  User, 
  ShieldAlert, 
  ShieldCheck, 
  Search, 
  Filter, 
  Loader2 
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface Vendor {
  id: string;
  businessName: string;
  description: string | null;
  status: string;
  avgRating: number;
  totalOrders: number;
  campus: { name: string };
  user: {
    name: string;
    email: string;
  };
}

export default function AdminVendorManagement() {
  const { user, dbUser } = useAuth();
  const router = useRouter();

  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  useEffect(() => {
    if (dbUser && dbUser.role !== 'ADMIN') {
      router.push('/');
    }
  }, [dbUser, router]);

  const loadVendors = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const token = await user.getIdToken();
      
      // Query all vendors
      const res = await fetch(`${API_URL}/vendors`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setVendors(data);
      }
    } catch (err) {
      console.error('Failed to load vendors list:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVendors();
  }, [user]);

  const handleToggleStatus = async (id: string, currentStatus: string) => {
    if (!user) return;
    setActioningId(id);
    const newStatus = currentStatus === 'APPROVED' ? 'SUSPENDED' : 'APPROVED';
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_URL}/vendors/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      });

      if (res.ok) {
        // Update status locally
        setVendors((prev) => 
          prev.map((v) => v.id === id ? { ...v, status: newStatus } : v)
        );
      }
    } catch (err) {
      console.error('Status toggle failed:', err);
    } finally {
      setActioningId(null);
    }
  };

  const filteredVendors = vendors.filter((v) => {
    const matchesStatus = statusFilter === '' || v.status === statusFilter;
    const matchesSearch = v.businessName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          v.user.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-10 w-10 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto w-full space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center bg-white border border-slate-200 p-6 rounded-2xl shadow-sm">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">Vendor Management</h1>
            <p className="text-sm text-slate-500 mt-1">Suspend, reactivate, or audit all approved and suspended canteens.</p>
          </div>
          <button 
            onClick={() => router.push('/admin/vendors')}
            className="text-xs font-semibold text-orange-500 hover:text-orange-600 transition-colors border border-orange-200 bg-orange-50 px-3 py-1.5 rounded-xl"
          >
            Review Pending Queue
          </button>
        </div>

        {/* Filter controls */}
        <div className="bg-white border border-slate-200 p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row gap-4 justify-between items-center">
          {/* Search bar */}
          <div className="relative w-full sm:max-w-xs">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full rounded-xl border border-slate-300 pl-9 pr-3 py-2 text-sm outline-none focus:border-orange-500"
              placeholder="Search canteen or owner..."
            />
          </div>

          {/* Status filter dropdown */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="h-4 w-4 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="block w-full sm:w-auto rounded-xl border border-slate-300 px-3 py-2 text-sm outline-none focus:border-orange-500 bg-white"
            >
              <option value="">All Statuses</option>
              <option value="APPROVED">Approved / Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="REJECTED">Rejected</option>
              <option value="PENDING">Pending</option>
            </select>
          </div>
        </div>

        {/* Vendors List Table */}
        {filteredVendors.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400">
            <Building className="mx-auto h-12 w-12 text-slate-200 mb-4" />
            No vendors match the search or filter criteria.
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Canteen</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Owner</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Campus</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Sales / Rating</th>
                  <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 bg-white">
                {filteredVendors.map((vendor) => (
                  <tr key={vendor.id}>
                    <td className="px-6 py-4">
                      <div className="text-sm font-semibold text-slate-800">{vendor.businessName}</div>
                      <div className="text-xs text-slate-400 line-clamp-1">{vendor.description}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-800">{vendor.user.name}</div>
                      <div className="text-xs text-slate-400">{vendor.user.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 text-xs text-slate-600 font-medium">
                        <MapPin className="h-3 w-3" /> {vendor.campus.name}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-slate-800">{vendor.totalOrders} Orders</div>
                      <div className="text-xs text-orange-500 font-semibold">{vendor.avgRating} ★</div>
                    </td>
                    <td className="px-6 py-4">
                      <span 
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                          vendor.status === 'APPROVED' 
                            ? 'bg-green-50 text-green-700' 
                            : vendor.status === 'SUSPENDED'
                            ? 'bg-slate-100 text-slate-700'
                            : 'bg-red-50 text-red-700'
                        }`}
                      >
                        {vendor.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      {vendor.status === 'APPROVED' && (
                        <button
                          onClick={() => handleToggleStatus(vendor.id, 'APPROVED')}
                          disabled={actioningId === vendor.id}
                          className="inline-flex items-center gap-1 border border-slate-200 hover:bg-red-50 text-red-600 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors disabled:opacity-50"
                        >
                          <ShieldAlert className="h-3.5 w-3.5" /> Suspend
                        </button>
                      )}
                      {vendor.status === 'SUSPENDED' && (
                        <button
                          onClick={() => handleToggleStatus(vendor.id, 'SUSPENDED')}
                          disabled={actioningId === vendor.id}
                          className="inline-flex items-center gap-1 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" /> Reactivate
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>
    </div>
  );
}
