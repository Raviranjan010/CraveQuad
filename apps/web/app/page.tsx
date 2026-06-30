import React from 'react';
import { 
  Search, 
  MapPin, 
  Clock, 
  Utensils, 
  ShoppingBag, 
  ArrowRight, 
  CheckCircle,
  Truck,
  Store,
  Users
} from 'lucide-react';

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-500 text-white font-bold text-lg">
              CC
            </div>
            <span className="text-xl font-bold tracking-tight text-slate-900">
              Campus<span className="text-orange-500">Crave</span>
            </span>
          </div>

          <nav className="hidden md:flex gap-6 text-sm font-medium text-slate-600">
            <a href="#how-it-works" className="hover:text-orange-500 transition-colors">How it Works</a>
            <a href="#vendors" className="hover:text-orange-500 transition-colors">Restaurants</a>
            <a href="#features" className="hover:text-orange-500 transition-colors">Features</a>
          </nav>

          <div className="flex items-center gap-3">
            <button className="text-sm font-medium text-slate-700 hover:text-orange-500 transition-colors px-3 py-1.5 rounded-lg">
              Login
            </button>
            <button className="text-sm font-medium text-white bg-orange-500 hover:bg-orange-600 transition-colors px-4 py-2 rounded-lg shadow-sm shadow-orange-500/20">
              Get Started
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-white py-20 lg:py-28">
        <div className="absolute inset-y-0 right-0 -z-10 w-full max-w-3xl bg-gradient-to-l from-orange-50/50 to-transparent rounded-l-full blur-3xl" />
        <div className="container mx-auto px-4 sm:px-6">
          <div className="grid gap-12 lg:grid-cols-12 lg:items-center">
            <div className="lg:col-span-7 flex flex-col justify-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-orange-50/60 px-3 py-1 text-xs font-semibold text-orange-600 mb-6 w-fit">
                <span className="flex h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                Serving Your Campus Instantly
              </div>
              <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl md:text-6xl lg:text-5xl xl:text-6xl">
                Crave it? We <span className="text-orange-500">Deliver</span> it to your desk.
              </h1>
              <p className="mt-6 text-lg text-slate-600 max-w-xl">
                Order from campus canteens, juice bars, and cafes. Get hot meals, drinks, and snacks delivered to your hostel room, library, or classroom in minutes.
              </p>

              {/* Mock Search Bar */}
              <div className="mt-8 flex flex-col sm:flex-row gap-3 max-w-2xl bg-white p-2 rounded-2xl border border-slate-200 shadow-lg shadow-slate-100">
                <div className="flex items-center gap-2 flex-1 px-3 py-2">
                  <MapPin className="text-orange-500 h-5 w-5 shrink-0" />
                  <select className="bg-transparent border-0 outline-none text-slate-700 text-sm font-medium w-full focus:ring-0">
                    <option>Select Hostel / Campus Location...</option>
                    <option>Hostel Block A</option>
                    <option>Hostel Block B</option>
                    <option>Central Library</option>
                    <option>Main Academic Block</option>
                    <option>Campus Sports Center</option>
                  </select>
                </div>
                <div className="h-px sm:h-auto w-full sm:w-px bg-slate-200" />
                <div className="flex items-center gap-2 flex-1 px-3 py-2">
                  <Search className="text-slate-400 h-5 w-5 shrink-0" />
                  <input 
                    type="text" 
                    placeholder="Search burger, chai, roll..." 
                    className="w-full bg-transparent border-0 outline-none text-slate-700 placeholder-slate-400 text-sm focus:ring-0"
                  />
                </div>
                <button className="flex items-center justify-center gap-2 bg-orange-500 hover:bg-orange-600 text-white font-medium text-sm px-6 py-3 rounded-xl transition-all shadow-md shadow-orange-500/10">
                  Search <ArrowRight className="h-4 w-4" />
                </button>
              </div>

              {/* Stats */}
              <div className="mt-10 grid grid-cols-3 gap-6 border-t border-slate-100 pt-8 max-w-xl">
                <div>
                  <span className="block text-2xl font-bold text-slate-900">15+</span>
                  <span className="text-sm text-slate-500">Canteens & Shops</span>
                </div>
                <div>
                  <span className="block text-2xl font-bold text-slate-900">12 Mins</span>
                  <span className="text-sm text-slate-500">Avg. Delivery</span>
                </div>
                <div>
                  <span className="block text-2xl font-bold text-slate-900">5k+</span>
                  <span className="text-sm text-slate-500">Daily Orders</span>
                </div>
              </div>
            </div>

            <div className="lg:col-span-5 flex justify-center">
              {/* Decorative Mock App Screen */}
              <div className="relative w-full max-w-[340px] aspect-[9/18.5] bg-slate-950 rounded-[40px] p-3 shadow-2xl shadow-slate-900/10 border-4 border-slate-800">
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-6 bg-slate-800 rounded-b-2xl z-10" />
                <div className="w-full h-full bg-slate-50 rounded-[30px] overflow-hidden flex flex-col p-4 pt-8">
                  {/* Mock App Header */}
                  <div className="flex justify-between items-center mb-4">
                    <div>
                      <span className="text-xs text-slate-400 block">Deliver to</span>
                      <span className="text-xs font-bold text-slate-800 flex items-center gap-1">Library Study Room 4A</span>
                    </div>
                    <div className="h-7 w-7 rounded-full bg-slate-200" />
                  </div>

                  {/* Mock Search inside App */}
                  <div className="bg-slate-200/50 p-2 rounded-xl flex items-center gap-2 mb-4">
                    <Search className="h-3 w-3 text-slate-400" />
                    <span className="text-[10px] text-slate-400">Search for lunch, dessert...</span>
                  </div>

                  {/* Mock Categories */}
                  <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-none">
                    <span className="bg-orange-500 text-white text-[9px] px-2.5 py-1 rounded-full font-medium shrink-0">All</span>
                    <span className="bg-white text-slate-600 border border-slate-200 text-[9px] px-2.5 py-1 rounded-full font-medium shrink-0">Juices</span>
                    <span className="bg-white text-slate-600 border border-slate-200 text-[9px] px-2.5 py-1 rounded-full font-medium shrink-0">Fast Food</span>
                    <span className="bg-white text-slate-600 border border-slate-200 text-[9px] px-2.5 py-1 rounded-full font-medium shrink-0">Indian</span>
                  </div>

                  {/* Mock Restaurant Card */}
                  <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-2 mb-3">
                    <div className="h-20 w-full bg-orange-100 rounded-xl mb-2 flex items-center justify-center text-xs text-orange-600 font-semibold">
                      Juice & Shake Hub
                    </div>
                    <div className="flex justify-between items-center px-1">
                      <span className="text-xs font-bold text-slate-800">Fresh N Juices</span>
                      <span className="text-[9px] bg-green-50 text-green-700 font-semibold px-1.5 py-0.5 rounded">4.8★</span>
                    </div>
                    <span className="text-[9px] text-slate-400 px-1">10 min • Free Delivery</span>
                  </div>

                  {/* Mock Order Tracker Alert */}
                  <div className="mt-auto bg-slate-900 text-white rounded-xl p-2.5 flex items-center gap-2">
                    <div className="h-6 w-6 rounded-lg bg-orange-500 flex items-center justify-center shrink-0">
                      <Clock className="h-3.5 w-3.5 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[8px] text-slate-400 block font-medium">Order Status</span>
                      <span className="text-[10px] font-semibold block truncate">Rider is picking up food...</span>
                    </div>
                    <span className="text-[10px] font-bold text-orange-500">2 min</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Role Segmentation Cards */}
      <section className="py-20 bg-slate-100 border-y border-slate-200/50" id="how-it-works">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
              An all-in-one platform for campus dining
            </h2>
            <p className="mt-4 text-slate-600">
              CampusCrave brings student customers, local vendors, and student riders together on one connected digital platform.
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            {/* Customers */}
            <div className="bg-white p-8 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all">
              <div className="h-12 w-12 rounded-xl bg-orange-100 flex items-center justify-center mb-6">
                <Users className="h-6 w-6 text-orange-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Students & Faculty</h3>
              <p className="text-sm text-slate-600 mb-4">
                Skip long lunch queues. Order in advance and get food delivered straight to your location or choose self-pickup.
              </p>
              <ul className="space-y-2 text-xs text-slate-500 mb-6">
                <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500 shrink-0" /> Group orders with roomies</li>
                <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500 shrink-0" /> Campus location tagging</li>
                <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500 shrink-0" /> Razorpay & Student Wallet</li>
              </ul>
            </div>

            {/* Vendors */}
            <div className="bg-white p-8 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all">
              <div className="h-12 w-12 rounded-xl bg-orange-100 flex items-center justify-center mb-6">
                <Store className="h-6 w-6 text-orange-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Campus Vendors</h3>
              <p className="text-sm text-slate-600 mb-4">
                Accept digital orders, manage menu availability, and access sales metrics via a custom merchant dashboard.
              </p>
              <ul className="space-y-2 text-xs text-slate-500 mb-6">
                <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500 shrink-0" /> Live order ticket screen</li>
                <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500 shrink-0" /> Toggle item availability</li>
                <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500 shrink-0" /> Daily analytics reports</li>
              </ul>
            </div>

            {/* Delivery Partners */}
            <div className="bg-white p-8 rounded-2xl border border-slate-200/60 shadow-sm hover:shadow-md transition-all">
              <div className="h-12 w-12 rounded-xl bg-orange-100 flex items-center justify-center mb-6">
                <Truck className="h-6 w-6 text-orange-500" />
              </div>
              <h3 className="text-xl font-bold text-slate-800 mb-2">Delivery Partners</h3>
              <p className="text-sm text-slate-600 mb-4">
                Earn pocket money by delivering food on foot, bicycle, or scooter between classes and during free hours.
              </p>
              <ul className="space-y-2 text-xs text-slate-500 mb-6">
                <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500 shrink-0" /> Flexi-hours order picking</li>
                <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500 shrink-0" /> Direct tips & order payouts</li>
                <li className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-green-500 shrink-0" /> Live in-app campus map</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto bg-slate-900 text-slate-400 py-12 border-t border-slate-800">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-orange-500 text-white font-bold text-sm">
                CC
              </div>
              <span className="text-md font-bold tracking-tight text-white">
                CampusCrave
              </span>
            </div>
            <p className="text-xs">
              © {new Date().getFullYear()} CampusCrave. Built for University Campuses.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
