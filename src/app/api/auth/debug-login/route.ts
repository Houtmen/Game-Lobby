import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/auth/jwt';

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Debug login endpoint called');

    const body = await request.json();
    console.log('📝 Request body:', body);

    const { email, password } = body;

    if (!email || !password) {
      console.log('❌ Missing email or password');
      return NextResponse.json(
        {
          error: 'Email and password are required',
          debug: { email: !!email, password: !!password },
        },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        username: true,
        password: true,
        firstName: true,
        lastName: true,
        subscriptionTier: true,
        isOnline: true,
      },
    });

    console.log('👤 User found:', !!user);

    if (!user) {
      console.log('❌ User not found for email:', email);
      return NextResponse.json(
        {
          error: 'User not found',
          debug: { userExists: false, email },
        },
        { status: 404 }
      );
    }

    if (!user.password) {
      console.log('❌ User has no password (OAuth user?)');
      return NextResponse.json(
        {
          error: 'This account uses OAuth login',
          debug: { hasPassword: false },
        },
        { status: 400 }
      );
    }

    console.log('🔑 Verifying password...');
    const isPasswordValid = await verifyPassword(password, user.password);
    console.log('✅ Password valid:', isPasswordValid);

    if (!isPasswordValid) {
      console.log('❌ Invalid password');
      return NextResponse.json(
        {
          error: 'Invalid password',
          debug: { passwordValid: false },
        },
        { status: 401 }
      );
    }

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json({
      success: true,
      user: userWithoutPassword,
      debug: {
        userExists: true,
        hasPassword: true,
        passwordValid: true,
      },
    });
  } catch (error) {
    console.error('🚨 Debug login error:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        debug: {
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          errorStack: error instanceof Error ? error.stack : null,
        },
      },
      { status: 500 }
    );
  }
}
