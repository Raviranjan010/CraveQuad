'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Home, 
  Search as SearchIcon, 
  ShoppingBag, 
  User, 
  MapPin, 
  X, 
  Plus, 
  Minus, 
  Trash2,
  ChevronRight
} from 'lucide-react';
import { useCampus } from '../../hooks/useCampus';
import { useCart } from '../../hooks/useCart';
import { useAuth } from '../../hooks/useAuth';

export default function CustomerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { campuses, selectedCampusId, selectedCampusName, setCampus, deliveryAddress, setDeliveryAddress } = useCampus();
  const { cartItems, cartCount, cartSubtotal, updateQuantity, removeFromCart, clearCart, vendorId, vendorName } = useCart();
  const { dbUser, logout } = useAuth();
  
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAddressEditing, setIsAddressEditing] = useState(false);
  const [tempAddress, setTempAddress] = useState(deliveryAddress);

  const handleAddressSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDeliveryAddress(tempAddress);
    setIsAddressEditing(false);
  };

  const activeTabClass = "text-orange-500 font-semibold";
  const inactiveTabClass = "text-slate-500 hover:text-slate-800";

  return (
    <div className="min-h-screen bg-[#FAF6F0] text-[#1E2229] font-sans pb-16 md:pb-0 flex flex-col">
      {/* Top Header */}
      <header className="sticky top-0 z-40 w-full border-b border-[#EAE3D2] bg-[#FAF6F0]/90 backdrop-blur-md">
        <div className="container mx-auto max-w-7xl flex h-16 items-center justify-between px-4 sm:px-6">
          {/* Logo & Brand */}
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#FF6B35] text-white font-bold text-lg shadow-sm">
                CC
              </div>
              <span className="text-xl font-bold tracking-tight text-slate-900 hidden sm:inline">
                Campus<span className="text-[#FF6B35]">Crave</span>
              </span>
            </Link>

            {/* Campus Selector */}
            <div className="relative flex items-center gap-1.5 bg-white border border-[#EAE3D2] px-3 py-1.5 rounded-xl shadow-xs">
              <MapPin className="text-[#FF6B35] h-4 w-4 shrink-0" />
              <select 
                value={selectedCampusId || ''} 
                onChange={(e) => {
                  const selected = campuses.find(c => c.id === e.target.value);
                  if (selected) setCampus(selected.id, selected.name);
                }}
                className="bg-transparent border-0 outline-none text-xs font-semibold text-slate-700 pr-4 focus:ring-0 cursor-pointer max-w-[150px] md:max-w-[220px] truncate"
              >
                {campuses.map((c) => (
                  <option key={c.id} value={c.id} className="text-slate-800">
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Delivery Address Field (Desktop) */}
          <div className="hidden md:flex items-center gap-2 flex-1 max-w-md mx-6">
            {isAddressEditing ? (
              <form onSubmit={handleAddressSubmit} className="flex items-center gap-2 w-full">
                <input 
                  type="text"
                  value={tempAddress}
                  onChange={(e) => setTempAddress(e.target.value)}
                  placeholder="Enter hostel, room, or library table..."
                  className="w-full text-xs bg-white border border-[#EAE3D2] rounded-xl px-3 py-1.5 outline-none focus:border-[#FF6B35] text-slate-700"
                  autoFocus
                />
                <button 
                  type="submit" 
                  className="bg-[#FF6B35] hover:bg-[#e05623] text-white text-xs px-3 py-1.5 rounded-xl transition-colors font-medium"
                >
                  Save
                </button>
              </form>
            ) : (
              <div 
                onClick={() => {
                  setTempAddress(deliveryAddress);
                  setIsAddressEditing(true);
                }}
                className="flex items-center gap-2 cursor-pointer bg-white/60 hover:bg-white border border-dashed border-[#EAE3D2] rounded-xl px-3 py-1.5 w-full transition-all"
              >
                <span className="text-xs text-slate-400">Deliver to:</span>
                <span className="text-xs font-medium text-slate-700 truncate">
                  {deliveryAddress || 'Click to set room / location...'}
                </span>
              </div>
            )}
          </div>

          {/* Desktop Right Actions */}
          <div className="flex items-center gap-4">
            {/* Cart Button */}
            <button 
              onClick={() => setIsCartOpen(true)}
              className="relative flex items-center justify-center p-2 rounded-xl bg-white border border-[#EAE3D2] hover:bg-slate-50 transition-colors shadow-xs"
            >
              <ShoppingBag className="h-5 w-5 text-slate-700" />
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-[#FF6B35] text-white text-[10px] font-bold shadow-sm">
                  {cartCount}
                </span>
              )}
            </button>

            {/* Profile Dropdown / Login */}
            {dbUser ? (
              <div className="flex items-center gap-2">
                <Link 
                  href="/profile" 
                  className="hidden sm:flex items-center gap-2 bg-white border border-[#EAE3D2] px-3 py-1.5 rounded-xl shadow-xs hover:bg-slate-50 transition-colors"
                >
                  <User className="h-4 w-4 text-slate-600" />
                  <span className="text-xs font-semibold text-slate-700 truncate max-w-[100px]">
                    {dbUser.name}
                  </span>
                </Link>
                <button 
                  onClick={logout} 
                  className="text-xs text-slate-500 hover:text-red-500 transition-colors"
                >
                  Logout
                </button>
              </div>
            ) : (
              <Link 
                href="/login" 
                className="bg-[#FF6B35] hover:bg-[#e05623] text-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors shadow-xs shadow-orange-500/10"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Address Bar for Mobile */}
      <div className="md:hidden w-full bg-[#FAF6F0] px-4 py-2 border-b border-[#EAE3D2]">
        {isAddressEditing ? (
          <form onSubmit={handleAddressSubmit} className="flex items-center gap-2">
            <input 
              type="text"
              value={tempAddress}
              onChange={(e) => setTempAddress(e.target.value)}
              placeholder="Enter room, library desk, etc..."
              className="w-full text-xs bg-white border border-[#EAE3D2] rounded-xl px-3 py-2 outline-none focus:border-[#FF6B35]"
              autoFocus
            />
            <button 
              type="submit" 
              className="bg-[#FF6B35] text-white text-xs px-3 py-2 rounded-xl"
            >
              Save
            </button>
          </form>
        ) : (
          <div 
            onClick={() => {
              setTempAddress(deliveryAddress);
              setIsAddressEditing(true);
            }}
            className="flex items-center gap-2 bg-white/80 border border-dashed border-[#EAE3D2] rounded-xl px-3 py-2 cursor-pointer"
          >
            <span className="text-[10px] text-slate-400 uppercase font-bold shrink-0">Deliver:</span>
            <span className="text-xs text-slate-700 truncate">
              {deliveryAddress || 'Tap to add room / location details'}
            </span>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <main className="flex-1 container mx-auto max-w-7xl px-4 sm:px-6 py-6">
        {children}
      </main>

      {/* Bottom Nav for Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-[#EAE3D2] h-16 flex items-center justify-around px-4 shadow-lg">
        <Link 
          href="/" 
          className={`flex flex-col items-center gap-1 text-[10px] font-medium ${pathname === '/' ? activeTabClass : inactiveTabClass}`}
        >
          <Home className="h-5 w-5" />
          <span>Home</span>
        </Link>
        <Link 
          href="/search" 
          className={`flex flex-col items-center gap-1 text-[10px] font-medium ${pathname === '/search' ? activeTabClass : inactiveTabClass}`}
        >
          <SearchIcon className="h-5 w-5" />
          <span>Search</span>
        </Link>
        <button 
          onClick={() => setIsCartOpen(true)}
          className={`flex flex-col items-center gap-1 text-[10px] font-medium relative ${isCartOpen ? activeTabClass : inactiveTabClass}`}
        >
          <ShoppingBag className="h-5 w-5" />
          {cartCount > 0 && (
            <span className="absolute top-0 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#FF6B35] text-white text-[8px] font-bold">
              {cartCount}
            </span>
          )}
          <span>Cart</span>
        </button>
        <Link 
          href="/profile" 
          className={`flex flex-col items-center gap-1 text-[10px] font-medium ${pathname === '/profile' ? activeTabClass : inactiveTabClass}`}
        >
          <User className="h-5 w-5" />
          <span>Profile</span>
        </Link>
      </nav>

      {/* Cart Drawer */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden">
          {/* Overlay */}
          <div 
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" 
            onClick={() => setIsCartOpen(false)}
          />

          {/* Drawer container */}
          <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
            <div className="w-screen max-w-md bg-[#FAF6F0] shadow-2xl flex flex-col">
              {/* Drawer Header */}
              <div className="px-6 py-5 border-b border-[#EAE3D2] flex items-center justify-between bg-white">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <ShoppingBag className="text-[#FF6B35] h-5 w-5" /> Your Cart
                  </h2>
                  {vendorName && (
                    <p className="text-xs text-slate-400 mt-0.5">
                      From <span className="font-semibold text-slate-600">{vendorName}</span>
                    </p>
                  )}
                </div>
                <button 
                  onClick={() => setIsCartOpen(false)}
                  className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Drawer Body (Items) */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                {cartItems.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center space-y-3">
                    <div className="h-16 w-16 bg-[#FAF6F0] border border-[#EAE3D2] rounded-full flex items-center justify-center shadow-inner">
                      <ShoppingBag className="h-8 w-8 text-slate-300" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-800">Your cart is empty</h3>
                      <p className="text-xs text-slate-400 mt-1 max-w-[200px]">
                        Add items from campus canteens and shops to get started.
                      </p>
                    </div>
                  </div>
                ) : (
                  cartItems.map((item) => (
                    <div 
                      key={item.id} 
                      className="bg-white border border-[#EAE3D2] p-4 rounded-2xl flex items-start gap-3 shadow-xs"
                    >
                      {/* Veg indicator badge */}
                      <div className={`h-4 w-4 shrink-0 flex items-center justify-center border rounded-xs ${item.isVeg ? 'border-green-600' : 'border-red-600'} p-0.5`}>
                        <div className={`h-1.5 w-1.5 rounded-full ${item.isVeg ? 'bg-green-600' : 'bg-red-600'}`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-semibold text-slate-900 truncate">
                          {item.name}
                        </h4>
                        <p className="text-xs font-bold text-slate-600 mt-1">
                          ₹{Number(item.price) * item.quantity}
                        </p>
                      </div>

                      {/* Controls */}
                      <div className="flex items-center border border-[#EAE3D2] rounded-lg bg-slate-50 overflow-hidden">
                        <button 
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="px-2 py-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-700"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="px-2 text-xs font-bold text-slate-700 min-w-[20px] text-center">
                          {item.quantity}
                        </span>
                        <button 
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="px-2 py-1.5 hover:bg-slate-100 text-slate-500 hover:text-slate-700"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Delete */}
                      <button 
                        onClick={() => removeFromCart(item.id)}
                        className="text-slate-400 hover:text-red-500 p-1.5 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              {/* Drawer Footer */}
              {cartItems.length > 0 && (
                <div className="p-6 border-t border-[#EAE3D2] bg-white space-y-4">
                  <div className="flex items-center justify-between text-sm font-medium">
                    <span className="text-slate-500">Subtotal</span>
                    <span className="text-lg font-bold text-slate-900">₹{cartSubtotal}</span>
                  </div>

                  <div className="flex gap-3">
                    <button 
                      onClick={clearCart}
                      className="border border-[#EAE3D2] hover:bg-slate-50 text-slate-600 font-semibold text-xs px-4 py-3 rounded-xl transition-colors shrink-0"
                    >
                      Clear
                    </button>
                    <Link 
                      href={`/restaurants/${vendorId}?checkout=true`}
                      onClick={() => setIsCartOpen(false)}
                      className="flex-1 bg-[#FF6B35] hover:bg-[#e05623] text-white font-semibold text-xs px-6 py-3 rounded-xl flex items-center justify-center gap-2 shadow-md shadow-orange-500/10 transition-colors"
                    >
                      Checkout <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
