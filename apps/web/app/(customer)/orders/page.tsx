'use client';

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../../hooks/useAuth';
import { useRouter } from 'next/navigation';
import { 
  ShoppingBag, 
  ChevronRight, 
  ChevronDown, 
  MapPin, 
  Clock, 
  CreditCard, 
  AlertCircle,
  Star,
  Loader2,
  HelpCircle,
  Utensils
} from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '../../../components/ui/skeleton';
import { useToast } from '../../../hooks/use-toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

interface OrderItem {
  id: string;
  quantity: number;
  priceAtOrder: number;
  menuItem?: {
    name: string;
    imageUrl?: string | null;
  };
}

interface Order {
  id: string;
  vendorId: string;
  status: 'PLACED' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';
  totalAmount: number;
  deliveryFee: number;
  discountAmount: number;
  paymentStatus: 'PENDING' | 'COMPLETED' | 'FAILED';
  deliveryAddress: string;
  createdAt: string;
  vendor: {
    businessName: string;
    logoUrl?: string | null;
  };
  items: OrderItem[];
  payment?: {
    method?: string;
  } | null;
  review?: any | null;
}

export default function CustomerOrdersPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'active' | 'past'>('active');
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);

  // Review modal/dialog states
  const [reviewOrderId, setReviewOrderId] = useState<string | null>(null);
  const [rating, setRating] = useState<number>(5);
  const [comment, setComment] = useState<string>('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const loadOrders = async () => {
    if (!user) return;
    try {
      setLoading(true);
      const token = await user.getIdToken();
      const res = await fetch(`${API_URL}/orders`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrders();
  }, [user]);

  const formatOrderDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const timeStr = date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    
    if (isToday) {
      return `Today, ${timeStr}`;
    }
    
    return `${date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${timeStr}`;
  };

  const getItemSummary = (items: OrderItem[]) => {
    return items.map(item => `${item.menuItem?.name || 'Item'} × ${item.quantity}`).join(', ');
  };

  const toggleExpandOrder = (orderId: string) => {
    setExpandedOrderId(prev => (prev === orderId ? null : orderId));
  };

  const handleCreateReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewOrderId || !user) return;

    setSubmittingReview(true);
    try {
      const token = await user.getIdToken();
      const selectedOrder = orders.find(o => o.id === reviewOrderId);
      if (!selectedOrder) return;

      const res = await fetch(`${API_URL}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          vendorId: selectedOrder.vendorId,
          orderId: reviewOrderId,
          rating,
          comment: comment.trim(),
        }),
      });

      if (res.ok) {
        toast({
          title: "Review Submitted",
          description: "Thank you for sharing your feedback!",
        });
        setReviewOrderId(null);
        setComment('');
        setRating(5);
        await loadOrders(); // Refresh order review status
      } else {
        const errData = await res.json();
        toast({
          variant: "destructive",
          title: "Failed to submit review",
          description: errData.message || "Something went wrong.",
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmittingReview(false);
    }
  };

  const activeStatuses = ['PLACED', 'ACCEPTED', 'PREPARING', 'READY', 'OUT_FOR_DELIVERY'];
  const activeOrders = orders.filter(o => activeStatuses.includes(o.status));
  const pastOrders = orders.filter(o => !activeStatuses.includes(o.status));

  const getStatusColor = (status: Order['status']) => {
    switch (status) {
      case 'PLACED':
      case 'ACCEPTED':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'PREPARING':
      case 'READY':
      case 'OUT_FOR_DELIVERY':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'DELIVERED':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'CANCELLED':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/50 pb-20 px-4 py-8 max-w-2xl mx-auto space-y-6">
        <div className="h-10 w-44 bg-slate-200 animate-pulse rounded-xl" />
        <div className="flex gap-4 border-b border-slate-200 pb-2">
          <div className="h-6 w-24 bg-slate-200 animate-pulse rounded" />
          <div className="h-6 w-24 bg-slate-200 animate-pulse rounded" />
        </div>
        {[1, 2, 3].map(i => (
          <div key={i} className="bg-white border border-slate-200/80 rounded-2xl p-5 space-y-3 shadow-sm">
            <div className="flex justify-between">
              <div className="flex gap-3">
                <Skeleton className="h-12 w-12 rounded-xl" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
              <Skeleton className="h-5 w-20 rounded-full" />
            </div>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-8 w-full rounded-xl" />
          </div>
        ))}
      </div>
    );
  }

  const currentList = activeTab === 'active' ? activeOrders : pastOrders;

  return (
    <div className="min-h-screen bg-slate-50/50 pb-24 px-4 py-8 max-w-2xl mx-auto">
      <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center gap-2">
        My Orders
        <ShoppingBag className="h-7 w-7 text-orange-500" />
      </h1>

      {/* Tabs */}
      <div className="flex border-b border-slate-200/80 mt-6 mb-6">
        <button
          onClick={() => {
            setActiveTab('active');
            setExpandedOrderId(null);
          }}
          className={`pb-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-all relative ${
            activeTab === 'active'
              ? 'border-orange-500 text-orange-500'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Active Orders ({activeOrders.length})
        </button>
        <button
          onClick={() => {
            setActiveTab('past');
            setExpandedOrderId(null);
          }}
          className={`ml-8 pb-3 text-sm font-bold uppercase tracking-wider border-b-2 transition-all relative ${
            activeTab === 'past'
              ? 'border-orange-500 text-orange-500'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Past Orders ({pastOrders.length})
        </button>
      </div>

      {currentList.length === 0 ? (
        <div className="bg-white border border-slate-200/85 shadow-sm shadow-slate-100 rounded-2xl p-12 text-center space-y-5">
          <div className="mx-auto h-16 w-16 bg-orange-50 text-orange-500 rounded-2xl flex items-center justify-center">
            <Utensils className="h-8 w-8 animate-bounce" />
          </div>
          <div className="space-y-1.5">
            <h3 className="font-extrabold text-slate-800 text-lg">No orders yet — time to order something!</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Choose from the best campus canteens and get your favorite foods delivered in minutes.
            </p>
          </div>
          <Link 
            href="/" 
            className="inline-flex bg-orange-500 hover:bg-orange-600 text-white font-black text-xs uppercase tracking-wider py-3 px-6 rounded-xl shadow-sm transition-all"
          >
            Explore Restaurants
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {currentList.map((order) => {
            const isExpanded = expandedOrderId === order.id;
            
            return (
              <div 
                key={order.id}
                className="bg-white border border-slate-200/80 rounded-2xl overflow-hidden shadow-sm hover:border-slate-300 transition-all flex flex-col"
              >
                {/* Main Card Row */}
                <div className="p-5 flex justify-between gap-4 items-start">
                  <div className="flex gap-4">
                    {order.vendor?.logoUrl ? (
                      <img 
                        src={order.vendor.logoUrl} 
                        alt="Restaurant Logo" 
                        className="h-12 w-12 rounded-xl object-cover border border-slate-100 bg-white"
                      />
                    ) : (
                      <div className="h-12 w-12 bg-orange-100 text-orange-600 font-bold flex items-center justify-center rounded-xl text-lg">
                        {order.vendor?.businessName?.charAt(0) || 'R'}
                      </div>
                    )}
                    <div className="space-y-1">
                      <h3 className="font-black text-slate-800 text-sm leading-tight">
                        {order.vendor?.businessName || 'Canteen'}
                      </h3>
                      <span className="text-3xs font-semibold text-slate-400 block">
                        {formatOrderDate(order.createdAt)}
                      </span>
                    </div>
                  </div>
                  
                  <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-2xs font-extrabold uppercase tracking-wide ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                </div>

                {/* Summary / Price Row */}
                <div className="px-5 pb-5 flex flex-col gap-3">
                  <p className="text-xs text-slate-500 font-medium line-clamp-1">
                    {getItemSummary(order.items)}
                  </p>
                  
                  <div className="flex justify-between items-center bg-slate-50 rounded-xl px-4 py-2 text-xs border border-slate-100">
                    <div className="flex items-center gap-1.5 text-slate-500 font-semibold">
                      <CreditCard className="h-3.5 w-3.5 text-slate-400" />
                      <span className="uppercase tracking-wider">{order.payment?.method || 'COD'}</span>
                      <span className="text-slate-300">•</span>
                      <span className={`capitalize font-bold ${order.paymentStatus === 'COMPLETED' ? 'text-emerald-600' : 'text-slate-400'}`}>
                        {order.paymentStatus}
                      </span>
                    </div>
                    <span className="font-black text-slate-800 text-sm">₹{order.totalAmount.toFixed(2)}</span>
                  </div>
                </div>

                {/* Conditional Actions and Expandable Details */}
                {activeTab === 'active' ? (
                  <div className="px-5 pb-5 border-t border-slate-100 pt-3.5 flex justify-end">
                    <button
                      onClick={() => router.push(`/orders/${order.id}`)}
                      className="bg-orange-500 hover:bg-orange-600 text-white rounded-xl py-2 px-5 text-2xs font-black uppercase tracking-wider shadow-sm transition-all flex items-center gap-1"
                    >
                      Track Order
                      <ChevronRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => toggleExpandOrder(order.id)}
                      className="px-5 py-3 border-t border-slate-100 hover:bg-slate-50 flex items-center justify-between text-2xs font-black uppercase tracking-wider text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      {isExpanded ? 'Hide Details' : 'View Details'}
                      {isExpanded ? <ChevronDown className="h-4 w-4 rotate-180 transition-transform" /> : <ChevronDown className="h-4 w-4 transition-transform" />}
                    </button>

                    {isExpanded && (
                      <div className="px-5 pb-5 space-y-4 bg-slate-50/40 border-t border-slate-100/50 pt-4 animate-in slide-in-from-top-2 duration-200">
                        {/* Cancelled Order Reason */}
                        {order.status === 'CANCELLED' && (
                          <div className="flex gap-2 rounded-xl bg-rose-50 border border-rose-100 p-3 text-xs text-rose-700">
                            <AlertCircle className="h-4.5 w-4.5 shrink-0" />
                            <span>This order was cancelled. Rejection reasons: Restaurant out of stock / closing soon.</span>
                          </div>
                        )}

                        {/* Expandable Itemized list */}
                        <div className="space-y-2">
                          <span className="text-3xs font-black text-slate-400 uppercase tracking-widest block">Itemized Summary</span>
                          <ul className="space-y-1.5 border border-slate-200/60 bg-white rounded-xl p-3.5">
                            {order.items.map(item => (
                              <li key={item.id} className="text-xs text-slate-700 flex justify-between font-medium">
                                <span>{item.menuItem?.name || 'Item'}</span>
                                <span className="font-bold text-slate-500">₹{item.priceAtOrder.toFixed(2)} × {item.quantity}</span>
                              </li>
                            ))}
                            <li className="pt-2 border-t border-slate-100 flex justify-between font-bold text-xs text-slate-800">
                              <span>Delivery Fee</span>
                              <span>₹{order.deliveryFee.toFixed(2)}</span>
                            </li>
                            {order.discountAmount > 0 && (
                              <li className="flex justify-between font-bold text-xs text-orange-500">
                                <span>Coupon discount</span>
                                <span>-₹{order.discountAmount.toFixed(2)}</span>
                              </li>
                            )}
                            <li className="pt-2 border-t border-slate-100 flex justify-between font-black text-xs text-slate-800">
                              <span>Grand Total</span>
                              <span>₹{order.totalAmount.toFixed(2)}</span>
                            </li>
                          </ul>
                        </div>

                        {/* Reviews Check */}
                        {order.status === 'DELIVERED' && (
                          <div className="flex justify-end pt-1">
                            {order.review ? (
                              <div className="flex items-center gap-1.5 text-xs text-amber-500 font-bold bg-amber-50 px-3 py-1.5 rounded-lg border border-amber-100">
                                <Star className="h-3.5 w-3.5 fill-amber-500" />
                                Reviewed ({order.review.rating} ★)
                              </div>
                            ) : (
                              <button
                                onClick={() => setReviewOrderId(order.id)}
                                className="bg-slate-900 hover:bg-slate-800 text-white rounded-xl py-2 px-4 text-2xs font-black uppercase tracking-wider transition-all flex items-center gap-1"
                              >
                                <Star className="h-3.5 w-3.5" />
                                Rate this order
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}

              </div>
            );
          })}
        </div>
      )}

      {/* Review Dialog Modal */}
      {reviewOrderId && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form 
            onSubmit={handleCreateReview}
            className="bg-white border border-slate-200 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200"
          >
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-orange-50 text-orange-500 shrink-0">
                <Star className="h-6 w-6 fill-orange-500" />
              </div>
              <div>
                <h4 className="font-extrabold text-slate-800 text-md">Rate Your Order</h4>
                <p className="text-xs font-semibold text-slate-400 mt-0.5">
                  How was your food and delivery experience?
                </p>
              </div>
            </div>

            {/* Stars picker */}
            <div className="flex justify-center gap-2 py-2">
              {[1, 2, 3, 4, 5].map((val) => (
                <button
                  type="button"
                  key={val}
                  onClick={() => setRating(val)}
                  className="p-1 focus:outline-none"
                >
                  <Star 
                    className={`h-7 w-7 transition-all ${
                      val <= rating 
                        ? 'fill-amber-400 text-amber-400 scale-110' 
                        : 'text-slate-200 hover:text-slate-300'
                    }`} 
                  />
                </button>
              ))}
            </div>
            
            <div className="space-y-1">
              <label className="block text-2xs font-bold text-slate-400 uppercase">Comment (Optional)</label>
              <textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                rows={3}
                placeholder="Write your feedback..."
                className="block w-full border border-slate-200 rounded-xl px-3 py-2.5 text-xs outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/10 text-slate-800 font-medium resize-none"
              />
            </div>

            <div className="flex gap-2 pt-2 justify-end">
              <button
                type="button"
                onClick={() => setReviewOrderId(null)}
                className="border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-xl px-4 py-2 text-2xs uppercase tracking-wide transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submittingReview}
                className="bg-orange-500 hover:bg-orange-600 text-white font-black rounded-xl px-5 py-2 text-2xs uppercase tracking-wide shadow-sm transition-all flex items-center gap-1"
              >
                {submittingReview && <Loader2 className="h-3 w-3 animate-spin" />}
                Submit Review
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
