'use client';

import React, { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '../../hooks/useAuth';
import { useRouter } from 'next/navigation';
import { Lock, Mail, AlertCircle, Loader2, User, Landmark, Building } from 'lucide-react';
import Link from 'next/link';
import { useToast } from '../../hooks/use-toast';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';

const signupSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters long'),
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters long'),
  campusId: z.string().min(1, 'Please select a campus'),
  role: z.enum(['STUDENT', 'FACULTY'], {
    message: 'Please select your university role',
  }),
});

type SignupFormValues = z.infer<typeof signupSchema>;

interface Campus {
  id: string;
  name: string;
  emailDomain: string | null;
}

export default function SignupPage() {
  const { signUpWithEmail, loginWithGoogle } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [campuses, setCampuses] = useState<Campus[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setError: setErrorField,
    formState: { errors },
  } = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      role: 'STUDENT',
    },
  });

  const selectedCampusId = watch('campusId');
  const selectedCampus = campuses.find((c) => c.id === selectedCampusId);

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

  const handleRoleRedirect = (role: string, vendorStatus?: string) => {
    if (role === 'STUDENT' || role === 'FACULTY') {
      router.push('/');
    } else if (role === 'VENDOR') {
      if (vendorStatus === 'APPROVED') {
        router.push('/vendor/dashboard');
      } else {
        router.push('/vendor/pending');
      }
    } else if (role === 'ADMIN') {
      router.push('/admin/vendors');
    } else {
      router.push('/');
    }
  };

  const onSubmit = async (data: SignupFormValues) => {
    setError(null);

    // Client-side domain validation: Show inline field error if it doesn't match
    const campus = campuses.find((c) => c.id === data.campusId);
    if (campus && campus.emailDomain) {
      const emailDomain = campus.emailDomain.toLowerCase();
      if (!data.email.toLowerCase().endsWith(emailDomain)) {
        setErrorField('email', {
          type: 'manual',
          message: `Your email must match @${campus.emailDomain}`,
        });
        return;
      }
    }

    setLoading(true);
    try {
      await signUpWithEmail(data.email, data.password, data.name, data.campusId, data.role);
      toast({
        title: "Account Created",
        description: "Successfully registered and signed in.",
      });
      router.push('/');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Signup failed. Please try again.');
      toast({
        variant: "destructive",
        title: "Registration Failed",
        description: err.message || 'Signup failed. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const result = await loginWithGoogle();
      if (result.isNewUser) {
        toast({
          title: "Onboarding Required",
          description: "Please complete your profile to continue.",
        });
        router.push('/signup/complete');
      } else if (result.role) {
        toast({
          title: "Welcome Back",
          description: "Successfully signed in with Google.",
        });
        handleRoleRedirect(result.role, result.vendorStatus);
      }
    } catch (err: any) {
      console.error(err);
      let errMsg = 'Google sign-in failed.';
      if (err.code === 'auth/popup-closed-by-user') {
        errMsg = 'Google login popup was closed before completion.';
      }
      setError(errMsg);
      toast({
        variant: "destructive",
        title: "Sign In Failed",
        description: errMsg,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md space-y-8 bg-white p-8 rounded-2xl border border-slate-200/80 shadow-xl shadow-slate-100">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500 text-white font-bold text-xl">
            CC
          </div>
          <h2 className="mt-6 text-3xl font-bold tracking-tight text-slate-900">
            Create Student or Faculty Account
          </h2>
          <p className="mt-2 text-sm text-slate-500">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold text-orange-500 hover:text-orange-600 transition-colors">
              Sign in instead
            </Link>
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

            {/* Email Address */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-slate-700">
                University Email Address
              </label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Mail className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="email"
                  type="email"
                  {...register('email')}
                  className="block w-full rounded-xl border border-slate-300 pl-10 pr-3 py-2.5 text-slate-900 placeholder-slate-400 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 sm:text-sm"
                  placeholder="yourname@student.bits.ac.in"
                />
              </div>
              {selectedCampus?.emailDomain && (
                <p className="mt-1 text-xs text-slate-400">
                  Must be a valid email ending with: <span className="font-semibold text-orange-500">@{selectedCampus.emailDomain}</span>
                </p>
              )}
              {errors.email && (
                <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-slate-700">
                Password
              </label>
              <div className="relative mt-1">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  id="password"
                  type="password"
                  {...register('password')}
                  className="block w-full rounded-xl border border-slate-300 pl-10 pr-3 py-2.5 text-slate-900 placeholder-slate-400 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 sm:text-sm"
                  placeholder="••••••••"
                />
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>
              )}
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading}
              className="mt-4 flex w-full justify-center items-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-orange-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Creating account...
                </>
              ) : (
                'Sign up'
              )}
            </button>
          </div>
        </form>

        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-slate-200" />
          <span className="flex-shrink mx-4 text-slate-400 text-xs uppercase">Or continue with</span>
          <div className="flex-grow border-t border-slate-200" />
        </div>

        <div>
          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="flex w-full justify-center items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                fill="#EA4335"
                d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582l3.51-3.51C17.642 1.091 14.982 0 12 0 7.354 0 3.307 2.67 1.242 6.56l4.024 3.205z"
              />
              <path
                fill="#4285F4"
                d="M23.738 12.3c0-.828-.074-1.624-.21-2.39H12v4.528h6.586c-.284 1.492-1.127 2.757-2.39 3.606l3.708 2.872c2.17-2 3.834-4.945 3.834-8.616z"
              />
              <path
                fill="#FBBC05"
                d="M5.266 14.235L1.242 17.44C3.307 21.33 7.354 24 12 24c2.932 0 5.61-.976 7.625-2.656l-3.708-2.872C14.887 19.163 13.514 19.5 12 19.5c-3.736 0-6.9-2.527-8.03-5.96a6.837 6.837 0 0 1 1.296.695z"
              />
              <path
                fill="#34A853"
                d="M12 19.5c1.514 0 2.887-.337 3.918-.988l3.708 2.872C17.61 23.024 14.932 24 12 24 7.354 24 3.307 21.33 1.242 17.44l4.024-3.205a7.994 7.994 0 0 0 6.734 5.265z"
              />
            </svg>
            Google OAuth
          </button>
        </div>
      </div>
    </div>
  );
}
