'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { 
  Search, 
  MapPin, 
  Star, 
  Clock, 
  Percent, 
  ChevronRight, 
  ShieldCheck, 
  Coffee, 
  ArrowRight,
  Pizza,
  UtensilsCrossed,
  Cake,
  Flame,
  BadgePercent
} from 'lucide-react';
import { useCampus } from '../../hooks/useCampus';

interface Restaurant {
  id: string;
  businessName: string;
  description: string;
  logoUrl: string | null;
  bannerUrl: string | null;
  avgRating: number;
  isOpenNow: boolean;
  menuCategories: { name: string }[];
  coupons: { code: string; discountType: string; value: number }[];
}

interface RestaurantsResponse {
  restaurants: Restaurant[];
  total: number;
  totalPages: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const categories = [
  { name: 'All', icon: UtensilsCrossed },
  { name: 'Beverages', icon: Coffee },
  { name: 'Quick Snacks', icon: Flame },
  { name: 'Mains', icon: Pizza },
  { name: 'Desserts', icon: Cake },
];

export default function CustomerHome() {
  const { selectedCampusId, selectedCampusName, deliveryAddress, setDeliveryAddress } = useCampus();
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchVal, setSearchVal] = useState('');

  // Fetch restaurants for the selected campus
  const { data, isLoading, error } = useQuery<RestaurantsResponse>({
    queryKey: ['restaurants', selectedCampusId, activeCategory],
    queryFn: async () => {
      if (!selectedCampusId) return { restaurants: [], total: 0, totalPages: 0 };
      
      const catParam = activeCategory !== 'All' ? `&cuisine=${activeCategory}` : '';
      const res = await fetch(`${API_URL}/restaurants?campusId=${selectedCampusId}&limit=12${catParam}`);
      if (!res.ok) throw new Error('Failed to fetch restaurants');
      return res.json();
    },
    enabled: !!selectedCampusId,
  });

  const restaurants = data?.restaurants || [];

