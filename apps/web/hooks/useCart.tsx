'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

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

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [vendorId, setVendorId] = useState<string | null>(null);
  const [vendorName, setVendorName] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load cart from localStorage on mount
  useEffect(() => {
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
  }, []);

  // Save cart to localStorage on changes
  useEffect(() => {
    if (!isLoaded) return;
    try {
      localStorage.setItem('CC:cart', JSON.stringify(cartItems));
      if (vendorId) {
        localStorage.setItem('CC:cart_vendor_id', vendorId);
      } else {
        localStorage.removeItem('CC:cart_vendor_id');
      }
      if (vendorName) {
        localStorage.setItem('CC:cart_vendor_name', vendorName);
      } else {
        localStorage.removeItem('CC:cart_vendor_name');
      }
    } catch (e) {
      console.error('Failed to save cart to local storage', e);
    }
  }, [cartItems, vendorId, vendorName, isLoaded]);

  const addToCart = (item: any, itemVendorId: string, itemVendorName: string) => {
    // Enforce single-vendor rule
    if (vendorId && vendorId !== itemVendorId && cartItems.length > 0) {
      return { success: false, conflict: true };
    }

    setCartItems((prev) => {
      const existingIndex = prev.findIndex((i) => i.id === item.id);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex].quantity += 1;
        return updated;
      } else {
        return [
          ...prev,
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
    });

    if (!vendorId) {
      setVendorId(itemVendorId);
      setVendorName(itemVendorName);
    }

    return { success: true };
  };

  const updateQuantity = (itemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId);
      return;
    }

    setCartItems((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, quantity } : item)),
    );
  };

  const removeFromCart = (itemId: string) => {
    setCartItems((prev) => {
      const updated = prev.filter((item) => item.id !== itemId);
      if (updated.length === 0) {
        setVendorId(null);
        setVendorName(null);
      }
      return updated;
    });
  };

  const clearCart = () => {
    setCartItems([]);
    setVendorId(null);
    setVendorName(null);
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
