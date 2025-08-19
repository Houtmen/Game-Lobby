import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, generateTokens } from '@/lib/auth/jwt';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().min(1, 'Email or username is required'),
  password: z.string().min(1, 'Password is required'),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = loginSchema.parse(body);

    // Find user by email or username
    const user = await prisma.user.findFirst({
      where: {
        OR: [{ email: email }, { username: email }],
      },
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

  // Password may be null for OAuth users; ensure it's present
  if (!user || !user.password || !(await verifyPassword(password, user.password))) {
      return new Response(JSON.stringify({ error: 'Invalid email/username or password' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Update user online status
    await prisma.user.update({
      where: { id: user.id },
      data: {
        isOnline: true,
        lastSeen: new Date(),
      },
    });

    // Generate JWT tokens
    const tokens = generateTokens({
      userId: user.id,
      email: user.email,
      username: user.username,
      subscriptionTier: user.subscriptionTier,
    });

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    // Create the response
    const response = new Response(
      JSON.stringify({
        message: 'Login successful',
        user: userWithoutPassword,
        token: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );

    // Set HTTP-only cookies for security
    response.headers.set(
      'Set-Cookie',
      [
        `auth-token=${tokens.accessToken}; HttpOnly; Path=/; Max-Age=3600; SameSite=Lax`,
        `refresh-token=${tokens.refreshToken}; HttpOnly; Path=/; Max-Age=604800; SameSite=Lax`,
      ].join(', ')
    );

    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({
          error: 'Validation failed',
          details: error.issues,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    console.error('Login error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
