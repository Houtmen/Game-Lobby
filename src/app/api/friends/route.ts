import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth/jwt';

// GET /api/friends - Get all friends, sent requests, and received requests
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

    const userId = payload.userId;

    // Get all friendships where user is sender or receiver
    const friendships = await prisma.friendship.findMany({
      where: {
        OR: [{ senderId: userId }, { receiverId: userId }],
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatar: true,
            isOnline: true,
            lastSeen: true,
          },
        },
        receiver: {
          select: {
            id: true,
            username: true,
            avatar: true,
            isOnline: true,
            lastSeen: true,
          },
        },
      },
    });

    // Categorize the friendships
    const friends = [];
    const sentRequests = [];
    const receivedRequests = [];

    for (const friendship of friendships) {
      if (friendship.status === 'ACCEPTED') {
        // This is an accepted friendship
        const friend = friendship.senderId === userId ? friendship.receiver : friendship.sender;
        friends.push({
          ...friend,
          friendshipId: friendship.id,
          friendshipCreatedAt: friendship.createdAt,
        });
      } else if (friendship.status === 'PENDING') {
        if (friendship.senderId === userId) {
          // User sent this request
          sentRequests.push({
            id: friendship.id,
            senderId: friendship.senderId,
            receiverId: friendship.receiverId,
            status: friendship.status,
            createdAt: friendship.createdAt,
            sender: friendship.sender,
            receiver: friendship.receiver,
          });
        } else {
          // User received this request
          receivedRequests.push({
            id: friendship.id,
            senderId: friendship.senderId,
            receiverId: friendship.receiverId,
            status: friendship.status,
            createdAt: friendship.createdAt,
            sender: friendship.sender,
            receiver: friendship.receiver,
          });
        }
      }
    }

    return NextResponse.json({
      friends,
      sentRequests,
      receivedRequests,
    });
  } catch (error) {
    console.error('Friends API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST /api/friends - Send a friend request
export async function POST(request: NextRequest) {
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

    const { username } = await request.json();
    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    const senderId = payload.userId;

    // Find the target user
    const targetUser = await prisma.user.findUnique({
      where: { username },
    });

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (targetUser.id === senderId) {
      return NextResponse.json(
        { error: 'Cannot send friend request to yourself' },
        { status: 400 }
      );
    }

    // Check if friendship already exists
    const existingFriendship = await prisma.friendship.findFirst({
      where: {
        OR: [
          { senderId, receiverId: targetUser.id },
          { senderId: targetUser.id, receiverId: senderId },
        ],
      },
    });

    if (existingFriendship) {
      if (existingFriendship.status === 'ACCEPTED') {
        return NextResponse.json({ error: 'Already friends' }, { status: 400 });
      } else if (existingFriendship.status === 'PENDING') {
        return NextResponse.json({ error: 'Friend request already exists' }, { status: 400 });
      } else if (existingFriendship.status === 'BLOCKED') {
        return NextResponse.json({ error: 'Cannot send friend request' }, { status: 400 });
      }
    }

    // Create the friendship
    const friendship = await prisma.friendship.create({
      data: {
        senderId,
        receiverId: targetUser.id,
        status: 'PENDING',
      },
      include: {
        sender: {
          select: {
            id: true,
            username: true,
            avatar: true,
            isOnline: true,
          },
        },
        receiver: {
          select: {
            id: true,
            username: true,
            avatar: true,
            isOnline: true,
          },
        },
      },
    });

    return NextResponse.json({
      message: 'Friend request sent successfully',
      friendship,
    });
  } catch (error) {
    console.error('Send friend request error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
