'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '../../../hooks/useCart';
import { useAuth } from '../../../hooks/useAuth';
import { useCampus } from '../../../hooks/useCampus';
import { 
  ShoppingBag, 
  MapPin, 
  Clock, 
  Tag, 
  CreditCard, 
  ChevronLeft,
  AlertTriangle,
  CheckCircle,
  ArrowRight
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const hostels = [
  'Vyas Bhawan',
  'Buddh Bhawan',
  'Shankar Bhawan',
  'Raman Bhawan',
  'Gandhi Bhawan',
  'Krishna Bhawan',
  'Meera Bhawan (Girls)',
  'Malaviya Bhawan (Girls)',
  'Vishwakarma Bhawan',
  'Srinivasa Ramanujan Bhawan'
];

const deliverySlots = [
  'As soon as possible (15-20 Mins)',
  '12:30 PM - 1:00 PM (Lunch Slot)',
  '1:00 PM - 1:30 PM (Lunch Slot)',
  '5:30 PM - 6:00 PM (Snacks Slot)',
  '8:30 PM - 9:00 PM (Dinner Slot)',
  '9:00 PM - 9:30 PM (Dinner Slot)'
];

export default function CheckoutPage() {
  const router = useRouter();
  const { cartItems, cartSubtotal, clearCart, vendorName } = useCart();
  const { user, dbUser } = useAuth();
  const { selectedCampusName } = useCampus();

  // Form states
  const [selectedHostel, setSelectedHostel] = useState(hostels[0]);
  const [roomNumber, setRoomNumber] = useState('');
  const [selectedSlot, setSelectedSlot] = useState(deliverySlots[0]);
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'ONLINE'>('ONLINE');
  const [idempotencyKey, setIdempotencyKey] = useState('');

  // Coupon states
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<any | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponSuccess, setCouponSuccess] = useState<string | null>(null);
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  // Submit states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Load Razorpay Script & Generate Idempotency Key on Mount
  useEffect(() => {
    // Generate unique idempotency key
    const key = 'cc_key_' + Math.random().toString(36).substring(2, 11) + '_' + Date.now();
    setIdempotencyKey(key);

    // Inject Razorpay SDK script
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  if (cartItems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 max-w-md mx-auto">
        <div className="h-16 w-16 bg-white border border-[#EAE3D2] rounded-full flex items-center justify-center shadow-xs">
          <ShoppingBag className="h-8 w-8 text-slate-300" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-slate-900">Your cart is empty</h2>
          <p className="text-xs text-slate-400 mt-1">Add items from canteens to proceed with checkout.</p>
        </div>
        <button 
          onClick={() => router.push('/')} 
          className="bg-[#FF6B35] text-white text-xs font-semibold px-6 py-2.5 rounded-xl shadow-xs"
        >
          Go Back Home
        </button>
      </div>
    );
  }

  // Calculate pricing values
  const deliveryFee = 15.0;
  let discount = 0;
  if (appliedCoupon) {
    if (appliedCoupon.discountType === 'FLAT') {
      discount = appliedCoupon.value;
    } else {
      discount = (cartSubtotal * appliedCoupon.value) / 100;
      if (appliedCoupon.maxDiscount) {
        discount = Math.min(discount, appliedCoupon.maxDiscount);
      }
    }
    discount = Math.min(discount, cartSubtotal);
  }
  const totalAmount = Math.max(0, cartSubtotal + deliveryFee - discount);

  // Validate coupon against database API
  const handleValidateCoupon = async () => {
    if (!couponCode.trim()) return;
    setIsValidatingCoupon(true);
    setCouponError(null);
    setCouponSuccess(null);

    try {
      const token = await user?.getIdToken();
      const res = await fetch(`${API_URL}/coupons/validate?code=${encodeURIComponent(couponCode.trim().toUpperCase())}&amount=${cartSubtotal}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const data = await res.json();

      if (res.ok && data.valid) {
        setAppliedCoupon(data.coupon);
        setCouponSuccess(`Coupon "${couponCode.toUpperCase()}" applied successfully!`);
      } else {
        setAppliedCoupon(null);
        setCouponError(data.message || 'Invalid coupon code');
      }
    } catch (e) {
      setCouponError('Network error. Failed to validate coupon.');
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomNumber.trim()) {
      setSubmitError('Please enter your Room or Hostel location details.');
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);

    const fullAddress = `Hostel: ${selectedHostel}, Room/Location: ${roomNumber.trim()} (${selectedCampusName})`;

    try {
      const token = await user?.getIdToken();
      const payload = {
        deliveryAddress: fullAddress,
        deliverySlot: selectedSlot,
        couponCode: appliedCoupon?.code || undefined,
        paymentMethod,
        idempotencyKey
      };

      const res = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to place order');
      }

      if (paymentMethod === 'COD') {
        clearCart();
        router.push(`/orders/${data.order.id}`);
      } else {
        // ONLINE - Trigger Razorpay Modal
        const rzpDetails = data.razorpay;

        if (rzpDetails.mock) {
          // Dev mock payment modal for quick local verification if real Razorpay fails
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
              clearCart();
              router.push(`/orders/${data.order.id}`);
            } else {
              setSubmitError('Mock payment verification failed.');
              setIsSubmitting(false);
            }
          } else {
            setSubmitError('Payment cancelled.');
            setIsSubmitting(false);
          }
          return;
        }

        const options = {
          key: rzpDetails.key,
          amount: rzpDetails.amount,
          currency: rzpDetails.currency,
          name: 'CampusCrave',
          description: `Order from ${vendorName}`,
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
                clearCart();
                router.push(`/orders/${data.order.id}`);
              } else {
                setSubmitError('Online payment verification signature check failed.');
              }
            } catch (err: any) {
              setSubmitError('Payment verification process encountered an error: ' + err.message);
            }
          },
          prefill: {
            name: dbUser?.name || '',
            email: dbUser?.email || ''
          },
          theme: {
            color: '#FF6B35'
          },
          modal: {
            ondismiss: function () {
              setSubmitError('Payment window closed. You can retry paying in order details.');
              setIsSubmitting(false);
            }
          }
        };

        const rzp = new (window as any).Razorpay(options);
        rzp.open();
      }
    } catch (err: any) {
      setSubmitError(err.message || 'Order placement failed.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Header back link */}
      <button 
        onClick={() => router.back()} 
        className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 transition-colors font-semibold"
      >
        <ChevronLeft className="h-4 w-4" /> Go Back to Shop
      </button>

      <h1 className="text-2xl font-bold text-slate-900">Secure Checkout</h1>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Side: Delivery Details & Payments (col-span-2) */}
        <form onSubmit={handlePlaceOrder} className="lg:col-span-2 space-y-6">
          
          {/* Section 1: Delivery Location */}
          <div className="bg-white border border-[#EAE3D2] rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-[#FAF6F0] pb-3">
              <MapPin className="h-4.5 w-4.5 text-[#FF6B35]" /> 1. Delivery Details
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Hostel Block</label>
                <select
                  value={selectedHostel}
                  onChange={(e) => setSelectedHostel(e.target.value)}
                  className="w-full bg-[#FAF6F0] border border-[#EAE3D2] rounded-xl px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-[#FF6B35]"
                >
                  {hostels.map(h => (
                    <option key={h} value={h}>{h}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Room No. / Table Details</label>
                <input 
                  type="text" 
                  placeholder="e.g. Room 314, library table 4"
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  required
                  className="w-full bg-white border border-[#EAE3D2] rounded-xl px-3.5 py-2.5 text-xs font-medium outline-none focus:border-[#FF6B35]"
                />
              </div>
            </div>

            <div className="space-y-1.5 pt-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Clock className="h-3 w-3" /> Delivery Time Slot
              </label>
              <select
                value={selectedSlot}
                onChange={(e) => setSelectedSlot(e.target.value)}
                className="w-full bg-[#FAF6F0] border border-[#EAE3D2] rounded-xl px-3.5 py-2.5 text-xs font-semibold outline-none focus:border-[#FF6B35]"
              >
                {deliverySlots.map(slot => (
                  <option key={slot} value={slot}>{slot}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Section 2: Payment Method */}
          <div className="bg-white border border-[#EAE3D2] rounded-2xl p-5 sm:p-6 space-y-4 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2 border-b border-[#FAF6F0] pb-3">
              <CreditCard className="h-4.5 w-4.5 text-[#FF6B35]" /> 2. Payment Method
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              
              {/* Online Payment option */}
              <div 
                onClick={() => setPaymentMethod('ONLINE')}
                className={`border p-4 rounded-xl cursor-pointer flex items-start gap-3 transition-all ${
                  paymentMethod === 'ONLINE' 
                    ? 'border-[#FF6B35] bg-orange-50/20' 
                    : 'border-[#EAE3D2] bg-white hover:border-slate-300'
                }`}
              >
                <div className={`h-4.5 w-4.5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                  paymentMethod === 'ONLINE' ? 'border-[#FF6B35]' : 'border-slate-300'
                }`}>
                  {paymentMethod === 'ONLINE' && <div className="h-2 w-2 rounded-full bg-[#FF6B35]" />}
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    Razorpay Online <span className="bg-[#FF6B35]/15 text-[#FF6B35] text-[8px] font-extrabold uppercase px-1 py-0.5 rounded">UPI/Cards</span>
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-1">Pay instantly using UPI, credit cards, or net banking. Highly recommended for contact-less delivery.</p>
                </div>
              </div>

              {/* COD option */}
              <div 
                onClick={() => setPaymentMethod('COD')}
                className={`border p-4 rounded-xl cursor-pointer flex items-start gap-3 transition-all ${
                  paymentMethod === 'COD' 
                    ? 'border-[#FF6B35] bg-orange-50/20' 
                    : 'border-[#EAE3D2] bg-white hover:border-slate-300'
                }`}
              >
                <div className={`h-4.5 w-4.5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                  paymentMethod === 'COD' ? 'border-[#FF6B35]' : 'border-slate-300'
                }`}>
                  {paymentMethod === 'COD' && <div className="h-2 w-2 rounded-full bg-[#FF6B35]" />}
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    Pay on Pickup <span className="bg-slate-100 text-slate-500 text-[8px] font-extrabold uppercase px-1 py-0.5 rounded">Cash/COD</span>
                  </h3>
                  <p className="text-[10px] text-slate-400 mt-1">Pay with cash or vendor UPI directly when you collect the order from canteen counters.</p>
                </div>
              </div>

            </div>
          </div>

          {/* Place Order Button (for submission) */}
          {submitError && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-xs flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{submitError}</span>
            </div>
          )}

          <button 
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#FF6B35] hover:bg-[#e05623] text-white font-semibold py-3.5 rounded-xl transition-all shadow-md shadow-orange-500/10 flex items-center justify-center gap-2 text-sm disabled:opacity-60"
          >
            {isSubmitting ? 'Processing Order...' : paymentMethod === 'ONLINE' ? 'Pay & Place Order' : 'Confirm & Place Order'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </form>

        {/* Right Side: Order Summary & Coupon Input (col-span-1) */}
        <div className="space-y-6">
          
          {/* Coupon Code Validation Card */}
          <div className="bg-white border border-[#EAE3D2] rounded-2xl p-5 space-y-4 shadow-xs">
            <h2 className="text-xs font-bold text-slate-900 flex items-center gap-1.5 uppercase tracking-wider pb-1">
              <Tag className="h-4 w-4 text-[#FF6B35]" /> Apply Coupon
            </h2>

            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="e.g. WELCOME100"
                value={couponCode}
                onChange={(e) => setCouponCode(e.target.value)}
                className="w-full bg-[#FAF6F0] border border-[#EAE3D2] rounded-xl px-3 py-2 text-xs font-semibold uppercase outline-none focus:border-[#FF6B35]"
              />
              <button
                type="button"
                onClick={handleValidateCoupon}
                disabled={isValidatingCoupon || !couponCode.trim()}
                className="bg-slate-900 text-white text-xs font-semibold px-4 rounded-xl hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                {isValidatingCoupon ? '...' : 'Apply'}
              </button>
            </div>

            {couponError && (
              <p className="text-[10px] text-red-600 font-medium flex items-center gap-1">
                <AlertTriangle className="h-3.5 w-3.5" /> {couponError}
              </p>
            )}

            {couponSuccess && (
              <p className="text-[10px] text-green-700 font-semibold flex items-center gap-1">
                <CheckCircle className="h-3.5 w-3.5" /> {couponSuccess}
              </p>
            )}
          </div>

          {/* Checkout Summary Card */}
          <div className="bg-white border border-[#EAE3D2] rounded-2xl p-5 space-y-4 shadow-xs">
            <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-[#FAF6F0] pb-3">
              Order Summary
            </h2>

            {/* Item list */}
            <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
              {cartItems.map((item) => (
                <div key={item.id} className="flex justify-between items-start text-xs gap-3">
                  <div className="min-w-0">
                    <h4 className="font-semibold text-slate-800 truncate">{item.name}</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">Qty: {item.quantity} × ₹{item.price}</p>
                  </div>
                  <span className="font-bold text-slate-700">₹{Number(item.price) * item.quantity}</span>
                </div>
              ))}
            </div>

            <hr className="border-[#FAF6F0]" />

            {/* Price breakdown */}
            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Subtotal</span>
                <span>₹{cartSubtotal}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Delivery Fee</span>
                <span>₹{deliveryFee.toFixed(2)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-700 font-semibold">
                  <span>Coupon Discount</span>
                  <span>-₹{discount.toFixed(2)}</span>
                </div>
              )}
              <hr className="border-[#FAF6F0] pt-1" />
              <div className="flex justify-between text-sm font-bold text-slate-900">
                <span>Grand Total</span>
                <span className="text-lg text-[#FF6B35]">₹{totalAmount.toFixed(2)}</span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
