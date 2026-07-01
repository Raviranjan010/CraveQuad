'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { 
  Search as SearchIcon, 
  Store, 
  Utensils, 
  Star, 
  Clock, 
  History, 
  TrendingUp, 
  X,
  ChevronRight
} from 'lucide-react';
import { useCampus } from '../../../hooks/useCampus';

interface SearchRestaurant {
  id: string;
  businessName: string;
  description: string | null;
  bannerUrl: string | null;
  avgRating: number;
  isOpenNow: boolean;
}

interface SearchMenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  isVeg: boolean;
  vendorId: string;
  vendor: { id: string; businessName: string; avgRating: number };
  category: { name: string };
}

interface SearchResponse {
  vendors: SearchRestaurant[];
  menuItems: SearchMenuItem[];
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

export default function SearchPage() {
  const { selectedCampusId } = useCampus();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query.trim());
    }, 450);
    return () => clearTimeout(handler);
  }, [query]);

  // Load recent searches on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('CC:recent_searches');
      if (stored) {
        setRecentSearches(JSON.parse(stored));
      }
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Fetch search results
  const { data, isLoading } = useQuery<SearchResponse>({
    queryKey: ['live-search', selectedCampusId, debouncedQuery],
    queryFn: async () => {
      if (!debouncedQuery) return { vendors: [], menuItems: [] };
      const res = await fetch(`${API_URL}/search?q=${encodeURIComponent(debouncedQuery)}&campusId=${selectedCampusId}`);
      if (!res.ok) throw new Error('Search failed');
      return res.json();
    },
    enabled: !!selectedCampusId && debouncedQuery.length > 0,
  });

  // Fetch popular searches from Redis
  const { data: popularSearches = [] } = useQuery<string[]>({
    queryKey: ['popular-searches'],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/search/popular`);
      if (!res.ok) throw new Error('Failed to fetch popular searches');
      return res.json();
    },
  });

  const handleSearchSubmit = (searchTerm: string) => {
    const term = searchTerm.trim();
    if (!term) return;
    setQuery(term);
    setDebouncedQuery(term);

    // Save to recents
    setRecentSearches(prev => {
      const filtered = prev.filter(x => x.toLowerCase() !== term.toLowerCase());
      const updated = [term, ...filtered].slice(0, 5); // Limit to top 5
      localStorage.setItem('CC:recent_searches', JSON.stringify(updated));
      return updated;
    });
  };

  const handleClearRecent = (termToClear: string) => {
    setRecentSearches(prev => {
      const updated = prev.filter(x => x !== termToClear);
      localStorage.setItem('CC:recent_searches', JSON.stringify(updated));
      return updated;
    });
  };

  const vendors = data?.vendors || [];
  const menuItems = data?.menuItems || [];
  const hasResults = vendors.length > 0 || menuItems.length > 0;

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Search Input Box */}
      <div className="bg-white border border-[#EAE3D2] rounded-3xl p-4.5 flex items-center gap-3 shadow-xs">
        <SearchIcon className="h-5 w-5 text-slate-400 shrink-0" />
        <input 
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit(query)}
          placeholder="Search for restaurants, snacks, drinks..."
          className="w-full bg-transparent border-0 outline-none text-sm text-slate-700 placeholder-slate-400 focus:ring-0"
        />
        {query && (
          <button 
            onClick={() => setQuery('')}
            className="p-1 rounded-full hover:bg-slate-100 text-slate-400"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Default view: Recents & Popular chips */}
      {!debouncedQuery && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Recent Searches */}
          {recentSearches.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <History className="h-4 w-4 text-[#FF6B35]" /> Recent Searches
              </h2>
              <div className="flex flex-col border border-[#EAE3D2] rounded-2xl bg-white overflow-hidden shadow-xs">
                {recentSearches.map((term) => (
                  <div 
                    key={term}
                    className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 transition-colors border-b border-[#FAF6F0] last:border-b-0"
                  >
                    <button
                      onClick={() => handleSearchSubmit(term)}
                      className="text-left text-xs font-semibold text-slate-700 w-full truncate"
                    >
                      {term}
                    </button>
                    <button 
                      onClick={() => handleClearRecent(term)}
                      className="text-slate-300 hover:text-slate-500 p-1"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Popular Searches */}
          <div className="space-y-4">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-[#FF6B35]" /> Popular Searches
            </h2>
            <div className="flex flex-wrap gap-2.5">
              {popularSearches.length === 0 ? (
                // Seed fallback chips for immediate rendering
                ['biryani', 'hazelnut latte', 'sandwich', 'maggi', 'dessert'].map((term) => (
                  <button
                    key={term}
                    onClick={() => handleSearchSubmit(term)}
                    className="bg-white border border-[#EAE3D2] text-xs font-semibold text-slate-600 px-4 py-2.5 rounded-2xl hover:border-slate-300 hover:text-[#FF6B35] transition-all shadow-xs"
                  >
                    {term}
                  </button>
                ))
              ) : (
                popularSearches.map((term) => (
                  <button
                    key={term}
                    onClick={() => handleSearchSubmit(term)}
                    className="bg-white border border-[#EAE3D2] text-xs font-semibold text-slate-600 px-4 py-2.5 rounded-2xl hover:border-[#FF6B35] hover:text-[#FF6B35] transition-all shadow-xs"
                  >
                    {term}
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {debouncedQuery && isLoading && (
        <div className="space-y-6">
          <div className="h-5 bg-slate-200 rounded w-1/4 animate-pulse" />
          {[1, 2].map((n) => (
            <div key={n} className="bg-white border border-[#EAE3D2] p-4 rounded-2xl h-24 w-full animate-pulse" />
          ))}
        </div>
      )}

      {/* Search results */}
      {debouncedQuery && !isLoading && (
        <div className="space-y-8">
          
          {/* No results banner */}
          {!hasResults && (
            <div className="text-center py-16 bg-white border border-[#EAE3D2] rounded-3xl space-y-2">
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">No matches found</p>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">We couldn't find any canteens or menu items matching "{debouncedQuery}". Try another keyword!</p>
            </div>
          )}

          {/* Vendors results */}
          {vendors.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Store className="h-4 w-4 text-[#FF6B35]" /> Restaurants ({vendors.length})
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {vendors.map((v) => (
                  <Link 
                    key={v.id} 
                    href={`/restaurants/${v.id}`}
                    className="flex items-center gap-4 bg-white border border-[#EAE3D2] p-4 rounded-2xl hover:shadow-md transition-all shadow-xs"
                  >
                    {v.bannerUrl ? (
                      <img src={v.bannerUrl} alt={v.businessName} className="h-12 w-12 rounded-xl object-cover" />
                    ) : (
                      <div className="h-12 w-12 rounded-xl bg-orange-50 text-[#FF6B35] flex items-center justify-center font-bold">
                        {v.businessName[0]}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-bold text-slate-900 truncate">{v.businessName}</h3>
                      <p className="text-xs text-slate-400 truncate mt-0.5">{v.description || 'Verified Campus Vendor'}</p>
                    </div>
                    <div className="flex items-center gap-0.5 bg-green-50 text-green-700 text-[10px] font-extrabold px-1.5 py-0.5 rounded-md shrink-0">
                      <Star className="h-3 w-3 fill-current" /> {v.avgRating.toFixed(1)}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Menu items results */}
          {menuItems.length > 0 && (
            <div className="space-y-3">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Utensils className="h-4 w-4 text-[#FF6B35]" /> Menu Items ({menuItems.length})
              </h2>
              <div className="flex flex-col gap-3">
                {menuItems.map((item) => (
                  <Link 
                    key={item.id}
                    href={`/restaurants/${item.vendorId}`}
                    className="bg-white border border-[#EAE3D2] p-4 rounded-2xl flex items-center justify-between hover:shadow-md transition-all shadow-xs gap-4"
                  >
                    {/* Item info */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center gap-1.5">
                        <div className={`h-3 w-3 shrink-0 flex items-center justify-center border rounded-xs ${item.isVeg ? 'border-green-600' : 'border-red-600'} p-0.5`}>
                          <div className={`h-1.5 w-1.5 rounded-full ${item.isVeg ? 'bg-green-600' : 'bg-red-600'}`} />
                        </div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase">{item.category.name}</span>
                      </div>
                      
                      <h3 className="text-sm font-bold text-slate-950 truncate">{item.name}</h3>
                      <p className="text-xs text-slate-400 truncate mt-0.5">
                        From <span className="font-semibold text-slate-600">{item.vendor.businessName}</span>
                      </p>
                    </div>

                    {/* Price and Action */}
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-extrabold text-slate-900">₹{item.price}</span>
                      <div className="h-8 w-8 bg-orange-50 border border-orange-100 rounded-xl flex items-center justify-center text-[#FF6B35] group hover:bg-[#FF6B35] hover:text-white hover:border-[#FF6B35] transition-all shadow-xs">
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