  return (
    <div className="space-y-10">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-white border border-[#EAE3D2] rounded-3xl p-6 sm:p-10 shadow-xs">
        <div className="absolute right-0 top-0 -z-10 h-72 w-72 rounded-full bg-[#FF6B35]/5 blur-3xl" />
        
        <div className="max-w-2xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full bg-orange-50 border border-orange-100 px-3.5 py-1 text-xs font-semibold text-[#FF6B35]">
            <span className="flex h-2 w-2 rounded-full bg-[#FF6B35] animate-pulse" />
            Serving {selectedCampusName || 'Your Campus'}
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900 leading-tight">
            Crave it? We deliver it <span className="text-[#FF6B35]">to your desk</span>.
          </h1>
          
          <p className="text-sm sm:text-base text-slate-600 max-w-lg">
            Delicious meals, hot coffee, and snacks from your favorite campus canteens, delivered straight to your hostel room, library study desk, or classroom.
          </p>

          {/* Search bar redirection */}
          <div className="flex flex-col sm:flex-row gap-3 bg-[#FAF6F0] p-2.5 rounded-2xl border border-[#EAE3D2] max-w-xl">
            <div className="flex items-center gap-2 flex-1 px-2.5 py-2">
              <Search className="text-slate-400 h-4 w-4 shrink-0" />
              <input 
                type="text" 
                placeholder="Search canteens, drinks, rolls..." 
                value={searchVal}
                onChange={(e) => setSearchVal(e.target.value)}
                className="w-full bg-transparent border-0 outline-none text-xs text-slate-700 placeholder-slate-400 focus:ring-0"
              />
            </div>
            <Link 
              href={`/search?q=${searchVal}`}
              className="flex items-center justify-center gap-1 bg-[#FF6B35] hover:bg-[#e05623] text-white font-semibold text-xs px-5 py-3 rounded-xl transition-colors shadow-sm"
            >
              Find Food <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* Categories Row */}
      <section className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900">What are you craving?</h2>
        
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeCategory === cat.name;
            return (
              <button
                key={cat.name}
                onClick={() => setActiveCategory(cat.name)}
                className={`flex items-center gap-2 px-4.5 py-3 rounded-2xl border transition-all text-xs font-semibold shrink-0 shadow-xs ${
                  isActive 
                    ? 'bg-[#FF6B35] border-[#FF6B35] text-white' 
                    : 'bg-white border-[#EAE3D2] text-slate-600 hover:border-slate-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                {cat.name}
              </button>
            );
          })}
        </div>
      </section>

      {/* Promos / Deals Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Exclusive Deals</h2>
          <span className="text-xs font-semibold text-[#FF6B35] flex items-center gap-0.5 cursor-pointer">
            View All <ChevronRight className="h-3.5 w-3.5" />
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-[#FFF4EE] border border-[#FFD9C8] rounded-2xl p-5 flex items-start gap-4">
            <div className="h-10 w-10 bg-[#FF6B35] text-white rounded-xl flex items-center justify-center shrink-0 shadow-sm">
              <Percent className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[9px] font-extrabold uppercase bg-white border border-[#FFD9C8] text-[#FF6B35] px-1.5 py-0.5 rounded">
                Code: WELCOME100
              </span>
              <h3 className="font-bold text-slate-900 text-sm mt-1.5">Flat ₹100 Off</h3>
              <p className="text-xs text-slate-500 mt-0.5">Valid on orders above ₹300. Save on your first meal!</p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 flex items-start gap-4">
            <div className="h-10 w-10 bg-slate-700 text-white rounded-xl flex items-center justify-center shrink-0 shadow-sm">
              <BadgePercent className="h-5 w-5" />
            </div>
            <div>
              <span className="text-[9px] font-extrabold uppercase bg-white border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded">
                Code: CANT20
              </span>
              <h3 className="font-bold text-slate-900 text-sm mt-1.5">20% Off Canteen Central</h3>
              <p className="text-xs text-slate-500 mt-0.5">Up to ₹50 off. Valid on orders above ₹150.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Restaurants List */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Popular Near You</h2>
          <Link 
            href="/restaurants"
            className="text-xs font-semibold text-[#FF6B35] flex items-center gap-0.5"
          >
            See All Shops <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((n) => (
              <div key={n} className="bg-white border border-[#EAE3D2] rounded-2xl overflow-hidden shadow-xs animate-pulse">
                <div className="h-44 bg-slate-200 w-full" />
                <div className="p-4 space-y-3">
                  <div className="h-4 bg-slate-200 rounded w-2/3" />
                  <div className="h-3 bg-slate-200 rounded w-1/2" />
                  <div className="flex justify-between items-center pt-2">
                    <div className="h-4 bg-slate-200 rounded w-1/4" />
                    <div className="h-4 bg-slate-200 rounded w-1/4" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-xs">
            Failed to load canteens. Please check your network connection and API server.
          </div>
        ) : restaurants.length === 0 ? (
          <div className="text-center py-10 bg-white border border-[#EAE3D2] rounded-2xl">
            <p className="text-xs text-slate-400 font-semibold">No canteens open or matching filters in this campus yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {restaurants.map((res) => {
              // Custom default ETAs and Prices for visual layout
              const eta = res.businessName.includes('Nescafe') ? '8-12 Mins' : '15-20 Mins';
              const priceForOne = res.businessName.includes('Bakery') ? '₹100 for one' : '₹150 for one';
              const bannerPlaceholder = res.businessName.includes('Nescafe') 
                ? 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=500&auto=format&fit=crop&q=60'
                : res.businessName.includes('Canteen')
                ? 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=500&auto=format&fit=crop&q=60'
                : 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&auto=format&fit=crop&q=60';
              
              const activeCoupon = res.coupons?.[0];

              return (
                <Link 
                  key={res.id} 
                  href={`/restaurants/${res.id}`}
                  className="group bg-white border border-[#EAE3D2] rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col h-full"
                >
                  {/* Banner */}
                  <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
                    <img 
                      src={res.bannerUrl || bannerPlaceholder} 
                      alt={res.businessName}
                      className="h-full w-full object-cover group-hover:scale-103 transition-transform duration-300"
                    />
                    
                    {/* Discount Badge */}
                    {activeCoupon && (
                      <div className="absolute top-3 left-3 bg-[#FF6B35] text-white text-[9px] font-extrabold uppercase px-2 py-1 rounded-md shadow-sm flex items-center gap-1">
                        <Percent className="h-3 w-3" />
                        {activeCoupon.discountType === 'FLAT' 
                          ? `₹${activeCoupon.value} OFF` 
                          : `${activeCoupon.value}% OFF`}
                      </div>
                    )}

                    {/* Status Badge */}
                    {!res.isOpenNow && (
                      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center">
                        <span className="text-white text-xs font-extrabold tracking-wider uppercase bg-slate-800 border border-slate-700 px-3 py-1 rounded-md">
                          Closed
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Body info */}
                  <div className="p-4 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-slate-950 text-sm group-hover:text-[#FF6B35] transition-colors truncate">
                          {res.businessName}
                        </h3>
                        <div className="flex items-center gap-0.5 shrink-0 bg-green-50 text-green-700 text-[10px] font-extrabold px-1.5 py-0.5 rounded-md">
                          <Star className="h-3 w-3 fill-current" />
                          {res.avgRating.toFixed(1)}
                        </div>
                      </div>

                      <p className="text-xs text-slate-500 mt-1 line-clamp-1">
                        {res.description || 'Quality food items served fresh.'}
                      </p>
                    </div>

                    <div className="border-t border-[#FAF6F0] pt-3 mt-3 flex items-center justify-between text-[10px] font-medium text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3 text-slate-400" /> {eta}
                      </span>
                      <span>•</span>
                      <span>{priceForOne}</span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {/* Trust Section */}
      <section className="bg-slate-900 text-white rounded-3xl p-6 sm:p-10 shadow-lg grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="flex gap-4 items-start">
          <div className="h-10 w-10 bg-slate-800 border border-slate-700 text-[#FF6B35] rounded-xl flex items-center justify-center shrink-0">
            <Clock className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm">Superfast Campus Delivery</h3>
            <p className="text-xs text-slate-400 mt-1">Delivered to hostels, libraries, or lecture halls in under 15 minutes by student riders.</p>
          </div>
        </div>

        <div className="flex gap-4 items-start">
          <div className="h-10 w-10 bg-slate-800 border border-slate-700 text-[#FF6B35] rounded-xl flex items-center justify-center shrink-0">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm">Verified Vendors</h3>
            <p className="text-xs text-slate-400 mt-1">All canteens and shops are approved by campus administration to verify health standards.</p>
          </div>
        </div>

        <div className="flex gap-4 items-start">
          <div className="h-10 w-10 bg-slate-800 border border-slate-700 text-[#FF6B35] rounded-xl flex items-center justify-center shrink-0">
            <Percent className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm">Pocket Friendly</h3>
            <p className="text-xs text-slate-400 mt-1">Tailored for student budgets, with regular coupon codes and no heavy platform charges.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
