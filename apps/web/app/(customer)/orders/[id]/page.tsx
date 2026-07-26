'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '../../../../hooks/useAuth';
import { io, Socket } from 'socket.io-client';
import { 
  ShoppingBag, 
  MapPin, 
  Clock, 
  Utensils, 
  CheckCircle2, 
  Loader2, 
  ChevronRight, 
  TrendingUp, 
  AlertTriangle,
  CreditCard,
  Phone
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';

type OrderStatus = 'PLACED' | 'ACCEPTED' | 'PREPARING' | 'READY' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';

interface OrderItem {
  id: string;
  quantity: number;
  priceAtOrder: number;
  menuItem: {
    name: string;
    description: string;
  };
}

interface OrderDetails {
  id: string;
  status: OrderStatus;
  totalAmount: number;
  deliveryFee: number;
  discountAmount: number;
  deliveryAddress: string;
  deliverySlot: string | null;
  paymentStatus: string;
  paymentId: string | null;
  createdAt: string;
  vendor: {
    id: string;
    businessName: string;
    businessEmail: string;
    cuisineType: string[];
  };
  items: OrderItem[];
  payment: {
    method: 'COD' | 'ONLINE';
    status: string;
    razorpayOrderId: string;
  } | null;
  deliveryPartner?: {
    id: string;
    user: {
      name: string;
      phone: string | null;
    };
  } | null;
}

const statusSteps: { status: OrderStatus; label: string; desc: string }[] = [
  { status: 'PLACED', label: 'Placed', desc: 'Waiting for vendor approval' },
  { status: 'ACCEPTED', label: 'Accepted', desc: 'Order confirmed by canteen' },
  { status: 'PREPARING', label: 'Preparing', desc: 'Food is being cooked' },
  { status: 'READY', label: 'Ready', desc: 'Ready for counter pickup / dispatch' },
  { status: 'DELIVERED', label: 'Delivered', desc: 'Order collected successfully' }
];

export default function OrderTrackingPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params.id as string;
  const { user, dbUser } = useAuth();
  
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRetryingPayment, setIsRetryingPayment] = useState(false);

  // Fetch Order details initially
  const fetchOrderDetails = async () => {
    try {
      const token = await user?.getIdToken();
      const res = await fetch(`${API_URL}/orders/${orderId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('Failed to load order details');
      const data = await res.json();
      setOrder(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user && orderId) {
      fetchOrderDetails();
    }
  }, [user, orderId]);

  // Establish Socket.IO connection for real-time updates
  useEffect(() => {
    if (!orderId || !order) return;

    const socket: Socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling']
    });

    socket.on('connect', () => {
      console.log('Socket.IO tracking connected');
      // Join rooms
      socket.emit('join:order', { orderId });
      socket.emit('join:user', { userId: order.payment ? order.payment.razorpayOrderId.split('_')[1] : dbUser?.id });
    });

    // Listen to real-time status updates
    socket.on('order:status', (data: { orderId: string; status: OrderStatus }) => {
      console.log(`Socket status update received: Order ${data.orderId} is now ${data.status}`);
      if (data.orderId === orderId) {
        setOrder(prev => prev ? { ...prev, status: data.status } : null);
      }
    });

    // Listen to in-app notification center alerts
    socket.on('notification:new', (notif: any) => {
      console.log('Live notification alert:', notif);
      // Fetch fresh order details just in case
      fetchOrderDetails();
    });

    return () => {
      socket.disconnect();
    };
  }, [orderId, order]);

  // Retry online payment if it was pending / cancelled
  const handleRetryPayment = async () => {
    if (!order || isRetryingPayment) return;
    setIsRetryingPayment(true);

    try {
      const token = await user?.getIdToken();
      // Call create payment on backend
      const res = await fetch(`${API_URL}/payments/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          orderId: order.id,
          amount: order.totalAmount
        })
      });

      const rzpDetails = await res.json();

      if (!res.ok) {
        throw new Error(rzpDetails.message || 'Failed to initialize payment');
      }

      if (rzpDetails.mock) {
        const confirmPayment = window.confirm('MOCK MODE: Simulating Razorpay checkout. Proceed to pay?');
        if (confirmPayment) {
          const verifyRes = await fetch(`${API_URL}/payments/verify`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({
              razorpayOrderId: rzpDetails.id,
              razorpayPaymentId: 'pay_mock_' + Math.random().toString(36).substr(2, 9),
              razorpaySignature: 'mock_signature'
            })
          });

          if (verifyRes.ok) {
            fetchOrderDetails();
          } else {
            alert('Mock payment verification failed.');
          }
        }
        setIsRetryingPayment(false);
        return;
      }

      const options = {
        key: rzpDetails.key,
        amount: rzpDetails.amount,
        currency: rzpDetails.currency,
        name: 'CampusCrave',
        description: `Pay for order #${order.id}`,
        order_id: rzpDetails.id,
        handler: async function (response: any) {
          try {
            const verifyRes = await fetch(`${API_URL}/payments/verify`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({
                razorpayOrderId: rzpDetails.id,
                razorpayPaymentId: response.razorpay_payment_id,
                razorpaySignature: response.razorpay_signature
              })
            });

            if (verifyRes.ok) {
              fetchOrderDetails();
            } else {
              alert('Payment verification signature check failed.');
            }
          } catch (err: any) {
            alert('Payment verification failed.');
          }
        },
        prefill: {
          name: dbUser?.name || '',
          email: dbUser?.email || ''
        },
        theme: {
          color: '#FF6B35'
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (err: any) {
      alert(err.message || 'Payment initialization failed.');
    } finally {
      setIsRetryingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 space-y-3">
        <Loader2 className="h-10 w-10 text-[#FF6B35] animate-spin" />
        <p className="text-xs text-slate-400 font-medium">Fetching order status updates...</p>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 max-w-md mx-auto">
        <AlertTriangle className="h-12 w-12 text-red-500" />
        <div>
          <h2 className="text-lg font-bold text-slate-900">Order not found</h2>
          <p className="text-xs text-slate-400 mt-1">{error || 'Could not fetch order tracking info.'}</p>
        </div>
        <button 
          onClick={() => router.push('/')} 
          className="bg-slate-900 text-white text-xs font-semibold px-6 py-2.5 rounded-xl"
        >
          Go Back Home
        </button>
      </div>
    );
  }

  // Get active step index based on order status
  const getActiveStepIndex = () => {
    if (order.status === 'CANCELLED') return -1;
    const index = statusSteps.findIndex(step => step.status === order.status);
    if (index !== -1) return index;
    // Map intermediate states like OUT_FOR_DELIVERY to preparing or ready
    if (order.status === 'OUT_FOR_DELIVERY') return 3;
    return 0;
  };

  const activeIndex = getActiveStepIndex();

  return (
    <div className="space-y-6 max-w-3xl mx-auto pb-12">
      
      {/* Live Indicator Banner */}
      <div className="bg-[#FAF6F0] border border-[#EAE3D2] rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="relative flex h-3 w-3 shrink-0">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
          </div>
          <div>
            <h2 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              Live Order Status Tracking
            </h2>
            <p className="text-[10px] text-slate-400">Order ID: #{order.id.substr(0, 8)} • Placed {new Date(order.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>
        
        {/* Status Badge */}
        <span className={`text-[10px] font-extrabold uppercase px-3 py-1 rounded-full ${
          order.status === 'DELIVERED' 
            ? 'bg-emerald-150 text-emerald-800' 
            : order.status === 'CANCELLED'
            ? 'bg-red-100 text-red-700'
            : 'bg-orange-100 text-[#FF6B35]'
        }`}>
          {order.status}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Progress Tracker Stepper (col-span-2) */}
        <div className="md:col-span-2 bg-white border border-[#EAE3D2] rounded-2xl p-5 sm:p-6 space-y-6 shadow-xs">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider pb-2 border-b border-[#FAF6F0]">
            Preparation Timeline
          </h3>

          {order.status === 'CANCELLED' ? (
            <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-100 rounded-xl text-red-700">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <div>
                <h4 className="text-xs font-bold">This order was cancelled</h4>
                <p className="text-[10px] opacity-80 mt-0.5">Please contact the canteen counter or place a new order.</p>
              </div>
            </div>
          ) : (
            <div className="relative pl-6 space-y-6 border-l border-[#FAF6F0]">
              {statusSteps.map((step, idx) => {
                const isCompleted = idx <= activeIndex;
                const isCurrent = idx === activeIndex;

                return (
                  <div key={step.status} className="relative flex items-start gap-4">
                    {/* Circle marker */}
                    <div className={`absolute -left-[31px] h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                      isCompleted 
                        ? 'border-[#FF6B35] bg-[#FF6B35]' 
                        : 'border-[#FAF6F0] bg-white'
                    }`}>
                      {isCompleted && <CheckCircle2 className="h-3.5 w-3.5 text-white" />}
                    </div>

                    <div>
                      <h4 className={`text-xs font-bold ${
                        isCurrent 
                          ? 'text-[#FF6B35]' 
                          : isCompleted 
                          ? 'text-slate-800' 
                          : 'text-slate-350'
                      }`}>
                        {step.label}
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5">{step.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Delivery Rider details if assigned */}
          {order.deliveryPartner && (
            <div className="bg-[#FAF6F0] border border-[#EAE3D2] rounded-xl p-4 flex items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-bold text-slate-800">Assigned Delivery Rider</h4>
                <p className="text-[10px] text-slate-400 mt-0.5">{order.deliveryPartner.user.name}</p>
              </div>
              {order.deliveryPartner.user.phone && (
                <a 
                  href={`tel:${order.deliveryPartner.user.phone}`}
                  className="bg-white border border-[#EAE3D2] p-2 rounded-xl text-[#FF6B35] hover:bg-orange-50/20 transition-all flex items-center gap-1.5 text-[10px] font-bold"
                >
                  <Phone className="h-3.5 w-3.5" /> Call Rider
                </a>
              )}
            </div>
          )}
        </div>

        {/* Right column: Order Details & Price summary (col-span-1) */}
        <div className="space-y-6">
          
          {/* Canteen info card */}
          <div className="bg-white border border-[#EAE3D2] rounded-2xl p-5 space-y-3 shadow-xs">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Canteen Details</h4>
            <div>
              <h3 className="text-xs font-bold text-slate-800">{order.vendor.businessName}</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">{order.vendor.businessEmail}</p>
            </div>
            <div className="flex flex-wrap gap-1 mt-1">
              {order.vendor.cuisineType.slice(0, 3).map(cuisine => (
                <span key={cuisine} className="bg-slate-100 text-slate-500 text-[8px] font-bold px-1.5 py-0.5 rounded">
                  {cuisine}
                </span>
              ))}
            </div>
          </div>

          {/* Payment Status details */}
          <div className="bg-white border border-[#EAE3D2] rounded-2xl p-5 space-y-3 shadow-xs">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Payment Details</h4>
            
            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-600">Payment Method</span>
              <span className="font-bold text-slate-800">{order.payment?.method || 'ONLINE'}</span>
            </div>

            <div className="flex justify-between items-center text-xs">
              <span className="font-semibold text-slate-600">Payment Status</span>
              <span className={`font-bold px-2 py-0.5 rounded text-[10px] uppercase ${
                order.paymentStatus === 'COMPLETED' 
                  ? 'bg-green-100 text-green-700' 
                  : 'bg-red-50 text-red-600'
              }`}>
                {order.paymentStatus}
              </span>
            </div>

            {/* Retry Payment Trigger if ONLINE & PENDING */}
            {order.payment?.method === 'ONLINE' && order.paymentStatus === 'PENDING' && (
              <button
                onClick={handleRetryPayment}
                disabled={isRetryingPayment}
                className="w-full bg-[#FF6B35] text-white text-xs font-bold py-2 rounded-xl hover:bg-[#e05623] transition-colors flex items-center justify-center gap-1.5 mt-2"
              >
                {isRetryingPayment ? 'Starting payment...' : 'Pay Now'}
                <CreditCard className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Order Summary list */}
          <div className="bg-white border border-[#EAE3D2] rounded-2xl p-5 space-y-4 shadow-xs">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ordered Items</h4>
            
            <div className="space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between items-start text-xs gap-3">
                  <div className="min-w-0">
                    <h5 className="font-semibold text-slate-800 truncate">{item.menuItem.name}</h5>
                    <p className="text-[9px] text-slate-400 mt-0.5">Qty: {item.quantity} • Price: ₹{item.priceAtOrder}</p>
                  </div>
                  <span className="font-bold text-slate-700 shrink-0">₹{item.priceAtOrder * item.quantity}</span>
                </div>
              ))}
            </div>

            <hr className="border-[#FAF6F0]" />

            <div className="space-y-1.5 text-xs text-slate-500">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>₹{order.totalAmount + order.discountAmount - order.deliveryFee}</span>
              </div>
              <div className="flex justify-between">
                <span>Delivery Fee</span>
                <span>₹{order.deliveryFee}</span>
              </div>
              {order.discountAmount > 0 && (
                <div className="flex justify-between text-green-700 font-semibold">
                  <span>Discount</span>
                  <span>-₹{order.discountAmount}</span>
                </div>
              )}
              <hr className="border-[#FAF6F0] pt-1" />
              <div className="flex justify-between text-sm font-bold text-slate-900">
                <span>Total Paid</span>
                <span className="text-base text-[#FF6B35]">₹{order.totalAmount}</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
