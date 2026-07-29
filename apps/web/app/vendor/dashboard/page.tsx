'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useRouter } from 'next/navigation';
import { 
  Store, 
  Clock, 
  TrendingUp, 
  DollarSign, 
  ShoppingBag, 
  Power, 
  Plus, 
  Trash2, 
  Edit3,
  Check,
  X,
  Loader2,
  AlertCircle,
  Upload,
  Calendar,
  BarChart2,
  Layers,
  Sparkles,
  ChevronRight,
  User,
  MapPin,
  CreditCard,
  Volume2
} from 'lucide-react';
import { socket } from '../../../lib/socket';
import { useToast } from '../../../hooks/use-toast';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import app from '../../../lib/firebase';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer, 
  Legend 
} from 'recharts';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const storage = getStorage(app);

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  prepTimeMinutes: number;
  isVeg: boolean;
  isAvailable: boolean;
  discountPercent?: number | null;
  imageUrl?: string | null;
  categoryId: string;
  category?: {
    id: string;
    name: string;
  };
}

interface MenuCategory {
  id: string;
  name: string;
}

interface OrderItem {
  id: string;
  quantity: number;
  priceAtOrder: number;
  menuItem: {
    name: string;
    isVeg: boolean;
  };
}

interface Order {
  id: string;
  userId: string;
  status: 'PLACED' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';
  totalAmount: number;
  deliveryFee: number;
  discountAmount: number;
  paymentStatus: 'PENDING' | 'COMPLETED' | 'FAILED';
  deliveryAddress: string;
  deliverySlot?: string;
  createdAt: string;
  user: {
    name: string;
  };
  items: OrderItem[];
  payment?: {
    method?: string;
  };
  deliveryPartnerId?: string | null;
}

interface DashboardStats {
  ordersCount: number;
  revenue: number;
  topItems: { menuItemId: string; _sum: { quantity: number } }[];
}

interface AnalyticsData {
  dailyData: { date: string; revenue: number; orders: number }[];
  topItems: { name: string; quantity: number }[];
}

