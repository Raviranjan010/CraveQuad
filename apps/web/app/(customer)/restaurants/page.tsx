'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { 
  Star, 
  Clock, 
  Percent, 
  Search, 
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Award
} from 'lucide-react';
import { useCampus } from '../../../hooks/useCampus';

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
  page: number;
  limit: number;
  totalPages: number;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const cuisines = ['All', 'Beverages', 'Quick Snacks', 'Mains', 'Desserts', 'South Indian'];

export default function RestaurantList() {
  const { selectedCampusId, selectedCampusName } = useCampus();
  
  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedCuisine, setSelectedCuisine] = useState('All');
  const [minRating, setMinRating] = useState<number | null>(null);
  const [vegOnly, setVegOnly] = useState(false);
  const [sortBy, setSortBy] = useState('rating');
  const [page, setPage] = useState(1);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setPage(1); // Reset page on search change
    }, 400);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Refetch when filters change
  const { data, isLoading, error } = useQuery<RestaurantsResponse>({
    queryKey: ['restaurants-list', selectedCampusId, debouncedSearch, selectedCuisine, minRating, vegOnly, sortBy, page],
    queryFn: async () => {
      if (!selectedCampusId) return { restaurants: [], total: 0, page: 1, limit: 10, totalPages: 0 };
      
      let url = `${API_URL}/restaurants?campusId=${selectedCampusId}&page=${page}&limit=9&sortBy=${sortBy}`;
      
      if (debouncedSearch) url += `&search=${encodeURIComponent(debouncedSearch)}`;
      if (selectedCuisine !== 'All') url += `&cuisine=${encodeURIComponent(selectedCuisine)}`;
      if (minRating !== null) url += `&rating=${minRating}`;
      if (vegOnly) url += `&veg=true`;

      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch restaurants');
      return res.json();
    },
    enabled: !!selectedCampusId,
  });

  const restaurants = data?.restaurants || [];
  const totalPages = data?.totalPages || 0;

  const handleCuisineSelect = (cuisine: string) => {
    setSelectedCuisine(cuisine);
    setPage(1);
  };

  const handleRatingSelect = (rating: number | null) => {
    setMinRating(rating);
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Title block */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">All Campus Shops</h1>
          <p className="text-xs text-slate-500 mt-1">
            Showing shops in <span className="font-semibold text-slate-700">{selectedCampusName}</span>
          </p>
        </div>

        {/* Search input */}
        <div className="flex items-center gap-2 bg-white border border-[#EAE3D2] rounded-xl px-3 py-2 w-full md:max-w-xs shadow-xs">
          <Search className="h-4 w-4 text-slate-400 shrink-0" />
          <input 
            type="text" 
            placeholder="Search canteens or juice shops..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent border-0 outline-none text-xs text-slate-700 placeholder-slate-400 focus:ring-0"
          />
        </div>
      </div>

      {/* Main workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Filters Sidebar (Desktop) */}
        <div className="space-y-6 bg-white border border-[#EAE3D2] rounded-2xl p-5 shadow-xs h-fit hidden lg:block">
          <h2 className="font-bold text-slate-900 text-sm flex items-center gap-2 border-b border-[#FAF6F0] pb-3">
            <SlidersHorizontal className="h-4 w-4 text-[#FF6B35]" /> Filters
          </h2>

          {/* Veg Only Toggle */}
          <div className="flex items-center justify-between py-1">
            <span className="text-xs font-semibold text-slate-700">Pure Veg Only</span>
            <button
              onClick={() => { setVegOnly(!vegOnly); setPage(1); }}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                vegOnly ? 'bg-green-600' : 'bg-slate-200'
              }`}
            >
              <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                vegOnly ? 'translate-x-4.5' : 'translate-x-0.5'
              }`} />
            </button>
          </div>

          {/* Cuisines Categories */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cuisines</h3>
            <div className="flex flex-col gap-1.5">
              {cuisines.map((cuisine) => (
                <button
                  key={cuisine}
                  onClick={() => handleCuisineSelect(cuisine)}
                  className={`text-left text-xs py-1.5 px-2.5 rounded-lg transition-colors font-medium ${
                    selectedCuisine === cuisine 
                      ? 'bg-orange-50 text-[#FF6B35] font-semibold' 
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {cuisine}
                </button>
              ))}
            </div>
          </div>

          {/* Rating filter */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Rating</h3>
            <div className="flex flex-col gap-1.5">
              {[
                { label: 'Any Rating', value: null },
                { label: '4.5 ★ & above', value: 4.5 },
                { label: '4.0 ★ & above', value: 4.0 },
                { label: '3.5 ★ & above', value: 3.5 },
              ].map((opt) => (
                <button
                  key={opt.label}
                  onClick={() => handleRatingSelect(opt.value)}
                  className={`text-left text-xs py-1.5 px-2.5 rounded-lg transition-colors font-medium ${
                    minRating === opt.value 
                      ? 'bg-orange-50 text-[#FF6B35] font-semibold' 
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sorting */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Sort By</h3>
            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
              className="w-full bg-[#FAF6F0] border border-[#EAE3D2] rounded-xl px-2.5 py-2 text-xs font-medium outline-none focus:border-[#FF6B35]"
            >
              <option value="rating">Average Rating</option>
              <option value="orders">Popularity (Orders)</option>
            </select>
          </div>
        </div>

        {/* Mobile Filter Badges (Horizontal scroll on mobile) */}
        <div className="lg:hidden flex gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => { setVegOnly(!vegOnly); setPage(1); }}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border text-xs font-semibold shrink-0 ${
              vegOnly ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-[#EAE3D2] text-slate-600'
            }`}
          >
            Pure Veg
          </button>
          
          <select
            value={selectedCuisine}
            onChange={(e) => handleCuisineSelect(e.target.value)}
            className="bg-white border border-[#EAE3D2] px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 outline-none"
          >
            <option value="All">All Cuisines</option>
            {cuisines.filter(c => c !== 'All').map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <select
            value={minRating || ''}
            onChange={(e) => handleRatingSelect(e.target.value ? parseFloat(e.target.value) : null)}
            className="bg-white border border-[#EAE3D2] px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 outline-none"
          >
            <option value="">Any Rating</option>
            <option value="4.5">4.5+ ★</option>
            <option value="4.0">4.0+ ★</option>
            <option value="3.5">3.5+ ★</option>
          </select>

          <select
            value={sortBy}
            onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
            className="bg-white border border-[#EAE3D2] px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 outline-none"
          >
            <option value="rating">Rating</option>
            <option value="orders">Popularity</option>
          </select>
        </div>

        {/* Restaurant Cards Grid (col-span-3) */}
        <div className="lg:col-span-3 space-y-8">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {[1, 2, 4, 5].map((n) => (
                <div key={n} className="bg-white border border-[#EAE3D2] rounded-2xl overflow-hidden shadow-xs animate-pulse">
                  <div className="h-44 bg-slate-200 w-full" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-slate-200 rounded w-2/3" />
                    <div className="h-3 bg-slate-200 rounded w-1/2" />
                    <div className="h-4 bg-slate-200 rounded w-1/3 pt-2" />
                  </div>
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl text-xs">
              Failed to load restaurants. Please try again.
            </div>
          ) : restaurants.length === 0 ? (
            <div className="text-center py-16 bg-white border border-[#EAE3D2] rounded-2xl space-y-3">
              <p className="text-xs text-slate-400 font-semibold">No shops match the selected filters.</p>
              <button 
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCuisine('All');
                  setMinRating(null);
                  setVegOnly(false);
                }}
                className="text-xs font-bold text-[#FF6B35] underline"
              >
                Reset all filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {restaurants.map((res) => {
                const bannerPlaceholder = res.businessName.includes('Nescafe') 
                  ? 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?w=500&auto=format&fit=crop&q=60'
                  : res.businessName.includes('Canteen')
                  ? 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=500&auto=format&fit=crop&q=60'
                  : 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=500&auto=format&fit=crop&q=60';
                
                const activeCoupon = res.coupons?.[0];
                const eta = res.businessName.includes('Nescafe') ? '8-12 Mins' : '15-20 Mins';
                const priceForOne = res.businessName.includes('Bakery') ? '₹100 for one' : '₹150 for one';

                return (
                  <Link 
                    key={res.id} 
                    href={`/restaurants/${res.id}`}
                    className="group bg-white border border-[#EAE3D2] rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col h-full"
                  >
                    {/* Banner Image */}
                    <div className="relative h-44 w-full bg-slate-100 overflow-hidden">
                      <img 
                        src={res.bannerUrl || bannerPlaceholder} 
                        alt={res.businessName}
                        className="h-full w-full object-cover group-hover:scale-103 transition-transform duration-300"
                      />
                      
                      {activeCoupon && (
                        <div className="absolute top-3 left-3 bg-[#FF6B35] text-white text-[9px] font-extrabold uppercase px-2 py-1 rounded-md shadow-sm flex items-center gap-1">
                          <Percent className="h-3 w-3" />
                          {activeCoupon.discountType === 'FLAT' 
                            ? `₹${activeCoupon.value} OFF` 
                            : `${activeCoupon.value}% OFF`}
                        </div>
                      )}

                      {!res.isOpenNow && (
                        <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center">
                          <span className="text-white text-xs font-extrabold tracking-wider uppercase bg-slate-800 border border-slate-700 px-3 py-1 rounded-md">
                            Closed
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Information */}
                    <div className="p-4 flex-1 flex flex-col justify-between">
                      <div className="space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="font-bold text-slate-950 text-sm group-hover:text-[#FF6B35] transition-colors truncate">
                            {res.businessName}
                          </h3>
                          <div className="flex items-center gap-0.5 shrink-0 bg-green-50 text-green-700 text-[10px] font-extrabold px-1.5 py-0.5 rounded-md">
                            <Star className="h-3 w-3 fill-current" />
                            {res.avgRating.toFixed(1)}
                          </div>
                        </div>

                        <p className="text-xs text-slate-500 line-clamp-1">
                          {res.description || 'Delivering premium campus foods.'}
                        </p>

                        {/* Cuisine Tags */}
                        {res.menuCategories && res.menuCategories.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1.5">
                            {res.menuCategories.map((c) => (
                              <span 
                                key={c.name} 
                                className="bg-[#FAF6F0] text-slate-500 border border-[#EAE3D2] text-[9px] px-2 py-0.5 rounded-md font-medium"
                              >
                                {c.name}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="border-t border-[#FAF6F0] pt-3 mt-4 flex items-center justify-between text-[10px] font-semibold text-slate-400">
                        <span className="flex items-center gap-1 text-slate-500">
                          <Clock className="h-3.5 w-3.5 text-slate-400" /> {eta}
                        </span>
                        <span>•</span>
                        <span className="text-slate-500">{priceForOne}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => Math.max(p - 1, 1))}
                className="p-2 border border-[#EAE3D2] rounded-xl hover:bg-slate-50 text-slate-600 disabled:opacity-50 disabled:hover:bg-transparent"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              
              <span className="text-xs font-semibold text-slate-700 px-4">
                Page {page} of {totalPages}
              </span>

              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => Math.min(p + 1, totalPages))}
                className="p-2 border border-[#EAE3D2] rounded-xl hover:bg-slate-50 text-slate-600 disabled:opacity-50 disabled:hover:bg-transparent"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
