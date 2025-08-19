import { NextRequest } from 'next/server';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { prisma } from '@/lib/prisma';
import { User } from '@/types';

export async function getAuthenticatedUser(request: NextRequest): Promise<User | null> {
  try {
    console.log('🔑 getAuthenticatedUser called');
    console.log(
      '🍪 All cookies:',
      Object.fromEntries(request.cookies.getAll().map((c: any) => [c.name, c.value]))
    );

    // Get the auth token from cookies
    const authToken = request.cookies.get('auth-token')?.value;
    console.log(
      '🎫 Auth token found:',
      authToken ? 'Yes (length: ' + authToken.length + ')' : 'No'
    );

    if (!authToken) {
      console.log('❌ No auth token found');
      return null;
    }

    // Verify the token
    const payload = verifyAccessToken(authToken);
    console.log('🔓 Token verification result:', payload ? 'Valid' : 'Invalid');
    console.log('📋 Token payload:', payload);

    if (!payload || typeof payload !== 'object' || !('userId' in payload)) {
      console.log('❌ Invalid token payload');
      return null;
    }

    // Get the user from database
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        isOnline: true,
        lastSeen: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    console.log('👤 User lookup result:', user ? `Found ${user.username}` : 'Not found');

    if (!user) {
      return null;
    }

    // Return user with missing properties filled in
    return {
      ...user,
      avatar: user.avatar || undefined,
      friends: [], // TODO: Implement proper friends fetching
      blockedUsers: [], // TODO: Implement proper blocked users fetching
    };
  } catch (error) {
    console.error('❌ Error in getAuthenticatedUser:', error);
    return null;
  }
}

export function requireAuth(handler: (request: NextRequest, user: User) => Promise<Response>) {
  return async (request: NextRequest) => {
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return handler(request, user);
  };
}