export default function VendorDashboard() {
  const { user, dbUser, logout } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [profile, setProfile] = useState<any>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [activeOrders, setActiveOrders] = useState<Order[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsRange, setAnalyticsRange] = useState<'7d' | '30d'>('7d');
  
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [activeTab, setActiveTab] = useState<'orders' | 'menu' | 'profile' | 'analytics'>('orders');
  const [mounted, setMounted] = useState(false);

  // Audio elements
  const audioContextRef = useRef<AudioContext | null>(null);

  // Live order highlighting
  const [newOrderIds, setNewOrderIds] = useState<Set<string>>(new Set());

  // Rejection reason modal
  const [rejectingOrder, setRejectingOrder] = useState<Order | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  // MenuItem form state (Add/Edit)
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [menuFormName, setMenuFormName] = useState('');
  const [menuFormDescription, setMenuFormDescription] = useState('');
  const [menuFormPrice, setMenuFormPrice] = useState('');
  const [menuFormPrepTime, setMenuFormPrepTime] = useState('10');
  const [menuFormIsVeg, setMenuFormIsVeg] = useState(true);
  const [menuFormDiscount, setMenuFormDiscount] = useState('');
  const [menuFormCategoryId, setMenuFormCategoryId] = useState('');
  const [menuFormNewCategory, setMenuFormNewCategory] = useState('');
  const [menuFormFile, setMenuFormFile] = useState<File | null>(null);
  const [menuFormUploading, setMenuFormUploading] = useState(false);

  // Category management modal/inline states
  const [newCatName, setNewCatName] = useState('');
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(null);
  const [editingCatName, setEditingCatName] = useState('');

  // Delete confirmation modal states
  const [itemToDelete, setItemToDelete] = useState<MenuItem | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<MenuCategory | null>(null);

  // Profile forms
  const [profileName, setProfileName] = useState('');
  const [profileDesc, setProfileDesc] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const [bannerUploading, setBannerUploading] = useState(false);
  
  // Weekly opening hours
  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const [openingHours, setOpeningHours] = useState<Record<string, { open: boolean; from: string; to: string }>>({
    monday: { open: true, from: '09:00', to: '22:00' },
    tuesday: { open: true, from: '09:00', to: '22:00' },
    wednesday: { open: true, from: '09:00', to: '22:00' },
    thursday: { open: true, from: '09:00', to: '22:00' },
    friday: { open: true, from: '09:00', to: '22:00' },
    saturday: { open: true, from: '09:00', to: '22:00' },
    sunday: { open: false, from: '09:00', to: '22:00' },
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (dbUser && dbUser.role === 'VENDOR' && dbUser.vendor?.status !== 'APPROVED') {
      router.push('/vendor/pending');
    }
  }, [dbUser, router]);

  const loadData = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const token = await user.getIdToken();

      // 1. Fetch Profile (with menuItems & categories loaded via updated NestJS query)
      const profileRes = await fetch(`${API_URL}/vendors/me`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setProfile(profileData);
        setMenuItems(profileData.menuItems || []);
        setCategories(profileData.menuCategories || []);
        setProfileName(profileData.businessName || '');
        setProfileDesc(profileData.description || '');
        if (profileData.openingHours) {
          setOpeningHours(profileData.openingHours);
        }
      }

      // 2. Fetch Stats
      const statsRes = await fetch(`${API_URL}/vendors/me/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      // 3. Fetch Active Orders
      const ordersRes = await fetch(`${API_URL}/orders/vendor/active`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (ordersRes.ok) {
        const ordersData = await ordersRes.json();
        setActiveOrders(ordersData);
      }

      // 4. Fetch Analytics
      await fetchAnalytics(analyticsRange, token);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async (range: '7d' | '30d', customToken?: string) => {
    try {
      const token = customToken || (await user?.getIdToken());
      if (!token) return;
      const res = await fetch(`${API_URL}/vendors/me/analytics?range=${range}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (err) {
      console.error('Failed to fetch analytics data:', err);
    }
  };

  useEffect(() => {
    if (activeTab === 'analytics') {
      fetchAnalytics(analyticsRange);
    }
  }, [analyticsRange, activeTab]);

  const playSoftPing = () => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioCtx();
      }
      const ctx = audioContextRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }

      // Play soft dual-tone ping
      const now = ctx.currentTime;
      
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now); // A5
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1109.73, now); // C#6
      
      gainNode.gain.setValueAtTime(0, now);
      gainNode.gain.linearRampToValueAtTime(0.25, now + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      
      osc1.start(now);
      osc2.start(now);
      
      osc1.stop(now + 0.6);
      osc2.stop(now + 0.6);
    } catch (e) {
      console.warn('Audio feedback failed:', e);
    }
  };

  useEffect(() => {
    loadData();

    if (profile?.id) {
      socket.connect();
      socket.emit('join:vendor', { vendorId: profile.id });

      // Realtime new orders handler
      socket.on('order:placed', (order: Order) => {
        playSoftPing();
        setActiveOrders((prev) => {
          // Prevent duplicates
          if (prev.some((o) => o.id === order.id)) return prev;
          return [order, ...prev];
        });
        
        setNewOrderIds((prev) => {
          const next = new Set(prev);
          next.add(order.id);
          return next;
        });
        
        toast({
          title: "🔔 New Order Received!",
          description: `Order from ${order.user.name} of ₹${order.totalAmount} has been placed.`,
        });

        // Remove highlights after 8 seconds
        setTimeout(() => {
          setNewOrderIds((prev) => {
            const next = new Set(prev);
            next.delete(order.id);
            return next;
          });
        }, 8000);
      });

      // Socket account state listener
      socket.on(`vendor:status:${profile.id}`, (data) => {
        if (data.status === 'SUSPENDED') {
          router.push('/vendor/pending');
        }
      });
    }

    return () => {
      socket.off('order:placed');
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
        toast({
          title: updated.isOpenNow ? "Restaurant Opened" : "Restaurant Closed",
          description: `Successfully toggled shop availability status.`,
        });
      }
    } catch (err) {
      console.error('Failed to toggle open status:', err);
    } finally {
      setUpdating(false);
    }
  };

  const handleOrderStatusUpdate = async (orderId: string, status: Order['status']) => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_URL}/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        toast({
          title: `Status Updated`,
          description: `Order status set to ${status}.`,
        });
        
        // Remove or update the order from active orders list locally
        if (['DELIVERED', 'CANCELLED'].includes(status)) {
          setActiveOrders((prev) => prev.filter((o) => o.id !== orderId));
        } else {
          setActiveOrders((prev) => 
            prev.map((o) => o.id === orderId ? { ...o, status } : o)
          );
        }
      } else {
        const data = await res.json();
        toast({
          variant: "destructive",
          title: "Update Failed",
          description: data.message || "Failed to update order status.",
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const submitRejection = async () => {
    if (!rejectingOrder) return;
    await handleOrderStatusUpdate(rejectingOrder.id, 'CANCELLED');
    toast({
      title: "Order Rejected",
      description: `Reason: ${rejectionReason || "Not specified"}`,
    });
    setRejectingOrder(null);
    setRejectionReason('');
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim() || !user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_URL}/menu/categories`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newCatName.trim() }),
      });
      if (res.ok) {
        const cat = await res.json();
        setCategories((prev) => [...prev, cat]);
        setNewCatName('');
        toast({
          title: "Category Created",
          description: `"${cat.name}" has been added.`,
        });
      } else {
        const errData = await res.json();
        toast({
          variant: "destructive",
          title: "Error",
          description: errData.message || "Could not add category",
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateCategory = async (categoryId: string) => {
    if (!editingCatName.trim() || !user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_URL}/menu/categories/${categoryId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: editingCatName.trim() }),
      });
      if (res.ok) {
        setCategories((prev) => prev.map((c) => c.id === categoryId ? { ...c, name: editingCatName.trim() } : c));
        setMenuItems((prev) => prev.map((item) => item.categoryId === categoryId ? { ...item, category: { ...item.category!, name: editingCatName.trim() } } : item));
        setEditingCategory(null);
        setEditingCatName('');
        toast({
          title: "Category Renamed",
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteCategory = (category: MenuCategory) => {
    setCategoryToDelete(category);
  };

  const confirmDeleteCategory = async () => {
    if (!categoryToDelete || !user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_URL}/menu/categories/${categoryToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setCategories((prev) => prev.filter((c) => c.id !== categoryToDelete.id));
        setMenuItems((prev) => prev.filter((item) => item.categoryId !== categoryToDelete.id));
        toast({
          title: "Category Deleted",
          description: `Category "${categoryToDelete.name}" was successfully removed.`,
        });
      } else {
        const data = await res.json();
        toast({
          variant: "destructive",
          title: "Delete Failed",
          description: data.message || "Could not delete category.",
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setCategoryToDelete(null);
    }
  };

  const handleToggleItemAvailability = async (item: MenuItem) => {
    if (!user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_URL}/menu/${item.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isAvailable: !item.isAvailable }),
      });
      if (res.ok) {
        setMenuItems((prev) => prev.map((i) => i.id === item.id ? { ...i, isAvailable: !item.isAvailable } : i));
        toast({
          title: "Availability Updated",
          description: `"${item.name}" is now ${!item.isAvailable ? 'available' : 'unavailable'}.`,
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteMenuItem = (item: MenuItem) => {
    setItemToDelete(item);
  };

  const confirmDeleteMenuItem = async () => {
    if (!itemToDelete || !user) return;
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_URL}/menu/${itemToDelete.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setMenuItems((prev) => prev.filter((item) => item.id !== itemToDelete.id));
        toast({
          title: "Item Deleted",
          description: `"${itemToDelete.name}" was successfully removed.`,
        });
      } else {
        const data = await res.json();
        toast({
          variant: "destructive",
          title: "Delete Failed",
          description: data.message || "Could not delete item.",
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setItemToDelete(null);
    }
  };

  const resetMenuForm = () => {
    setEditingItem(null);
    setMenuFormName('');
    setMenuFormDescription('');
    setMenuFormPrice('');
    setMenuFormPrepTime('10');
    setMenuFormIsVeg(true);
    setMenuFormDiscount('');
    setMenuFormCategoryId('');
    setMenuFormNewCategory('');
    setMenuFormFile(null);
  };

  const handleEditClick = (item: MenuItem) => {
    setEditingItem(item);
    setMenuFormName(item.name);
    setMenuFormDescription(item.description || '');
    setMenuFormPrice(item.price.toString());
    setMenuFormPrepTime(item.prepTimeMinutes.toString());
    setMenuFormIsVeg(item.isVeg);
    setMenuFormDiscount(item.discountPercent?.toString() || '');
    setMenuFormCategoryId(item.categoryId);
    setMenuFormNewCategory('');
    window.scrollTo({ top: 300, behavior: 'smooth' });
  };

  const handleMenuItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!menuFormName.trim() || !menuFormPrice || !user || !profile) return;

    setMenuFormUploading(true);
    try {
      const token = await user.getIdToken();
      
      // Determine categoryId or create new category first
      let finalCategoryId = menuFormCategoryId;
      if (!finalCategoryId && menuFormNewCategory.trim()) {
        const catRes = await fetch(`${API_URL}/menu/categories`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ name: menuFormNewCategory.trim() }),
        });
        if (catRes.ok) {
          const newCat = await catRes.json();
          setCategories((prev) => [...prev, newCat]);
          finalCategoryId = newCat.id;
        }
      }

      if (!finalCategoryId) {
        toast({
          variant: "destructive",
          title: "Validation Error",
          description: "Please select or type a menu category.",
        });
        setMenuFormUploading(false);
        return;
      }

      const bodyData: any = {
        name: menuFormName.trim(),
        description: menuFormDescription.trim(),
        price: parseFloat(menuFormPrice),
        prepTimeMinutes: parseInt(menuFormPrepTime, 10),
        isVeg: menuFormIsVeg,
        discountPercent: menuFormDiscount ? parseFloat(menuFormDiscount) : null,
        categoryId: finalCategoryId,
      };

      let savedItem: MenuItem;

      if (editingItem) {
        // Edit flow
        const res = await fetch(`${API_URL}/menu/${editingItem.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(bodyData),
        });
        if (res.ok) {
          savedItem = await res.json();
          setMenuItems((prev) => prev.map((i) => i.id === editingItem.id ? savedItem : i));
          toast({
            title: "Item Updated",
            description: `"${savedItem.name}" was successfully saved.`,
          });
        } else {
          throw new Error('Failed to update menu item.');
        }
      } else {
        // Add flow
        const res = await fetch(`${API_URL}/menu`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(bodyData),
        });
        if (res.ok) {
          savedItem = await res.json();
          setMenuItems((prev) => [savedItem, ...prev]);
          toast({
            title: "Item Added",
            description: `"${savedItem.name}" was added to your menu.`,
          });
        } else {
          throw new Error('Failed to create menu item.');
        }
      }

      // Handle Image Upload if file is present
      if (menuFormFile && savedItem) {
        const itemImageRef = ref(storage, `vendors/${profile.id}/items/${savedItem.id}.jpg`);
        let downloadUrl = '';
        try {
          await uploadBytes(itemImageRef, menuFormFile);
          downloadUrl = await getDownloadURL(itemImageRef);
        } catch (storageErr) {
          console.warn("Storage upload failed, using high-quality food placeholder:", storageErr);
          // Fallback image URL
          downloadUrl = `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60`;
        }

        try {
          // Save image URL
          const imgPatchRes = await fetch(`${API_URL}/menu/${savedItem.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ imageUrl: downloadUrl }),
          });
          if (imgPatchRes.ok) {
            const finalItem = await imgPatchRes.json();
            setMenuItems((prev) => prev.map((i) => i.id === finalItem.id ? finalItem : i));
          }
        } catch (patchErr) {
          console.error("Failed to patch image URL:", patchErr);
        }
      }

      resetMenuForm();
    } catch (err: any) {
      console.error(err);
      toast({
        variant: "destructive",
        title: "Error Saving Item",
        description: err.message || "Something went wrong.",
      });
    } finally {
      setMenuFormUploading(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim() || !user || !profile) return;
    setUpdating(true);

    try {
      const token = await user.getIdToken();
      let updatedLogoUrl = profile.logoUrl;
      let updatedBannerUrl = profile.bannerUrl;

      // 1. Upload Logo if selected
      if (logoFile) {
        setLogoUploading(true);
        const logoRef = ref(storage, `vendors/${profile.id}/logos/logo_${Date.now()}.jpg`);
        try {
          await uploadBytes(logoRef, logoFile);
          updatedLogoUrl = await getDownloadURL(logoRef);
        } catch (err) {
          console.warn("Logo upload failed, using mock logo:", err);
          updatedLogoUrl = `https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200&auto=format&fit=crop&q=60`;
        }
        setLogoUploading(false);
      }

      // 2. Upload Banner if selected
      if (bannerFile) {
        setBannerUploading(true);
        const bannerRef = ref(storage, `vendors/${profile.id}/banners/banner_${Date.now()}.jpg`);
        try {
          await uploadBytes(bannerRef, bannerFile);
          updatedBannerUrl = await getDownloadURL(bannerRef);
        } catch (err) {
          console.warn("Banner upload failed, using mock banner:", err);
          updatedBannerUrl = `https://images.unsplash.com/photo-1498654896293-37aacf113fd9?w=1000&auto=format&fit=crop&q=80`;
        }
        setBannerUploading(false);
      }

      // 3. Save profile changes
      const res = await fetch(`${API_URL}/vendors/me`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          businessName: profileName.trim(),
          description: profileDesc.trim(),
          logoUrl: updatedLogoUrl,
          bannerUrl: updatedBannerUrl,
          openingHours,
        }),
      });

      if (res.ok) {
        const updated = await res.json();
        setProfile(updated);
        setLogoFile(null);
        setBannerFile(null);
        toast({
          title: "Profile Saved",
          description: "Successfully updated canteen details and hours.",
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUpdating(false);
    }
  };

  const toggleHoursDay = (day: string) => {
    setOpeningHours((prev) => {
      const dayData = prev[day] || { open: false, from: '09:00', to: '22:00' };
      return {
        ...prev,
        [day]: {
          ...dayData,
          open: !dayData.open,
        },
      };
    });
  };

  const updateHoursTime = (day: string, field: 'from' | 'to', value: string) => {
    setOpeningHours((prev) => {
      const dayData = prev[day] || { open: true, from: '09:00', to: '22:00' };
      return {
        ...prev,
        [day]: {
          ...dayData,
          [field]: value,
        },
      };
    });
  };

  // Group menu items by category name
  const groupedMenuItems = menuItems.reduce((acc, item) => {
    const categoryName = item.category?.name || 'Uncategorized';
    if (!acc[categoryName]) acc[categoryName] = [];
    acc[categoryName].push(item);
    return acc;
  }, {} as Record<string, MenuItem[]>);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="text-center space-y-4">
          <Loader2 className="h-10 w-10 text-orange-500 animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-500">Loading Vendor Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50/60 font-sans">
      {/* Top Banner Details */}
      {profile?.bannerUrl ? (
        <div className="w-full h-44 relative bg-slate-900 overflow-hidden">
          <img 
            src={profile.bannerUrl} 
            alt="Canteen Banner" 
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
        </div>
      ) : (
        <div className="w-full h-24 bg-gradient-to-r from-orange-400 to-amber-500" />
      )}

      {/* Profile Bar Header */}
      <header className="bg-white border-b border-slate-200/80 sticky top-0 z-10 shadow-sm shadow-slate-100/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-4 -mt-10 sm:-mt-14 relative z-20">
            {profile?.logoUrl ? (
              <img 
                src={profile.logoUrl} 
                alt="Store Logo" 
                className="h-20 w-20 rounded-2xl border-4 border-white bg-white object-cover shadow-md"
              />
            ) : (
              <div className="h-20 w-20 rounded-2xl border-4 border-white bg-orange-500 text-white font-bold flex items-center justify-center text-2xl shadow-md">
                {profile?.businessName?.charAt(0) || 'C'}
              </div>
            )}
            <div className="mt-8 sm:mt-12">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                {profile?.businessName || 'Vendor Dashboard'}
                <Sparkles className="h-5 w-5 text-orange-500 fill-orange-500" />
              </h1>
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-400">
                <span>{profile?.campus?.name || 'Campus'}</span>
                <span>•</span>
                <span className="text-orange-500">{menuItems.length} menu items</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Soft ping audio playback initializer */}
            <button 
              onClick={playSoftPing}
              title="Test Notification Sound"
              className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors text-slate-400 hover:text-slate-600"
            >
              <Volume2 className="h-4.5 w-4.5" />
            </button>

            <button
              onClick={handleToggleOpen}
              disabled={updating}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider border transition-all shadow-sm ${
                profile?.isOpenNow 
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100/60' 
                  : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100/60'
              }`}
            >
              <Power className="h-3.5 w-3.5" />
              {profile?.isOpenNow ? 'Open Now' : 'Closed'}
            </button>

            <button
              onClick={() => logout().then(() => router.push('/login'))}
              className="text-xs font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 rounded-xl px-3 py-2 transition-all"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Dashboard */}
      <main className="flex-1 max-w-7xl w-full mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Core Stats Overview */}
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div className="bg-white shadow-sm hover:shadow-md transition-shadow rounded-2xl border border-slate-200/80 p-6 flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-orange-50 text-orange-500">
              <ShoppingBag className="h-6 w-6" />
            </div>
            <div>
              <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Total Orders</span>
              <span className="text-2xl font-black text-slate-800">{stats?.ordersCount || 0}</span>
            </div>
          </div>

          <div className="bg-white shadow-sm hover:shadow-md transition-shadow rounded-2xl border border-slate-200/80 p-6 flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-600">
              <DollarSign className="h-6 w-6" />
            </div>
            <div>
              <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Net Sales Revenue</span>
              <span className="text-2xl font-black text-slate-800">₹{stats?.revenue?.toFixed(2) || '0.00'}</span>
            </div>
          </div>

          <div className="bg-white shadow-sm hover:shadow-md transition-shadow rounded-2xl border border-slate-200/80 p-6 flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-amber-50 text-amber-500">
              <Clock className="h-6 w-6" />
            </div>
            <div>
              <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">Store Open Status</span>
              <span className={`text-md font-extrabold uppercase tracking-wide inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full mt-1 ${
                profile?.isOpenNow ? 'bg-emerald-100/60 text-emerald-800' : 'bg-rose-100/60 text-rose-800'
              }`}>
                <span className={`h-2 w-2 rounded-full ${profile?.isOpenNow ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                {profile?.isOpenNow ? 'Accepting Orders' : 'Offline'}
              </span>
            </div>
          </div>
        </div>

        {/* Tab Controls Navigation */}
        <div className="border-b border-slate-200/85">
          <nav className="flex gap-8">
            {[
              { id: 'orders', label: `Order Queue`, badge: activeOrders.length },
              { id: 'menu', label: `Menu Management` },
              { id: 'profile', label: `Store Profile` },
              { id: 'analytics', label: `Analytics & Insights` }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`pb-4 text-sm font-bold uppercase tracking-wider border-b-2 transition-all relative ${
                  activeTab === tab.id 
                    ? 'border-orange-500 text-orange-500' 
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                {tab.label}
                {tab.badge !== undefined && tab.badge > 0 && (
                  <span className="ml-2 bg-orange-500 text-white rounded-full text-2xs px-2 py-0.5 font-extrabold border border-white">
                    {tab.badge}
                  </span>
                )}
              </button>
            ))}
          </nav>
        </div>

        {/* TAB 1: LIVE ORDER QUEUE */}
        {activeTab === 'orders' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-800">Live Active Orders Queue</h3>
              <span className="text-xs bg-orange-50 border border-orange-100 text-orange-600 px-3 py-1 rounded-xl font-bold">
                Auto-updating via WebSockets
              </span>
            </div>

            {activeOrders.length === 0 ? (
              <div className="bg-white shadow border border-slate-200/80 rounded-2xl p-12 text-center text-slate-500">
                <Clock className="mx-auto h-12 w-12 text-slate-300 mb-4 animate-spin-slow" />
                <p className="font-extrabold text-slate-700">Waiting for live order tickets...</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  New orders placed by students on your campus will instantly trigger an alert sound and appear right here.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {activeOrders.map((order) => {
                  const isNew = newOrderIds.has(order.id);
                  const timePlaced = Math.floor((Date.now() - new Date(order.createdAt).getTime()) / 60000);
                  
                  return (
                    <div 
                      key={order.id}
                      className={`bg-white border rounded-2xl overflow-hidden shadow-sm transition-all duration-500 relative flex flex-col justify-between ${
                        isNew 
                          ? 'border-orange-500 ring-4 ring-orange-500/10 animate-pulse' 
                          : 'border-slate-200/80 hover:border-slate-300'
                      }`}
                    >
                      {isNew && (
                        <span className="absolute top-3 right-3 bg-orange-500 text-white text-2xs font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider animate-bounce z-10">
                          NEW
                        </span>
                      )}

                      {/* Card Header */}
                      <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-black text-slate-500 uppercase">
                            #{order.id.slice(-6).toUpperCase()}
                          </span>
                          <span className="text-2xs font-semibold text-slate-400 flex items-center gap-1">
                            <Clock className="h-3 w-3 text-slate-300" />
                            {timePlaced <= 0 ? 'Just now' : `${timePlaced} min ago`}
                          </span>
                        </div>
                        <h4 className="font-extrabold text-slate-800 text-md mt-1.5 flex items-center gap-1.5">
                          <User className="h-4.5 w-4.5 text-slate-400" />
                          {order.user?.name || 'Customer'}
                        </h4>
                      </div>

                      {/* Card Body */}
                      <div className="p-5 flex-1 space-y-4">
                        {/* Order Items */}
                        <div className="space-y-2">
                          <span className="text-3xs font-black text-slate-400 uppercase tracking-widest block">Items ordered</span>
                          <ul className="space-y-1.5">
                            {order.items.map((item) => (
                              <li key={item.id} className="text-xs text-slate-700 flex justify-between font-medium">
                                <span className="flex items-center gap-1.5">
                                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full border border-slate-200 ${item.menuItem?.isVeg ? 'bg-green-500' : 'bg-red-500'}`} />
                                  {item.menuItem?.name || 'Menu Item'}
                                </span>
                                <span className="font-bold text-slate-600">x{item.quantity}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Location Details */}
                        <div className="text-xs text-slate-600 border-t border-slate-100 pt-3 space-y-1">
                          <div className="flex items-start gap-1">
                            <MapPin className="h-3.5 w-3.5 text-slate-400 mt-0.5 shrink-0" />
                            <span className="font-medium line-clamp-2">{order.deliveryAddress}</span>
                          </div>
                          {order.deliverySlot && (
                            <div className="flex items-center gap-1 pl-4.5 text-orange-500 font-bold">
                              <span>Slot: {order.deliverySlot}</span>
                            </div>
                          )}
                        </div>

                        {/* Total Payment Details */}
                        <div className="flex justify-between items-center bg-slate-50 rounded-xl px-4 py-2 text-xs border border-slate-100">
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <CreditCard className="h-3.5 w-3.5 text-slate-400" />
                            <span className="font-bold uppercase tracking-wider">{order.payment?.method || 'COD'}</span>
                          </div>
                          <span className="font-black text-slate-800 text-sm">₹{order.totalAmount.toFixed(2)}</span>
                        </div>
                      </div>

                      {/* Card Footer Actions */}
                      <div className="p-5 bg-slate-50/30 border-t border-slate-100 flex gap-2">
                        {order.status === 'PLACED' && (
                          <>
                            <button
                              onClick={() => handleOrderStatusUpdate(order.id, 'ACCEPTED')}
                              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl py-2.5 text-xs font-black uppercase tracking-wider shadow-sm transition-all"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => setRejectingOrder(order)}
                              className="px-3 border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100/60 rounded-xl py-2.5 text-xs font-black uppercase tracking-wider transition-all"
                            >
                              Reject
                            </button>
                          </>
                        )}

                        {order.status === 'ACCEPTED' && (
                          <button
                            onClick={() => handleOrderStatusUpdate(order.id, 'PREPARING')}
                            className="w-full bg-orange-500 hover:bg-orange-600 text-white rounded-xl py-2.5 text-xs font-black uppercase tracking-wider shadow-sm transition-all"
                          >
                            Start Preparing
                          </button>
                        )}

                        {order.status === 'PREPARING' && (
                          <button
                            onClick={() => handleOrderStatusUpdate(order.id, 'READY')}
                            className="w-full bg-amber-500 hover:bg-amber-600 text-white rounded-xl py-2.5 text-xs font-black uppercase tracking-wider shadow-sm transition-all"
                          >
                            Mark Ready
                          </button>
                        )}

                        {order.status === 'READY' && (
                          <button
                            onClick={() => {
                              const nextStatus = order.deliveryPartnerId ? 'OUT_FOR_DELIVERY' : 'DELIVERED';
                              handleOrderStatusUpdate(order.id, nextStatus as any);
                            }}
                            className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-xl py-2.5 text-xs font-black uppercase tracking-wider shadow-sm transition-all"
                          >
                            {order.deliveryPartnerId ? 'Dispatch Rider' : 'Mark Delivered'}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 2: MENU MANAGEMENT */}
        {activeTab === 'menu' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Create / Edit Form Column */}
            <div className="space-y-6">
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm">
                <h4 className="text-md font-black text-slate-800 mb-5 flex items-center gap-1.5">
                  <Plus className="h-5 w-5 text-orange-500" />
                  {editingItem ? 'Edit Menu Item' : 'Add New MenuItem'}
                </h4>
                
                <form onSubmit={handleMenuItemSubmit} className="space-y-4">
                  <div>
                    <label className="block text-2xs font-bold text-slate-400 uppercase mb-1">Item Name</label>
                    <input
                      type="text"
                      required
                      value={menuFormName}
                      onChange={(e) => setMenuFormName(e.target.value)}
                      className="block w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-all text-slate-800 placeholder-slate-400"
                      placeholder="e.g. Schezwan Noodles"
                    />
                  </div>

                  <div>
                    <label className="block text-2xs font-bold text-slate-400 uppercase mb-1">Description</label>
                    <textarea
                      value={menuFormDescription}
                      onChange={(e) => setMenuFormDescription(e.target.value)}
                      rows={2}
                      className="block w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-all text-slate-800 placeholder-slate-400 resize-none"
                      placeholder="Detailed item description..."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-2xs font-bold text-slate-400 uppercase mb-1">Price (₹)</label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={menuFormPrice}
                        onChange={(e) => setMenuFormPrice(e.target.value)}
                        className="block w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-all text-slate-800 placeholder-slate-400"
                        placeholder="e.g. 120"
                      />
                    </div>
                    <div>
                      <label className="block text-2xs font-bold text-slate-400 uppercase mb-1">Prep (Mins)</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={menuFormPrepTime}
                        onChange={(e) => setMenuFormPrepTime(e.target.value)}
                        className="block w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-all text-slate-800 placeholder-slate-400"
                        placeholder="e.g. 12"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-2xs font-bold text-slate-400 uppercase mb-1">Discount (%)</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={menuFormDiscount}
                        onChange={(e) => setMenuFormDiscount(e.target.value)}
                        className="block w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-all text-slate-800 placeholder-slate-400"
                        placeholder="e.g. 10 (Optional)"
                      />
                    </div>
                    <div>
                      <label className="block text-2xs font-bold text-slate-400 uppercase mb-1.5">Food Type</label>
                      <button
                        type="button"
                        onClick={() => setMenuFormIsVeg(!menuFormIsVeg)}
                        className={`w-full py-2.5 px-3 rounded-xl border text-xs font-extrabold uppercase tracking-wide transition-all ${
                          menuFormIsVeg
                            ? 'bg-green-50 text-green-700 border-green-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                        }`}
                      >
                        {menuFormIsVeg ? '🟢 Veg' : '🔴 Non-Veg'}
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-2xs font-bold text-slate-400 uppercase mb-1">Category</label>
                    <select
                      value={menuFormCategoryId}
                      onChange={(e) => setMenuFormCategoryId(e.target.value)}
                      className="block w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-all text-slate-800 bg-white"
                    >
                      <option value="">-- Select Category --</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <span className="block text-2xs font-bold text-slate-400 uppercase mb-1.5">Or add new category</span>
                    <input
                      type="text"
                      disabled={!!menuFormCategoryId}
                      value={menuFormNewCategory}
                      onChange={(e) => setMenuFormNewCategory(e.target.value)}
                      className="block w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 transition-all text-slate-800 placeholder-slate-400 disabled:bg-slate-100/60 disabled:cursor-not-allowed"
                      placeholder="Type category name here..."
                    />
                  </div>

                  <div>
                    <label className="block text-2xs font-bold text-slate-400 uppercase mb-1">Item Image</label>
                    <div className="border-2 border-dashed border-slate-200 hover:border-orange-500/60 rounded-xl p-4 text-center cursor-pointer transition-colors relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setMenuFormFile(e.target.files?.[0] || null)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <Upload className="h-5 w-5 text-slate-400 mx-auto mb-1.5" />
                      <span className="text-2xs font-bold text-slate-500 block truncate">
                        {menuFormFile ? menuFormFile.name : 'Choose item image...'}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="submit"
                      disabled={menuFormUploading}
                      className="flex-1 bg-orange-500 hover:bg-orange-600 text-white rounded-xl py-3 text-xs font-black uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-1.5"
                    >
                      {menuFormUploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        editingItem ? 'Save Changes' : 'Create Item'
                      )}
                    </button>
                    {editingItem && (
                      <button
                        type="button"
                        onClick={resetMenuForm}
                        className="border border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100 rounded-xl px-4 py-3 text-xs font-black uppercase tracking-wider transition-all"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </form>
              </div>

              {/* Category CRUD management */}
              <div className="bg-white border border-slate-200/80 rounded-2xl p-6 shadow-sm space-y-4">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Manage Categories</h4>
                <form onSubmit={handleCreateCategory} className="flex gap-2">
                  <input
                    type="text"
                    required
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-xs outline-none focus:border-orange-500 text-slate-800 placeholder-slate-400"
                    placeholder="New category name..."
                  />
                  <button
                    type="submit"
                    className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl px-4 py-2 text-xs font-bold transition-all"
                  >
                    Add
                  </button>
                </form>

                <div className="divide-y divide-slate-100 max-h-44 overflow-y-auto pr-1">
                  {categories.map((c) => (
                    <div key={c.id} className="py-2.5 flex items-center justify-between text-xs font-semibold text-slate-700">
                      {editingCategory?.id === c.id ? (
                        <div className="flex gap-1.5 items-center w-full">
                          <input
                            type="text"
                            value={editingCatName}
                            onChange={(e) => setEditingCatName(e.target.value)}
                            className="border border-slate-300 rounded-md px-2 py-1 text-xs text-slate-800 flex-1 outline-none"
                          />
                          <button onClick={() => handleUpdateCategory(c.id)} className="text-emerald-500">
                            <Check className="h-4.5 w-4.5" />
                          </button>
                          <button onClick={() => setEditingCategory(null)} className="text-rose-500">
                            <X className="h-4.5 w-4.5" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <span>{c.name}</span>
                          <div className="flex gap-2">
                            <button 
                              onClick={() => {
                                setEditingCategory(c);
                                setEditingCatName(c.name);
                              }}
                              className="text-slate-400 hover:text-slate-600 transition-colors"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                            </button>
                            <button 
                              onClick={() => handleDeleteCategory(c)}
                              className="text-slate-400 hover:text-rose-600 transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Menu List Column */}
            <div className="lg:col-span-2 space-y-6">
              <h4 className="text-xl font-black text-slate-800 flex items-center gap-1.5">
                <Layers className="h-5 w-5 text-orange-500" /> Current Canteen Menu
              </h4>

              {menuItems.length === 0 ? (
                <div className="bg-white border border-slate-200/80 rounded-2xl p-12 text-center text-slate-400 shadow-sm">
                  No menu items found. Add items using the sidebar form to populate your canteen's menu.
                </div>
              ) : (
                <div className="space-y-8">
                  {Object.entries(groupedMenuItems).map(([categoryName, items]) => (
                    <div key={categoryName} className="space-y-3">
                      <div className="flex items-center gap-2">
                        <h5 className="text-sm font-black text-slate-800 uppercase tracking-widest">{categoryName}</h5>
                        <div className="flex-1 h-0.5 bg-slate-200/60" />
                        <span className="text-2xs font-semibold text-slate-400 px-2 py-0.5 rounded bg-slate-100">{items.length} items</span>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {items.map((item) => (
                          <div 
                            key={item.id} 
                            className={`bg-white border rounded-2xl p-4 flex gap-4 shadow-sm hover:shadow-md transition-shadow relative ${
                              item.isAvailable ? 'border-slate-200/80' : 'border-slate-200/40 bg-slate-50/50 opacity-75'
                            }`}
                          >
                            {/* Item Image */}
                            <div className="h-20 w-20 rounded-xl overflow-hidden shrink-0 border border-slate-100 bg-slate-100">
                              {item.imageUrl ? (
                                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-slate-300 font-black text-2xs uppercase">
                                  No Image
                                </div>
                              )}
                            </div>

                            {/* Details */}
                            <div className="flex-1 flex flex-col justify-between py-0.5">
                              <div>
                                <div className="flex items-start justify-between gap-1">
                                  <h6 className="font-extrabold text-slate-800 text-sm line-clamp-1">{item.name}</h6>
                                  <span className={`h-2.5 w-2.5 shrink-0 rounded-full border border-slate-200 ${item.isVeg ? 'bg-green-500' : 'bg-red-500'}`} />
                                </div>
                                <p className="text-3xs text-slate-400 line-clamp-2 mt-0.5">{item.description || 'No description provided.'}</p>
                              </div>
                              
                              <div className="flex items-center justify-between mt-2 pt-1 border-t border-slate-100/60">
                                <div className="flex items-baseline gap-1">
                                  <span className="font-black text-slate-800 text-sm">₹{item.price.toFixed(2)}</span>
                                  {item.discountPercent && (
                                    <span className="text-3xs font-extrabold text-orange-500 bg-orange-50 px-1 rounded">
                                      {item.discountPercent}% OFF
                                    </span>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => handleToggleItemAvailability(item)}
                                    className={`px-2 py-1 rounded-md text-2xs font-extrabold uppercase tracking-wide transition-all border ${
                                      item.isAvailable 
                                        ? 'bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100/60' 
                                        : 'bg-rose-50 border-rose-100 text-rose-600 hover:bg-rose-100/60'
                                    }`}
                                  >
                                    {item.isAvailable ? 'Available' : 'Sold Out'}
                                  </button>
                                  <button 
                                    onClick={() => handleEditClick(item)}
                                    className="p-1 text-slate-400 hover:text-slate-600 transition-colors border border-slate-200 rounded-md bg-white hover:bg-slate-50"
                                  >
                                    <Edit3 className="h-3.5 w-3.5" />
                                  </button>
                                  <button 
                                    onClick={() => handleDeleteMenuItem(item)}
                                    className="p-1 text-slate-400 hover:text-rose-600 transition-colors border border-slate-200 rounded-md bg-white hover:bg-slate-50"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

          </div>
        )}

        {/* TAB 3: STORE PROFILE */}
        {activeTab === 'profile' && (
          <div className="bg-white border border-slate-200/80 rounded-2xl p-8 shadow-sm max-w-3xl mx-auto">
            <h3 className="text-lg font-black text-slate-800 mb-6 flex items-center gap-1.5">
              <Store className="h-5 w-5 text-orange-500" />
              Configure Canteen Profile
            </h3>

            <form onSubmit={handleProfileSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-2xs font-bold text-slate-400 uppercase mb-1.5">Business Name</label>
                  <input
                    type="text"
                    required
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="block w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 text-slate-800 font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-2xs font-bold text-slate-400 uppercase mb-1.5">Campus Location</label>
                  <input
                    type="text"
                    disabled
                    value={profile?.campus?.name || ''}
                    className="block w-full border border-slate-200 bg-slate-50 text-slate-500 rounded-xl px-3 py-2.5 text-sm cursor-not-allowed font-medium"
                  />
                </div>
              </div>

              <div>
                <label className="block text-2xs font-bold text-slate-400 uppercase mb-1.5">Business Description</label>
                <textarea
                  value={profileDesc}
                  onChange={(e) => setProfileDesc(e.target.value)}
                  rows={3}
                  className="block w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 text-slate-800 placeholder-slate-400 resize-none font-medium"
                  placeholder="Describe your canteen, cuisines, specialization..."
                />
              </div>

              {/* Logo / Banner Uploader */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                <div>
                  <span className="block text-2xs font-bold text-slate-400 uppercase mb-2">Shop Logo</span>
                  <div className="flex items-center gap-4">
                    {profile?.logoUrl && (
                      <img src={profile.logoUrl} alt="Logo" className="h-16 w-16 rounded-xl object-cover border border-slate-200 shrink-0" />
                    )}
                    <div className="flex-1 border-2 border-dashed border-slate-200 hover:border-orange-500/60 rounded-xl p-3 text-center cursor-pointer transition-colors relative">
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <Upload className="h-4.5 w-4.5 text-slate-400 mx-auto mb-1" />
                      <span className="text-3xs font-extrabold text-slate-500 block truncate">
                        {logoFile ? logoFile.name : 'Upload New Logo'}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <span className="block text-2xs font-bold text-slate-400 uppercase mb-2">Dashboard Header Banner</span>
                  <div className="flex items-center gap-4">
                    {profile?.bannerUrl && (
                      <img src={profile.bannerUrl} alt="Banner" className="h-16 w-24 rounded-xl object-cover border border-slate-200 shrink-0" />
                    )}
                    <div className="flex-1 border-2 border-dashed border-slate-200 hover:border-orange-500/60 rounded-xl p-3 text-center cursor-pointer transition-colors relative">
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={(e) => setBannerFile(e.target.files?.[0] || null)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                      />
                      <Upload className="h-4.5 w-4.5 text-slate-400 mx-auto mb-1" />
                      <span className="text-3xs font-extrabold text-slate-500 block truncate">
                        {bannerFile ? bannerFile.name : 'Upload New Banner'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Weekly Active Opening Hours config */}
              <div className="border-t border-slate-100 pt-6 space-y-4">
                <span className="block text-2xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
                  <Calendar className="h-4 w-4 text-orange-500" />
                  Define Opening & Closing Hours
                </span>

                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-3.5">
                  {daysOfWeek.map((day) => {
                    const dayHours = openingHours[day] || { open: false, from: '09:00', to: '22:00' };
                    return (
                      <div key={day} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs pb-3 border-b border-slate-200/50 last:border-b-0 last:pb-0">
                        <div className="flex items-center gap-2 sm:w-32 shrink-0">
                          <button
                            type="button"
                            onClick={() => toggleHoursDay(day)}
                            className={`px-2 py-1 rounded text-2xs font-extrabold uppercase tracking-wide border transition-all ${
                              dayHours.open
                                ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
                                : 'bg-slate-100 border-slate-200 text-slate-400'
                            }`}
                          >
                            {dayHours.open ? 'Active' : 'Closed'}
                          </button>
                          <span className="font-extrabold capitalize text-slate-700">{day}</span>
                        </div>

                        {dayHours.open && (
                          <div className="flex items-center gap-2 text-slate-500 font-semibold">
                            <span>From</span>
                            <input
                              type="time"
                              required
                              value={dayHours.from}
                              onChange={(e) => updateHoursTime(day, 'from', e.target.value)}
                              className="border border-slate-200 rounded-md px-2.5 py-1 text-slate-800 font-bold outline-none"
                            />
                            <span>To</span>
                            <input
                              type="time"
                              required
                              value={dayHours.to}
                              onChange={(e) => updateHoursTime(day, 'to', e.target.value)}
                              className="border border-slate-200 rounded-md px-2.5 py-1 text-slate-800 font-bold outline-none"
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <button
                  type="submit"
                  disabled={updating || logoUploading || bannerUploading}
                  className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl py-3 px-8 text-xs font-black uppercase tracking-wider shadow-sm transition-all flex items-center gap-1.5"
                >
                  {updating ? (
                    <Loader2 className="h-4.5 w-4.5 animate-spin" />
                  ) : (
                    'Save Store Settings'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 4: ANALYTICS */}
        {activeTab === 'analytics' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-black text-slate-800 flex items-center gap-1.5">
                <BarChart2 className="h-6 w-6 text-orange-500" />
                Canteen Revenue & Performance Analytics
              </h3>
              <div className="flex items-center border border-slate-200 bg-white rounded-xl p-0.5">
                {(['7d', '30d'] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => setAnalyticsRange(r)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold uppercase tracking-wide transition-all ${
                      analyticsRange === r
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {r} Range
                  </button>
                ))}
              </div>
            </div>

            {mounted && analytics ? (
              <div className="space-y-8">
                {/* Daily Revenue Chart */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="bg-white border border-slate-200/80 shadow-sm rounded-2xl p-6 space-y-4">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Daily Sales revenue (INR)</h4>
                    <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics.dailyData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                          <RechartsTooltip cursor={{ fill: '#f8fafc' }} />
                          <Legend wrapperStyle={{ fontSize: 10, fontWeight: 'bold' }} />
                          <Bar dataKey="revenue" fill="#f97316" radius={[4, 4, 0, 0]} name="Revenue (₹)" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Daily Orders Line */}
                  <div className="bg-white border border-slate-200/80 shadow-sm rounded-2xl p-6 space-y-4">
                    <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Completed orders per day</h4>
                    <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={analytics.dailyData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} />
                          <YAxis stroke="#94a3b8" fontSize={10} tickLine={false} axisLine={false} />
                          <RechartsTooltip />
                          <Legend wrapperStyle={{ fontSize: 10, fontWeight: 'bold' }} />
                          <Line type="monotone" dataKey="orders" stroke="#10b981" strokeWidth={2.5} name="Total Orders" dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>

                {/* Top Items sold */}
                <div className="bg-white border border-slate-200/80 shadow-sm rounded-2xl p-6 max-w-3xl space-y-4">
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Top 5 Canteen items by quantity sold</h4>
                  {analytics.topItems.length === 0 ? (
                    <p className="text-xs text-slate-400 py-6 text-center">No sales data recorded to determine top menu items.</p>
                  ) : (
                    <div className="h-72 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analytics.topItems} layout="vertical">
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                          <XAxis type="number" stroke="#94a3b8" fontSize={10} tickLine={false} />
                          <YAxis dataKey="name" type="category" stroke="#94a3b8" fontSize={10} tickLine={false} width={100} />
                          <RechartsTooltip />
                          <Legend wrapperStyle={{ fontSize: 10, fontWeight: 'bold' }} />
                          <Bar dataKey="quantity" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Quantity Sold" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white border border-slate-200/80 shadow-sm rounded-2xl p-12 text-center text-slate-400">
                <Loader2 className="h-8 w-8 text-orange-500 animate-spin mx-auto mb-2" />
                <span>Aggregating analytics data metrics...</span>
              </div>
            )}
          </div>
        )}

      </main>

      {/* Reject Reason Confirmation Modal */}
      {rejectingOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-rose-50 text-rose-500 shrink-0">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-800 text-lg">Confirm Order Rejection</h4>
                <p className="text-xs font-semibold text-slate-400 mt-0.5">
                  Are you sure you want to cancel order #{rejectingOrder.id.slice(-6).toUpperCase()}?
                </p>
              </div>
            </div>
            
            <div className="space-y-1 pt-1.5">
              <label className="block text-2xs font-bold text-slate-400 uppercase">Reason for Rejection</label>
              <textarea
                required
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
                placeholder="e.g. Out of stock, canteen closing soon..."
                className="block w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 text-slate-800 font-medium resize-none"
              />
            </div>

            <div className="flex gap-2.5 pt-2 justify-end">
              <button
                onClick={() => setRejectingOrder(null)}
                className="border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-xl px-4 py-2.5 text-xs uppercase tracking-wide transition-all"
              >
                No, Back
              </button>
              <button
                onClick={submitRejection}
                disabled={!rejectionReason.trim()}
                className="bg-rose-500 hover:bg-rose-600 text-white font-black rounded-xl px-6 py-2.5 text-xs uppercase tracking-wide shadow-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reject Order
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Custom Premium Item Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-rose-50 text-rose-500 shrink-0">
                <Trash2 className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-800 text-lg">Delete Menu Item?</h4>
                <p className="text-xs font-semibold text-slate-400 mt-1">
                  Are you sure you want to permanently delete <span className="text-slate-700 font-extrabold">"{itemToDelete.name}"</span>? This action cannot be undone.
                </p>
              </div>
            </div>
            
            <div className="flex gap-2.5 pt-2 justify-end">
              <button
                onClick={() => setItemToDelete(null)}
                className="border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-xl px-4 py-2.5 text-xs uppercase tracking-wide transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteMenuItem}
                className="bg-rose-500 hover:bg-rose-600 text-white font-black rounded-xl px-6 py-2.5 text-xs uppercase tracking-wide shadow-sm transition-all"
              >
                Delete Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Premium Category Delete Confirmation Modal */}
      {categoryToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-rose-50 text-rose-500 shrink-0">
                <AlertCircle className="h-6 w-6" />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-800 text-lg">Delete Category?</h4>
                <p className="text-xs font-semibold text-slate-400 mt-1">
                  Are you sure you want to delete category <span className="text-slate-700 font-extrabold">"{categoryToDelete.name}"</span>? All menu items under this category will also be permanently deleted. This action cannot be undone.
                </p>
              </div>
            </div>
            
            <div className="flex gap-2.5 pt-2 justify-end">
              <button
                onClick={() => setCategoryToDelete(null)}
                className="border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-xl px-4 py-2.5 text-xs uppercase tracking-wide transition-all"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteCategory}
                className="bg-rose-500 hover:bg-rose-600 text-white font-black rounded-xl px-6 py-2.5 text-xs uppercase tracking-wide shadow-sm transition-all"
              >
                Delete Category
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
