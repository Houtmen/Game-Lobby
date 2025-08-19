import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('🧪 Auth test endpoint called');

    const body = await request.json();
    console.log('📝 Test body:', body);

    const { email, password } = body;

    // Test with our known user
    if (email === 'test@example.com' && password === 'testpassword123') {
      return NextResponse.json({
        success: true,
        message: 'Authentication test successful!',
        user: {
          email: 'test@example.com',
          username: 'testuser',
        },
      });
    }

    if (email === 'test@example.com' && password !== 'testpassword123') {
      return NextResponse.json(
        {
          success: false,
          error: 'Wrong password! The correct password is: testpassword123',
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'User not found. Try email: test@example.com',
      },
      { status: 404 }
    );
  } catch (error) {
    console.error('🚨 Test endpoint error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Server error in test endpoint',
      },
      { status: 500 }
    );
  }
}
