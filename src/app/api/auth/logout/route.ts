import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Create response
    const response = new NextResponse(JSON.stringify({ message: 'Logout successful' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

    // Clear the auth cookies by setting them to expire immediately
    response.cookies.set('auth-token', '', {
      httpOnly: true,
      path: '/',
      maxAge: 0,
      sameSite: 'strict',
    });

    response.cookies.set('refresh-token', '', {
      httpOnly: true,
      path: '/',
      maxAge: 0,
      sameSite: 'strict',
    });

    return response;
  } catch (error) {
    console.error('Logout error:', error);
    return new NextResponse(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
