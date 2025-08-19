import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAccessToken } from '@/lib/auth/jwt';

// POST /api/sessions/[id]/invite - Invite friends to a game session
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const { friendIds } = await request.json();
  const sessionId = id;
    const userId = payload.userId;

    if (!friendIds || !Array.isArray(friendIds) || friendIds.length === 0) {
      return NextResponse.json({ error: 'Friend IDs are required' }, { status: 400 });
    }

    // Check if the session exists and the user is the host
    const session = await prisma.gameSession.findUnique({
      where: { id: sessionId },
      include: {
        host: true,
        game: true,
        players: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    if (session.hostId !== userId) {
      return NextResponse.json({ error: 'Only the host can invite players' }, { status: 403 });
    }

    // Verify all friendIds are actually friends of the user
    const friendships = await prisma.friendship.findMany({
      where: {
        AND: [
          {
            OR: [
              { senderId: userId, receiverId: { in: friendIds } },
              { senderId: { in: friendIds }, receiverId: userId },
            ],
          },
          { status: 'ACCEPTED' },
        ],
      },
      include: {
        sender: true,
        receiver: true,
      },
    });

    const validFriendIds = friendships.map((f) =>
      f.senderId === userId ? f.receiverId : f.senderId
    );

    const invalidFriendIds = friendIds.filter((id) => !validFriendIds.includes(id));
    if (invalidFriendIds.length > 0) {
      return NextResponse.json(
        {
          error: `Some users are not your friends: ${invalidFriendIds.join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Check if session has space for all invited friends
    const currentPlayerCount = session.players.length;
    const availableSlots = session.maxPlayers - currentPlayerCount;

    if (friendIds.length > availableSlots) {
      return NextResponse.json(
        {
          error: `Session only has ${availableSlots} available slots, but you're trying to invite ${friendIds.length} friends`,
        },
        { status: 400 }
      );
    }

    // Create notifications for invited friends
    const notifications = await Promise.all(
      validFriendIds.map((friendId) =>
        prisma.notification.create({
          data: {
            userId: friendId,
            type: 'SESSION_INVITE',
            title: 'Game Session Invite',
            content: `${session.host.username} invited you to join "${session.name}" - ${session.game.name}`,
          },
        })
      )
    );

    // Get friend usernames for response
    const friends = await prisma.user.findMany({
      where: { id: { in: validFriendIds } },
      select: { id: true, username: true },
    });

    return NextResponse.json({
      message: `Invitations sent to ${friends.length} friends`,
      invitedFriends: friends,
      notifications: notifications.map((n) => n.id),
    });
  } catch (error) {
    console.error('Session invite error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
