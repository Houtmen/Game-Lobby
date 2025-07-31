import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth/jwt';

// GET /api/users/search?q=username - Search for users by username
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const url = new URL(request.url);
    const query = url.searchParams.get('q');

    if (!query || query.length < 2) {
      return NextResponse.json({ error: 'Search query must be at least 2 characters' }, { status: 400 });
    }

    const userId = payload.userId;

    // Search for users by username (case insensitive)
    const users = await prisma.user.findMany({
      where: {
        AND: [
          {
            username: {
              contains: query
            }
          },
          {
            id: {
              not: userId // Exclude the current user
            }
          }
        ]
      },
      select: {
        id: true,
        username: true,
        avatar: true,
        isOnline: true,
        lastSeen: true
      },
      take: 20 // Limit results
    });

    // Get existing friendships to show status
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [
          { senderId: userId, receiverId: { in: users.map(u => u.id) } },
          { senderId: { in: users.map(u => u.id) }, receiverId: userId }
        ]
      }
    });

    // Add friendship status to each user
    const usersWithStatus = users.map(user => {
      const friendship = friendships.find(f => 
        (f.senderId === userId && f.receiverId === user.id) ||
        (f.senderId === user.id && f.receiverId === userId)
      );

      let friendshipStatus = 'none';
      if (friendship) {
        if (friendship.status === 'ACCEPTED') {
          friendshipStatus = 'friends';
        } else if (friendship.status === 'PENDING') {
          if (friendship.senderId === userId) {
            friendshipStatus = 'request_sent';
          } else {
            friendshipStatus = 'request_received';
          }
        } else if (friendship.status === 'BLOCKED') {
          friendshipStatus = 'blocked';
        }
      }

      return {
        ...user,
        friendshipStatus,
        friendshipId: friendship?.id
      };
    });

    return NextResponse.json({ users: usersWithStatus });

  } catch (error) {
    console.error('User search error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
