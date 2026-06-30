import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/request';

// Decodes JWT payload without verifying signature (done at NestJS API gateway level)
function parseJwt(token: string) {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const buffer = Buffer.from(base64, 'base64');
    const jsonStr = buffer.toString('utf-8');
    return JSON.parse(jsonStr);
  } catch {
    return null;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('session_token')?.value;

  // Protect Admin dashboard
  if (pathname.startsWith('/admin')) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    const decoded = parseJwt(token);
    // If not admin, redirect to landing
    if (!decoded || decoded.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // Protect Vendor dashboard
  if (pathname.startsWith('/vendor/dashboard')) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    const decoded = parseJwt(token);
    if (!decoded || decoded.role !== 'VENDOR') {
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // Protect generic logged-in pages (e.g. settings, orders)
  if (pathname.startsWith('/dashboard')) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/vendor/dashboard/:path*', '/dashboard/:path*'],
};
