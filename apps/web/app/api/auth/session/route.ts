import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { token } = await request.json();

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    const cookieStore = cookies();
    
    // Store the raw Firebase ID token in an httpOnly, Secure cookie.
    // Expire in 1 hour (matching the standard lifetime of a Firebase ID token).
    cookieStore.set({
      name: 'session_token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 3600, // 1 hour in seconds
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Session creation error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const cookieStore = cookies();
    
    // Clear the session token cookie
    cookieStore.delete('session_token');

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Session deletion error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
