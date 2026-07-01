'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useSearchParams } from 'next/navigation';
import { 
  Star, 
  Clock, 
  MapPin, 
  ChevronRight, 
  Plus, 
  Minus, 
  Percent, 
  Info,
  ShoppingBag,
  Check,
  AlertTriangle,
  Flame,
  ArrowRight
} from 'lucide-react';
import { useCart } from '../../../../hooks/useCart';

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  isVeg: boolean;
  isAvailable: boolean;
  prepTimeMinutes: number;
  discountPercent: number | null;
}

interface MenuCategory {
  id: string;
  name: string;
  sortOrder: number;
  menuItems: MenuItem[];
}

interface RestaurantDetail {
  id: string;
  businessName: string;
  description: string | null;
  logoUrl: string | null;
  bannerUrl: string | null;
  avgRating: number;
  isOpenNow: boolean;
  openingHours: any;
  campus: { name: string; address: string };
  menuCategories: MenuCategory[];
  coupons: { code: string; description: string; discountType: string; value: number; minOrderAmount: number }[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export default function RestaurantDetail() {
  const { id } = useParams();
  const searchParams = useSearchParams();
  const checkoutTriggered = searchParams.get('checkout') === 'true';

  const { cartItems, addToCart, updateQuantity, cartCount, cartSubtotal } = useCart();
  
  // Customization and conflict states
  const [selectedItemForCustomization, setSelectedItemForCustomization] = useState<any | null>(null);
  const [customizationOptions, setCustomizationOptions] = useState<string[]>([]);
  const [cartConflictVendor, setCartConflictVendor] = useState<{ id: string; name: string } | null>(null);
  const [pendingItemToAdd, setPendingItemToAdd] = useState<any | null>(null);

  // Fetch restaurant details and categories
  const { data: restaurant, isLoading, error } = useQuery<RestaurantDetail>({
    queryKey: ['restaurant-detail', id],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/restaurants/${id}`);
      if (!res.ok) throw new Error('Failed to fetch restaurant details');
      return res.json();
    },
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="space-y-8 animate-pulse">
        {/* Banner skeleton */}
        <div className="h-56 sm:h-72 bg-slate-200 rounded-3xl w-full" />
        {/* Info card skeleton */}
        <div className="bg-white border border-[#EAE3D2] p-6 rounded-2xl space-y-3">
          <div className="h-6 bg-slate-200 rounded w-1/3" />
          <div className="h-4 bg-slate-200 rounded w-1/4" />
          <div className="h-4 bg-slate-200 rounded w-1/2" />
        </div>
        {/* Menu grid skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="h-40 bg-slate-200 rounded-2xl hidden lg:block" />
          <div className="lg:col-span-3 space-y-6">
            {[1, 2].map((n) => (
              <div key={n} className="bg-white border border-[#EAE3D2] p-4 rounded-2xl h-32" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 p-6 rounded-2xl text-center">
        Failed to load restaurant menu. Please try again.
      </div>
    );
  }

  const handleAddItem = (item: MenuItem) => {
    // Check if customization is required (e.g. mock it for beverages or mains)
    const isBeverage = restaurant.businessName.includes('Nescafe') || item.name.toLowerCase().includes('latte') || item.name.toLowerCase().includes('frappe') || item.name.toLowerCase().includes('chai');
    const isBiryani = item.name.toLowerCase().includes('biryani');
    
    if ((isBeverage || isBiryani) && !selectedItemForCustomization) {
      setSelectedItemForCustomization({
        ...item,
        type: isBeverage ? 'beverage' : 'biryani'
      });
      setCustomizationOptions([]);
      return;
    }

    const res = addToCart(item, restaurant.id, restaurant.businessName);
    
    if (res.conflict) {
      setCartConflictVendor({ id: restaurant.id, name: restaurant.businessName });
      setPendingItemToAdd(item);
    }
  };

  const handleResolveConflict = (confirm: boolean) => {
    if (confirm && pendingItemToAdd) {
      // Clear cart is executed internally when we override local storage or call a clean add
      // Let's implement conflict override by clearing localStorage first
      localStorage.removeItem('CC:cart');
      localStorage.removeItem('CC:cart_vendor_id');
      localStorage.removeItem('CC:cart_vendor_name');
      window.location.reload(); // Quick reset to sync provider state
    }
    setCartConflictVendor(null);
    setPendingItemToAdd(null);
  };

  const handleApplyCustomization = () => {
    if (selectedItemForCustomization) {
      // Append option text to name or description for local cart state
      const customizedName = `${selectedItemForCustomization.name} (${customizationOptions.join(', ') || 'Regular'})`;
      const itemWithCustomization = {
        ...selectedItemForCustomization,
        name: customizedName
      };

      const res = addToCart(itemWithCustomization, restaurant.id, restaurant.businessName);
      if (res.conflict) {
        setCartConflictVendor({ id: restaurant.id, name: restaurant.businessName });
        setPendingItemToAdd(itemWithCustomization);
      }
      setSelectedItemForCustomization(null);
    }
  };

  const bannerPlaceholder = restaurant.businessName.includes('Nescafe') 
    ? 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=800&auto=format&fit=crop&q=80'
    : restaurant.businessName.includes('Canteen')
    ? 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&auto=format&fit=crop&q=80'
    : 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=800&auto=format&fit=crop&q=80';

  return (
    <div className="space-y-8 pb-24">
      {/* Restaurant Header Banner */}
      <section className="relative h-48 sm:h-64 rounded-3xl overflow-hidden bg-slate-100 border border-[#EAE3D2]">
        <img 
          src={restaurant.bannerUrl || bannerPlaceholder} 
          alt={restaurant.businessName}
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
        
        {/* Banner Details */}
        <div className="absolute bottom-6 left-6 right-6 text-white space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-md ${
              restaurant.isOpenNow ? 'bg-green-600' : 'bg-slate-700'
            }`}>
              {restaurant.isOpenNow ? 'Open Now' : 'Closed'}
            </span>
            <span className="text-xs text-slate-200 flex items-center gap-0.5">
              <MapPin className="h-3 w-3" /> {restaurant.campus.name}
            </span>
          </div>

          <h1 className="text-xl sm:text-3xl font-bold">{restaurant.businessName}</h1>
          <p className="text-xs sm:text-sm text-slate-300 max-w-xl line-clamp-2">
            {restaurant.description || 'Tasty delicacies prepared fresh on demand.'}
          </p>
        </div>
      </section>

      {/* Info & Promos Widget */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-white border border-[#EAE3D2] p-5 rounded-2xl shadow-xs">
        {/* Rating */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-green-50 text-green-700 rounded-xl flex items-center justify-center font-bold text-sm shrink-0">
            <Star className="h-5 w-5 fill-current" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">{restaurant.avgRating.toFixed(1)} ★ Rating</h3>
            <p className="text-xs text-slate-400 mt-0.5">Based on student orders</p>
          </div>
        </div>

        {/* Avg preparation time */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-orange-50 text-[#FF6B35] rounded-xl flex items-center justify-center font-bold text-sm shrink-0">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">12-15 Mins</h3>
            <p className="text-xs text-slate-400 mt-0.5">Average delivery ETA</p>
          </div>
        </div>

        {/* Coupons banner */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-orange-50 text-[#FF6B35] rounded-xl flex items-center justify-center font-bold text-sm shrink-0">
            <Percent className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              {restaurant.coupons?.[0]?.code || 'WELCOME100'} Active
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {restaurant.coupons?.[0]?.description || 'Save flat on order checkouts'}
            </p>
          </div>
        </div>
      </section>

      {/* Categories & Menu Items Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left Side Category Scroll Spy (Desktop) */}
        <div className="space-y-2 bg-white border border-[#EAE3D2] rounded-2xl p-4 shadow-xs h-fit hidden lg:block sticky top-24">
          <h2 className="font-bold text-xs text-slate-400 uppercase tracking-wider px-2 pb-2 border-b border-[#FAF6F0]">
            Menu Category
          </h2>
          <div className="flex flex-col gap-1 pt-1.5">
            {restaurant.menuCategories.map((cat) => (
              <a 
                key={cat.id}
                href={`#cat-${cat.id}`}
                className="text-left text-xs font-semibold py-2 px-3 rounded-xl hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors"
              >
                {cat.name} ({cat.menuItems.length})
              </a>
            ))}
          </div>
        </div>

        {/* Right Side Menu items (col-span-3) */}
        <div className="lg:col-span-3 space-y-10">
          {restaurant.menuCategories.map((cat) => (
            <div key={cat.id} id={`cat-${cat.id}`} className="space-y-4 scroll-mt-24">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                {cat.name}
                <span className="h-1.5 w-1.5 rounded-full bg-[#FF6B35]" />
              </h2>

              <div className="grid grid-cols-1 gap-4">
                {cat.menuItems.map((item) => {
                  const cartItem = cartItems.find((i) => i.id === item.id);
                  const imagePlaceholder = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=150&auto=format&fit=crop&q=80';

                  return (
                    <div 
                      key={item.id} 
                      className="bg-white border border-[#EAE3D2] p-4 rounded-2xl flex gap-4 items-center shadow-xs"
                    >
                      {/* Veg indicator + item text */}
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <div className={`h-4 w-4 shrink-0 flex items-center justify-center border rounded-xs ${item.isVeg ? 'border-green-600' : 'border-red-600'} p-0.5`}>
                            <div className={`h-1.5 w-1.5 rounded-full ${item.isVeg ? 'bg-green-600' : 'bg-red-600'}`} />
                          </div>
                          <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            {item.isVeg ? 'Veg' : 'Non-Veg'}
                          </span>
                        </div>

                        <h3 className="font-bold text-slate-950 text-sm">{item.name}</h3>
                        <p className="text-xs text-slate-500 line-clamp-2 pr-4">
                          {item.description || 'Prepared fresh using high quality ingredients.'}
                        </p>

                        <div className="pt-2 flex items-center gap-3">
                          <span className="font-bold text-slate-800 text-xs">
                            ₹{item.price}
                          </span>
                          {item.discountPercent && (
                            <span className="text-[10px] text-green-700 bg-green-50 px-1.5 py-0.5 rounded-md font-bold">
                              {item.discountPercent}% Off
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Add button / stepper / Image */}
                      <div className="relative flex flex-col items-center justify-center shrink-0 w-24 h-24 sm:w-28 sm:h-28">
                        <img 
                          src={item.imageUrl || imagePlaceholder} 
                          alt={item.name}
                          className="h-20 w-20 sm:h-24 sm:w-24 object-cover rounded-2xl border border-[#EAE3D2]"
                        />

                        {/* Button wrapper */}
                        <div className="absolute -bottom-2">
                          {cartItem ? (
                            <div className="flex items-center border border-[#FF6B35] rounded-xl bg-white text-[#FF6B35] overflow-hidden shadow-sm h-8">
                              <button 
                                onClick={() => updateQuantity(item.id, cartItem.quantity - 1)}
                                className="px-2 py-1 hover:bg-orange-50 font-bold"
                              >
                                <Minus className="h-3 w-3" />
                              </button>
                              <span className="px-2 text-xs font-extrabold min-w-[20px] text-center">
                                {cartItem.quantity}
                              </span>
                              <button 
                                onClick={() => updateQuantity(item.id, cartItem.quantity + 1)}
                                className="px-2 py-1 hover:bg-orange-50 font-bold"
                              >
                                <Plus className="h-3 w-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleAddItem(item)}
                              disabled={!item.isAvailable}
                              className="bg-white border border-[#EAE3D2] text-[#FF6B35] hover:bg-orange-50 text-xs font-bold px-4 py-1.5 rounded-xl shadow-sm transition-colors border-orange-200/50"
                            >
                              ADD
                            </button>
                          )}
                        </div>
                      </div>

                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* Sticky Cart Summary Bar */}
      {cartCount > 0 && cartItems[0]?.vendorId === restaurant.id && (
        <div className="fixed bottom-18 md:bottom-6 left-4 right-4 z-40 bg-[#FF6B35] text-white p-4 rounded-2xl shadow-xl flex items-center justify-between max-w-xl mx-auto border border-[#ff8555]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 bg-white/20 rounded-xl flex items-center justify-center">
              <ShoppingBag className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="text-[10px] text-orange-100 font-bold uppercase tracking-wider">{cartCount} Item{cartCount > 1 && 's'}</p>
              <h3 className="font-bold text-sm">₹{cartSubtotal} <span className="text-xs font-normal text-orange-200">(Subtotal)</span></h3>
            </div>
          </div>
          <button 
            onClick={() => {
              // Target click of header cart drawer (which can be open by changing state or triggering custom events)
              // Let's emit a click on the layout cart trigger or just reload/scroll
              const cartTrigger = document.querySelector('[class*="ShoppingBag"]')?.parentElement;
              if (cartTrigger) (cartTrigger as HTMLButtonElement).click();
            }}
            className="bg-white text-[#FF6B35] text-xs font-bold px-4.5 py-2.5 rounded-xl flex items-center gap-1 hover:bg-slate-50 transition-colors shadow-sm"
          >
            View Cart <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Cart Conflict Dialog */}
      {cartConflictVendor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs" />
          <div className="relative bg-white border border-[#EAE3D2] max-w-md w-full rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-600 bg-amber-50 p-3 rounded-xl border border-amber-200">
              <AlertTriangle className="h-6 w-6 shrink-0" />
              <div>
                <h3 className="font-bold text-sm">Replace cart items?</h3>
                <p className="text-xs text-slate-500 mt-0.5">Your cart contains items from another restaurant.</p>
              </div>
            </div>
            <p className="text-xs text-slate-600">
              You can only order from one shop at a time. Ordering from <span className="font-bold text-slate-800">{cartConflictVendor.name}</span> will clear your current cart items. Do you want to proceed?
            </p>
            <div className="flex gap-3 justify-end pt-2">
              <button 
                onClick={() => handleResolveConflict(false)}
                className="border border-[#EAE3D2] px-4 py-2 rounded-xl text-xs font-semibold hover:bg-slate-50 text-slate-600"
              >
                Cancel
              </button>
              <button 
                onClick={() => handleResolveConflict(true)}
                className="bg-[#FF6B35] hover:bg-[#e05623] text-white px-4 py-2 rounded-xl text-xs font-semibold transition-colors"
              >
                Clear & Add Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Item Customization Drawer / Modal */}
      {selectedItemForCustomization && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs" onClick={() => setSelectedItemForCustomization(null)} />
          <div className="relative bg-[#FAF6F0] border border-[#EAE3D2] max-w-md w-full rounded-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
            {/* Header */}
            <div className="bg-white border-b border-[#EAE3D2] p-5">
              <h3 className="font-bold text-slate-900 text-sm">Customize Item</h3>
              <p className="text-xs text-slate-400 mt-0.5">{selectedItemForCustomization.name}</p>
            </div>

            {/* Customization Body */}
            <div className="p-6 overflow-y-auto space-y-5">
              {selectedItemForCustomization.type === 'beverage' ? (
                <>
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Size</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {['Regular', 'Large'].map((opt) => (
                        <button
                          key={opt}
                          onClick={() => setCustomizationOptions(prev => prev.filter(x => x !== 'Regular' && x !== 'Large').concat(opt))}
                          className={`border text-xs py-2 px-3 rounded-xl font-bold transition-all text-center ${
                            customizationOptions.includes(opt) 
                              ? 'bg-orange-50 border-[#FF6B35] text-[#FF6B35]' 
                              : 'bg-white border-[#EAE3D2] text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Choice of Milk</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {['Dairy Milk', 'Almond Milk (+₹30)'].map((opt) => (
                        <button
                          key={opt}
                          onClick={() => setCustomizationOptions(prev => prev.filter(x => !x.includes('Milk')).concat(opt))}
                          className={`border text-xs py-2 px-3 rounded-xl font-bold transition-all text-center ${
                            customizationOptions.includes(opt) 
                              ? 'bg-orange-50 border-[#FF6B35] text-[#FF6B35]' 
                              : 'bg-white border-[#EAE3D2] text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Spice Level</h4>
                    <div className="grid grid-cols-3 gap-2">
                      {['Mild', 'Medium', 'Spicy'].map((opt) => (
                        <button
                          key={opt}
                          onClick={() => setCustomizationOptions(prev => prev.filter(x => x !== 'Mild' && x !== 'Medium' && x !== 'Spicy').concat(opt))}
                          className={`border text-xs py-2 px-3 rounded-xl font-bold transition-all text-center ${
                            customizationOptions.includes(opt) 
                              ? 'bg-orange-50 border-[#FF6B35] text-[#FF6B35]' 
                              : 'bg-white border-[#EAE3D2] text-slate-600 hover:border-slate-300'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="bg-white border-t border-[#EAE3D2] p-5 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-900">₹{selectedItemForCustomization.price}</span>
              <button 
                onClick={handleApplyCustomization}
                className="bg-[#FF6B35] hover:bg-[#e05623] text-white text-xs font-bold px-6 py-2.5 rounded-xl transition-colors shadow-sm"
              >
                Apply & Add Item
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
