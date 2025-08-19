import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth/jwt';

// PUT /api/friends/[id] - Accept or decline a friend request
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
  const { id } = await params;
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { action } = await request.json(); // 'accept' or 'decline'
  const friendshipId = id;
    const userId = payload.userId;

    if (!action || !['accept', 'decline'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "accept" or "decline"' },
        { status: 400 }
      );
    }

    // Find the friendship
    const friendship = await prisma.friendship.findUnique({
      where: { id: friendshipId },
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

    if (!friendship) {
      return NextResponse.json({ error: 'Friend request not found' }, { status: 404 });
    }

    // Check if the user is the receiver of this request
    if (friendship.receiverId !== userId) {
      return NextResponse.json(
        { error: 'You can only respond to friend requests sent to you' },
        { status: 403 }
      );
    }

    // Check if request is still pending
    if (friendship.status !== 'PENDING') {
      return NextResponse.json({ error: 'Friend request is no longer pending' }, { status: 400 });
    }

    if (action === 'accept') {
      // Accept the friend request
      const updatedFriendship = await prisma.friendship.update({
        where: { id: friendshipId },
        data: {
          status: 'ACCEPTED',
          acceptedAt: new Date(),
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
        message: 'Friend request accepted',
        friendship: updatedFriendship,
      });
    } else {
      // Decline the friend request (delete it)
      await prisma.friendship.delete({
        where: { id: friendshipId },
      });

      return NextResponse.json({
        message: 'Friend request declined',
      });
    }
  } catch (error) {
    console.error('Friend request response error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE /api/friends/[id] - Remove a friend or cancel a friend request
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
  const { id } = await params;
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const payload = verifyAccessToken(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

  const friendshipId = id;
    const userId = payload.userId;

    // Find the friendship
    const friendship = await prisma.friendship.findUnique({
      where: { id: friendshipId },
    });

    if (!friendship) {
      return NextResponse.json({ error: 'Friendship not found' }, { status: 404 });
    }

    // Check if the user is part of this friendship
    if (friendship.senderId !== userId && friendship.receiverId !== userId) {
      return NextResponse.json({ error: 'You are not part of this friendship' }, { status: 403 });
    }

    // Delete the friendship
    await prisma.friendship.delete({
      where: { id: friendshipId },
    });

    return NextResponse.json({
      message: 'Friendship removed successfully',
    });
  } catch (error) {
    console.error('Remove friendship error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
