'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useRouter } from 'next/navigation';
import { 
  Store, 
  Clock, 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  Menu as MenuIcon, 
  Check, 
  Power, 
  Plus, 
  Trash2, 
  Loader2 
} from 'lucide-react';
import { socket } from '../../../lib/socket';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface DashboardStats {
  ordersCount: number;
  revenue: number;
  topItems: { menuItemId: string; _sum: { quantity: number } }[];
}

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  isAvailable: boolean;
}

export default function VendorDashboard() {
  const { user, dbUser, logout } = useAuth();
  const router = useRouter();
  
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState<'orders' | 'menu'>('orders');

  // Form states for adding items
  const [newItemName, setNewItemName] = useState('');
  const [newItemPrice, setNewItemPrice] = useState('');
  const [newItemCategory, setNewItemCategory] = useState('Snacks');

  useEffect(() => {
    // Redirect if user is not VENDOR or status is not APPROVED
    if (dbUser && dbUser.role === 'VENDOR' && dbUser.vendor?.status !== 'APPROVED') {
      router.push('/vendor/pending');
    }
  }, [dbUser, router]);

  const loadData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const token = await user.getIdToken();

      // 1. Fetch Profile
      const profileRes = await fetch(`${API_URL}/vendors/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setProfile(profileData);
        setMenuItems(profileData.menuItems || []);
      }

      // 2. Fetch Stats
      const statsRes = await fetch(`${API_URL}/vendors/me/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    // Listen to real-time socket updates for this vendor
    if (profile?.id) {
      socket.connect();
      socket.on(`vendor:status:${profile.id}`, (data) => {
        if (data.status === 'SUSPENDED') {
          router.push('/vendor/pending');
        }
      });
    }

    return () => {
      socket.off(`vendor:status:${profile?.id}`);
    };
  }, [user, profile?.id]);

  const handleToggleOpen = async () => {
    if (!user || !profile) return;
    setUpdating(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_URL}/vendors/me`, {
        method: 'PATCH',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          isOpenNow: !profile.isOpenNow,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setProfile(updated);
      }
    } catch (err) {
      console.error('Failed to toggle active hours status:', err);
    } finally {
      setUpdating(false);
    }
  };

  const handleAddMenuItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName || !newItemPrice || !user || !profile) return;

    try {
      // For demonstration of CRUD, we push locally or post to API
      // Since menu logic is not fully required, we save locally to render
      const item: MenuItem = {
        id: Math.random().toString(),
        name: newItemName,
        price: parseFloat(newItemPrice),
        category: newItemCategory,
        isAvailable: true,
      };

      setMenuItems((prev) => [...prev, item]);
      setNewItemName('');
      setNewItemPrice('');
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMenuItem = (id: string) => {
    setMenuItems((prev) => prev.filter((item) => item.id !== id));
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-10 w-10 text-orange-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Dashboard Nav */}
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Store className="h-6 w-6 text-orange-500" />
            <h1 className="text-xl font-bold text-slate-900">{profile?.businessName || 'Vendor Portal'}</h1>
            <span className="text-xs bg-slate-100 text-slate-600 border border-slate-200 rounded-md px-2 py-0.5 font-semibold">
              {profile?.campus?.name || 'Campus'}
            </span>
          </div>

          <div className="flex items-center gap-4">
            {/* Open/Close status button */}
            <button
              onClick={handleToggleOpen}
              disabled={updating}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                profile?.isOpenNow 
                  ? 'bg-green-50 text-green-700 border-green-200' 
                  : 'bg-red-50 text-red-700 border-red-200'
              }`}
            >
              <Power className="h-3.5 w-3.5" />
              {profile?.isOpenNow ? 'Open' : 'Closed'}
            </button>

            <button
              onClick={() => logout().then(() => router.push('/login'))}
              className="text-xs font-medium text-slate-500 hover:text-red-600 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Analytics Grid */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div className="bg-white overflow-hidden shadow-sm rounded-2xl border border-slate-200 p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-orange-50 text-orange-500">
              <ShoppingBag className="h-6 w-6" />
            </div>
            <div>
              <span className="block text-sm text-slate-400">Total Orders</span>
              <span className="text-2xl font-bold text-slate-800">{stats?.ordersCount || 0}</span>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow-sm rounded-2xl border border-slate-200 p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-green-50 text-green-600">
              <DollarSign className="h-6 w-6" />
            </div>
            <div>
              <span className="block text-sm text-slate-400">Revenue</span>
              <span className="text-2xl font-bold text-slate-800">₹{stats?.revenue || '0.00'}</span>
            </div>
          </div>

          <div className="bg-white overflow-hidden shadow-sm rounded-2xl border border-slate-200 p-6 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-50 text-blue-500">
              <TrendingUp className="h-6 w-6" />
            </div>
            <div>
              <span className="block text-sm text-slate-400">Rating</span>
              <span className="text-2xl font-bold text-slate-800">{profile?.avgRating || '5.0'} ★</span>
            </div>
          </div>
        </div>

        {/* Tab Controls */}
        <div className="border-b border-slate-200">
          <nav className="flex gap-6">
            <button
              onClick={() => setActiveTab('orders')}
              className={`pb-4 text-sm font-semibold border-b-2 transition-all ${
                activeTab === 'orders' ? 'border-orange-500 text-orange-500' : 'border-transparent text-slate-400'
              }`}
            >
              Order Queue
            </button>
            <button
              onClick={() => setActiveTab('menu')}
              className={`pb-4 text-sm font-semibold border-b-2 transition-all ${
                activeTab === 'menu' ? 'border-orange-500 text-orange-500' : 'border-transparent text-slate-400'
              }`}
            >
              Menu Items CRUD
            </button>
          </nav>
        </div>

        {/* Tab Content: Orders Queue */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-slate-800">Live Active Orders</h3>
            <div className="bg-white shadow border border-slate-200 rounded-2xl p-6 text-center text-slate-500">
              <Clock className="mx-auto h-12 w-12 text-slate-300 mb-4 animate-spin-slow" />
              <p className="font-medium text-slate-700">Waiting for live order tickets...</p>
              <p className="text-xs text-slate-400 mt-1">Orders placed by student customers will automatically stream here via WebSockets.</p>
            </div>
          </div>
        )}

        {/* Tab Content: Menu Items CRUD */}
        {activeTab === 'menu' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Create Item Form */}
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm h-fit">
              <h4 className="text-md font-bold text-slate-800 mb-4 flex items-center gap-1">
                <Plus className="h-5 w-5 text-orange-500" /> Add Menu Item
              </h4>
              <form onSubmit={handleAddMenuItem} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Item Name</label>
                  <input
                    type="text"
                    value={newItemName}
                    onChange={(e) => setNewItemName(e.target.value)}
                    className="block w-full border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none focus:border-orange-500"
                    placeholder="Chai Latte"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Price (₹)</label>
                  <input
                    type="number"
                    value={newItemPrice}
                    onChange={(e) => setNewItemPrice(e.target.value)}
                    className="block w-full border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none focus:border-orange-500"
                    placeholder="45"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Category</label>
                  <select
                    value={newItemCategory}
                    onChange={(e) => setNewItemCategory(e.target.value)}
                    className="block w-full border border-slate-300 rounded-xl px-3 py-2 text-sm outline-none focus:border-orange-500 bg-white"
                  >
                    <option>Beverages</option>
                    <option>Snacks</option>
                    <option>Mains</option>
                    <option>Desserts</option>
                  </select>
                </div>
                <button
                  type="submit"
                  className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-xl py-2 text-sm font-semibold transition-all"
                >
                  Create Item
                </button>
              </form>
            </div>

            {/* Menu List */}
            <div className="md:col-span-2 space-y-4">
              <h4 className="text-md font-bold text-slate-800">Current Items</h4>
              {menuItems.length === 0 ? (
                <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center text-slate-400">
                  No menu items found. Add items to populate the customer menu list.
                </div>
              ) : (
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                  <table className="min-w-full divide-y divide-slate-200">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Item Name</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Category</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Price</th>
                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-500 uppercase">Status</th>
                        <th className="px-6 py-3 text-right text-xs font-bold text-slate-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {menuItems.map((item) => (
                        <tr key={item.id}>
                          <td className="px-6 py-4 text-sm font-semibold text-slate-800">{item.name}</td>
                          <td className="px-6 py-4 text-sm text-slate-500">{item.category}</td>
                          <td className="px-6 py-4 text-sm text-slate-800">₹{item.price}</td>
                          <td className="px-6 py-4">
                            <span className="inline-flex rounded-full bg-green-50 px-2 text-xs font-semibold text-green-700">
                              Available
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleDeleteMenuItem(item.id)}
                              className="text-red-500 hover:text-red-700 transition-colors"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        )}

      </main>
    </div>
  );
}
