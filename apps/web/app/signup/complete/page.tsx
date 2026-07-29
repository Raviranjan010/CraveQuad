'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '../../../hooks/useAuth';
import { useRouter } from 'next/navigation';
import { AlertCircle, Loader2, User, Landmark, Building } from 'lucide-react';
import { useToast } from '../../../hooks/use-toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const completeSignupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters long'),
  campusId: z.string().min(1, 'Please select a campus'),
  role: z.enum(['STUDENT', 'FACULTY'], {
    message: 'Please select your university role',
  }),
});

type CompleteSignupFormValues = z.infer<typeof completeSignupSchema>;

interface Campus {
  id: string;
  name: string;
  emailDomain: string | null;
}

export default function CompleteSignupPage() {
  const { user, loading: authLoading, signUpWithEmail, refreshProfile } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError: setErrorField,
    formState: { errors },
  } = useForm<CompleteSignupFormValues>({
    resolver: zodResolver(completeSignupSchema),
    defaultValues: {
      role: 'STUDENT',
    },
  });

  const selectedCampusId = watch('campusId');
  const selectedCampus = campuses.find((c) => c.id === selectedCampusId);

  // Set initial name from Firebase user
  useEffect(() => {
    if (user?.displayName) {
      setValue('name', user.displayName);
    }
  }, [user, setValue]);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  // Fetch active campuses on mount
  useEffect(() => {
    async function loadCampuses() {
      try {
        const res = await fetch(`${API_URL}/auth/campuses`);
        if (res.ok) {
          const data = await res.json();
          setCampuses(data);
        }
      } catch (err) {
        console.error('Failed to load campuses list:', err);
      }
    }
    loadCampuses();
  }, []);

  const onSubmit = async (data: CompleteSignupFormValues) => {
    setError(null);
    if (!user) return;

    // Client-side domain validation: Show inline field error if it doesn't match
    const campus = campuses.find((c) => c.id === data.campusId);
    if (campus && campus.emailDomain && user.email) {
      const emailDomain = campus.emailDomain.toLowerCase();
      if (!user.email.toLowerCase().endsWith(emailDomain)) {
        setErrorField('campusId', {
          type: 'manual',
          message: `Your Google email (${user.email}) does not match the campus domain: @${campus.emailDomain}`,
        });
        return;
      }
    }

    setSubmitLoading(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: data.name,
          campusId: data.campusId,
          role: data.role,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || 'Failed to complete registration on database.');
      }

      await refreshProfile();
      toast({
        title: "Profile Completed",
        description: "Onboarding completed successfully. Welcome to CampusCrave!",
      });
      router.push('/');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Onboarding failed. Please try again.');
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: err.message || 'Onboarding failed. Please try again.',
      });
    } finally {
      setSubmitLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-100">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500 text-white font-bold text-xl">
            CC
          </div>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-slate-900">
            Complete Your Profile
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Please pick your campus and university role to complete registration.
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 p-4 text-sm text-red-600">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form className="mt-8 space-y-4" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            {/* Full Name */}
            <div>
              <label htmlFor="name" className="block text-sm font-medium text-slate-700">
                Full Name
              </label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <User className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="name"
                  type="text"
                  {...register('name')}
                  className="block w-full rounded-xl border border-slate-300 pl-10 pr-3 py-2.5 text-slate-900 placeholder-slate-400 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 sm:text-sm"
                  placeholder="Aarav Patel"
                />
              </div>
              {errors.name && (
                <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
              )}
            </div>

            {/* Campus Selection */}
            <div>
              <label htmlFor="campusId" className="block text-sm font-medium text-slate-700">
                Campus Location
              </label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Landmark className="h-5 w-5 text-slate-400" />
                </div>
                <select
                  id="campusId"
                  {...register('campusId')}
                  className="block w-full rounded-xl border border-slate-300 pl-10 pr-3 py-2.5 text-slate-900 placeholder-slate-400 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 sm:text-sm bg-white"
                >
                  <option value="">Select your university campus...</option>
                  {campuses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              {selectedCampus?.emailDomain && (
                <p className="mt-1 text-xs text-slate-400">
                  Your Google email ({user?.email}) must match @<span className="font-semibold text-orange-500">{selectedCampus.emailDomain}</span>
                </p>
              )}
              {errors.campusId && (
                <p className="mt-1 text-xs text-red-600">{errors.campusId.message}</p>
              )}
            </div>

            {/* Role selection */}
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-slate-700">
                University Role
              </label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Building className="h-5 w-5 text-slate-400" />
                </div>
                <select
                  id="role"
                  {...register('role')}
                  className="block w-full rounded-xl border border-slate-300 pl-10 pr-3 py-2.5 text-slate-900 placeholder-slate-400 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 sm:text-sm bg-white"
                >
                  <option value="STUDENT">Student</option>
                  <option value="FACULTY">Faculty Member</option>
                </select>
              </div>
              {errors.role && (
                <p className="mt-1 text-xs text-red-600">{errors.role.message}</p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={submitLoading}
              className="mt-4 flex w-full justify-center items-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-orange-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {submitLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Completing setup...
                </>
              ) : (
                'Submit Profile'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
