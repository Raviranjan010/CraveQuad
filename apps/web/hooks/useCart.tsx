'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './useAuth';

export interface CartItem {
  id: string;
  name: string;
  price: string | number;
  quantity: number;
  isVeg: boolean;
  vendorId: string;
  imageUrl?: string | null;
}

interface CartContextType {
  cartItems: CartItem[];
  vendorId: string | null;
  vendorName: string | null;
  addToCart: (item: any, vendorId: string, vendorName: string) => { success: boolean; conflict?: boolean };
  updateQuantity: (itemId: string, quantity: number) => void;
  removeFromCart: (itemId: string) => void;
  clearCart: () => void;
  cartCount: number;
  cartSubtotal: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [vendorName, setVendorName] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Sync cart from server when user login state changes
  useEffect(() => {
    async function syncFromServer() {
      if (!user) {
        // If logged out, load from localStorage
        try {
          const storedCart = localStorage.getItem('CC:cart');
          const storedVendorId = localStorage.getItem('CC:cart_vendor_id');
          const storedVendorName = localStorage.getItem('CC:cart_vendor_name');

          if (storedCart) setCartItems(JSON.parse(storedCart));
          if (storedVendorId) setVendorId(storedVendorId);
          if (storedVendorName) setVendorName(storedVendorName);
        } catch (e) {
          console.error('Failed to load cart from local storage', e);
        }
        setIsLoaded(true);
        return;
      }

      // Logged in: fetch from backend
      try {
        const token = await user.getIdToken();
        const res = await fetch(`${API_URL}/cart`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          // If server cart has items, use it
          if (data.cartItems && data.cartItems.length > 0) {
            setCartItems(data.cartItems);
            setVendorId(data.vendorId);
            setVendorName(data.vendorName);
          } else {
            // Server cart is empty, but if local cart has items, sync to server
            const storedCart = localStorage.getItem('CC:cart');
            const storedVendorId = localStorage.getItem('CC:cart_vendor_id');
            const storedVendorName = localStorage.getItem('CC:cart_vendor_name');
            const localItems = storedCart ? JSON.parse(storedCart) : [];

            if (localItems.length > 0 && storedVendorId) {
              setCartItems(localItems);
              setVendorId(storedVendorId);
              setVendorName(storedVendorName);
              // Push to server
              await fetch(`${API_URL}/cart`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                  vendorId: storedVendorId,
                  items: localItems.map((item: any) => ({ id: item.id, quantity: item.quantity })),
                }),
              });
            }
          }
        }
      } catch (err) {
        console.error('Failed to sync cart from server:', err);
      }
      setIsLoaded(true);
    }

    syncFromServer();
  }, [user]);

  // Sync local changes to server & localStorage
  const syncCart = async (newItems: CartItem[], newVendorId: string | null, newVendorName: string | null) => {
    setCartItems(newItems);
    setVendorId(newVendorId);
    setVendorName(newVendorName);

    // Save to localStorage
    try {
      localStorage.setItem('CC:cart', JSON.stringify(newItems));
      if (newVendorId) {
        localStorage.setItem('CC:cart_vendor_id', newVendorId);
      } else {
        localStorage.removeItem('CC:cart_vendor_id');
      }
      if (newVendorName) {
        localStorage.setItem('CC:cart_vendor_name', newVendorName);
      } else {
        localStorage.removeItem('CC:cart_vendor_name');
      }
    } catch (e) {
      console.error('Failed to save to localStorage', e);
    }

    // Save to server if logged in
    if (user) {
      try {
        const token = await user.getIdToken();
        if (newItems.length === 0 || !newVendorId) {
          await fetch(`${API_URL}/cart`, {
            method: 'DELETE',
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });
        } else {
          await fetch(`${API_URL}/cart`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              vendorId: newVendorId,
              items: newItems.map((item) => ({ id: item.id, quantity: item.quantity })),
            }),
          });
        }
      } catch (err) {
        console.error('Failed to sync cart update to server:', err);
      }
    }
  };

  const addToCart = (item: any, itemVendorId: string, itemVendorName: string) => {
    // Enforce single-vendor rule
    if (vendorId && vendorId !== itemVendorId && cartItems.length > 0) {
      return { success: false, conflict: true };
    }

    const existingIndex = cartItems.findIndex((i) => i.id === item.id);
    let updated;
    if (existingIndex > -1) {
      updated = [...cartItems];
      updated[existingIndex].quantity += 1;
    } else {
      updated = [
        ...cartItems,
        {
          id: item.id,
          name: item.name,
          price: Number(item.price),
          quantity: 1,
          isVeg: item.isVeg,
          vendorId: itemVendorId,
          imageUrl: item.imageUrl,
        },
      ];
    }

    const newVendorId = vendorId || itemVendorId;
    const newVendorName = vendorName || itemVendorName;

    syncCart(updated, newVendorId, newVendorName);
    return { success: true };
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }

    const updated = cartItems.map((item) => (item.id === itemId ? { ...item, quantity } : item));
    syncCart(updated, vendorId, vendorName);
  };

  const removeFromCart = (itemId: string) => {
    const updated = cartItems.filter((item) => item.id !== itemId);
    const newVendorId = updated.length === 0 ? null : vendorId;
    const newVendorName = updated.length === 0 ? null : vendorName;
    syncCart(updated, newVendorId, newVendorName);
  };

  const clearCart = () => {
    syncCart([], null, null);
  };

  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);
  const cartSubtotal = cartItems.reduce((acc, item) => acc + Number(item.price) * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cartItems,
        vendorId,
        vendorName,
        addToCart,
        updateQuantity,
        removeFromCart,
        clearCart,
        cartCount,
        cartSubtotal,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
