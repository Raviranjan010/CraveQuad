'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../../lib/firebase';
import { useRouter } from 'next/navigation';
import { 
  Building, 
  MapPin, 
  Clock, 
  FileText, 
  CreditCard, 
  User, 
  Mail, 
  Lock, 
  ArrowLeft, 
  ArrowRight, 
  Check, 
  Loader2, 
  AlertCircle 
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const vendorFormSchema = z.object({
  // Step 1: Owner Info
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  
  // Step 2: Business Info
  businessName: z.string().min(3, 'Business Name must be at least 3 characters'),
  description: z.string().optional(),
  campusId: z.string().min(1, 'Please select a campus'),
  logoUrl: z.string().url('Invalid logo URL').or(z.string().length(0)),
  bannerUrl: z.string().url('Invalid banner URL').or(z.string().length(0)),
  
  // Step 3: Operating Details
  openingTime: z.string().min(1, 'Opening Time is required'),
  closingTime: z.string().min(1, 'Closing Time is required'),
  licenseNumber: z.string().min(1, 'FSSAI License number is required'),

  // Step 4: Bank Details
  bankName: z.string().min(2, 'Bank name is required'),
  accountNumber: z.string().min(6, 'Account number must be at least 6 digits'),
  ifscCode: z.string().min(4, 'IFSC code is required'),
  upiId: z.string().min(3, 'UPI ID is required').includes('@', { message: 'UPI ID must contain @ symbol' }),
});

type VendorFormValues = z.infer<typeof vendorFormSchema>;

interface Campus {
  id: string;
  name: string;
}

export default function VendorRegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    trigger,
    formState: { errors },
  } = useForm<VendorFormValues>({
    resolver: zodResolver(vendorFormSchema),
    defaultValues: {
      logoUrl: '',
      bannerUrl: '',
    },
  });

  useEffect(() => {
    async function loadCampuses() {
      try {
        const res = await fetch(`${API_URL}/auth/campuses`);
        if (res.ok) {
          const data = await res.json();
          setCampuses(data);
        }
      } catch (err) {
        console.error('Failed to load campuses:', err);
      }
    }
    loadCampuses();
  }, []);

  const nextStep = async () => {
    // Validate current step fields before progressing
    let fieldsToValidate: (keyof VendorFormValues)[] = [];
    if (step === 1) {
      fieldsToValidate = ['name', 'email', 'password'];
    } else if (step === 2) {
      fieldsToValidate = ['businessName', 'campusId', 'logoUrl', 'bannerUrl'];
    } else if (step === 3) {
      fieldsToValidate = ['openingTime', 'closingTime', 'licenseNumber'];
    }

    const isValid = await trigger(fieldsToValidate);
    if (isValid) {
      setStep((s) => s + 1);
    }
  };

  const prevStep = () => {
    setStep((s) => s - 1);
  };

  const onSubmit = async (data: VendorFormValues) => {
    setError(null);
    setLoading(true);
    let firebaseUser = null;
    try {
      // 1. Register VENDOR user in Firebase Auth
      const credential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      firebaseUser = credential.user;
      const token = await firebaseUser.getIdToken();

      // 2. Submit onboarding package to NestJS API
      const res = await fetch(`${API_URL}/auth/register-vendor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: data.name,
          businessName: data.businessName,
          description: data.description,
          campusId: data.campusId,
          openingHours: {
            openingTime: data.openingTime,
            closingTime: data.closingTime,
          },
          logoUrl: data.logoUrl || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=200',
          bannerUrl: data.bannerUrl || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600',
          licenseNumber: data.licenseNumber,
          bankDetails: {
            bankName: data.bankName,
            accountNumber: data.accountNumber,
            ifscCode: data.ifscCode,
            upiId: data.upiId,
          },
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        // Rollback Firebase user creation if backend fails
        await firebaseUser.delete();
        throw new Error(errorData.message || 'Onboarding submission failed.');
      }

      // Success, sync token client-side and redirect to pending screen
      await fetch('/api/auth/session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token }),
      });

      router.push('/vendor/pending');
    } catch (err: any) {
      console.error('Vendor onboarding error:', err);
      setError(err.message || 'Registration failed. Check details and retry.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-2xl space-y-8 bg-white p-8 rounded-2xl border border-slate-200 shadow-xl">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Register your Campus Canteen
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Onboard your canteen to CampusCrave and receive orders from students.
          </p>
        </div>

        {/* Stepper Header */}
        <div className="flex items-center justify-between max-w-md mx-auto py-4">
          {[1, 2, 3, 4].map((i) => (
            <React.Fragment key={i}>
              <div 
                className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-all ${
                  step >= i 
                    ? 'bg-orange-500 text-white shadow-md shadow-orange-500/20' 
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                {step > i ? <Check className="h-4 w-4" /> : i}
              </div>
              {i < 4 && (
                <div 
                  className={`h-1 flex-1 mx-2 rounded-full transition-all ${
                    step > i ? 'bg-orange-500' : 'bg-slate-100'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-600">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* STEP 1: Owner details */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <User className="h-5 w-5 text-orange-500" /> Owner Information
              </h3>
              
              <div>
                <label className="block text-sm font-medium text-slate-700">Full Name</label>
                <input 
                  type="text" 
                  {...register('name')} 
                  className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 sm:text-sm"
                  placeholder="Ramesh Sen"
                />
                {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Email Address</label>
                <input 
                  type="email" 
                  {...register('email')} 
                  className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 sm:text-sm"
                  placeholder="owner@canteen.com"
                />
                {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Password</label>
                <input 
                  type="password" 
                  {...register('password')} 
                  className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 sm:text-sm"
                  placeholder="••••••••"
                />
                {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
              </div>
            </div>
          )}

          {/* STEP 2: Business details */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Building className="h-5 w-5 text-orange-500" /> Canteen Profile Details
              </h3>

              <div>
                <label className="block text-sm font-medium text-slate-700">Business/Canteen Name</label>
                <input 
                  type="text" 
                  {...register('businessName')} 
                  className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 sm:text-sm"
                  placeholder="Nescafe Booth"
                />
                {errors.businessName && <p className="mt-1 text-xs text-red-600">{errors.businessName.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Description</label>
                <textarea 
                  {...register('description')} 
                  rows={3}
                  className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 sm:text-sm"
                  placeholder="Delicious beverages and coffee..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Campus Location</label>
                <select 
                  {...register('campusId')} 
                  className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 sm:text-sm bg-white"
                >
                  <option value="">Select campus location...</option>
                  {campuses.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                {errors.campusId && <p className="mt-1 text-xs text-red-600">{errors.campusId.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Logo Image URL</label>
                  <input 
                    type="text" 
                    {...register('logoUrl')} 
                    className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 sm:text-sm"
                    placeholder="https://example.com/logo.jpg"
                  />
                  {errors.logoUrl && <p className="mt-1 text-xs text-red-600">{errors.logoUrl.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">Banner Image URL</label>
                  <input 
                    type="text" 
                    {...register('bannerUrl')} 
                    className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 sm:text-sm"
                    placeholder="https://example.com/banner.jpg"
                  />
                  {errors.bannerUrl && <p className="mt-1 text-xs text-red-600">{errors.bannerUrl.message}</p>}
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Operating details */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-500" /> Operating Details
              </h3>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Daily Opening Time</label>
                  <input 
                    type="time" 
                    {...register('openingTime')} 
                    className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 sm:text-sm"
                  />
                  {errors.openingTime && <p className="mt-1 text-xs text-red-600">{errors.openingTime.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">Daily Closing Time</label>
                  <input 
                    type="time" 
                    {...register('closingTime')} 
                    className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 sm:text-sm"
                  />
                  {errors.closingTime && <p className="mt-1 text-xs text-red-600">{errors.closingTime.message}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">FSSAI / Business License Number</label>
                <input 
                  type="text" 
                  {...register('licenseNumber')} 
                  className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 sm:text-sm"
                  placeholder="FSSAI-123456789012"
                />
                {errors.licenseNumber && <p className="mt-1 text-xs text-red-600">{errors.licenseNumber.message}</p>}
              </div>
            </div>
          )}

          {/* STEP 4: Bank Details */}
          {step === 4 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-orange-500" /> Secure Payout Details
              </h3>
              <p className="text-xs text-slate-500">
                These bank/payout details are saved securely and will only be used for automated university settlements.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700">Bank Name</label>
                  <input 
                    type="text" 
                    {...register('bankName')} 
                    className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 sm:text-sm"
                    placeholder="HDFC Bank"
                  />
                  {errors.bankName && <p className="mt-1 text-xs text-red-600">{errors.bankName.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700">IFSC Code</label>
                  <input 
                    type="text" 
                    {...register('ifscCode')} 
                    className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 sm:text-sm"
                    placeholder="HDFC0001234"
                  />
                  {errors.ifscCode && <p className="mt-1 text-xs text-red-600">{errors.ifscCode.message}</p>}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">Bank Account Number</label>
                <input 
                  type="text" 
                  {...register('accountNumber')} 
                  className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 sm:text-sm"
                  placeholder="50100293847291"
                />
                {errors.accountNumber && <p className="mt-1 text-xs text-red-600">{errors.accountNumber.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700">UPI ID for Payouts</label>
                <input 
                  type="text" 
                  {...register('upiId')} 
                  className="mt-1 block w-full rounded-xl border border-slate-300 px-3 py-2.5 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 sm:text-sm"
                  placeholder="canteenname@okaxis"
                />
                {errors.upiId && <p className="mt-1 text-xs text-red-600">{errors.upiId.message}</p>}
              </div>
            </div>
          )}

          {/* Stepper Footer Controls */}
          <div className="flex justify-between border-t border-slate-100 pt-6">
            {step > 1 ? (
              <button
                type="button"
                onClick={prevStep}
                className="flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" /> Back
              </button>
            ) : (
              <div />
            )}

            {step < 4 ? (
              <button
                type="button"
                onClick={nextStep}
                className="flex items-center gap-1 rounded-xl bg-orange-500 px-6 py-2.5 text-sm font-semibold text-white shadow hover:bg-orange-600 transition-colors"
              >
                Continue <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button
                type="submit"
                disabled={loading}
                className="flex items-center gap-2 rounded-xl bg-orange-600 px-6 py-2.5 text-sm font-semibold text-white shadow hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Submitting Onboarding Details...
                  </>
                ) : (
                  'Submit Registration'
                )}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
