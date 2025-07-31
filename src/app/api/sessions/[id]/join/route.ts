import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateUser } from '@/lib/auth/middleware';

interface JoinSessionRequest {
  password?: string;
}

// POST /api/sessions/[id]/join - Join a session
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    console.log('🚪 Join session request for:', sessionId);
    
    // Authenticate user
    const user = authenticateUser(request);
    console.log('👤 Authentication result:', user ? `User ${user.username} (${user.userId})` : 'No user found');
    
    if (!user) {
      console.log('❌ Authentication failed - no valid user');
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const body: JoinSessionRequest = await request.json();
    const { password } = body;

    // Get session details
    const session = await prisma.gameSession.findUnique({
      where: { id: sessionId },
      include: {
        game: {
          select: {
            id: true,
            name: true,
            maxPlayers: true,
          }
        },
        players: {
          select: {
            userId: true,
            status: true,
          }
        },
        _count: {
          select: {
            players: true,
          }
        }
      }
    });

    if (!session) {
      return new Response(
        JSON.stringify({ error: 'Session not found' }),
        { 
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if session is joinable
    if (session.status !== 'WAITING') {
      return new Response(
        JSON.stringify({ error: 'Session is not accepting new players' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if session is full
    if (session._count.players >= session.maxPlayers) {
      return new Response(
        JSON.stringify({ error: 'Session is full' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Check password for private sessions
    if (session.isPrivate && session.password && session.password !== password) {
      return new Response(
        JSON.stringify({ error: 'Invalid password' }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if user is already in the session
    const existingPlayer = session.players.find((p: any) => p.userId === user.userId);
    if (existingPlayer) {
      return new Response(
        JSON.stringify({ error: 'You are already in this session' }),
        { 
          status: 409,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Add user to session
    const sessionPlayer = await prisma.sessionPlayer.create({
      data: {
        sessionId,
        userId: user.userId,
        status: 'JOINED',
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            avatar: true,
            isOnline: true,
          }
        }
      }
    });

    // Update user stats
    await prisma.user.update({
      where: { id: user.userId },
      data: { sessionsJoined: { increment: 1 } }
    });

    return new Response(
      JSON.stringify({
        message: 'Successfully joined session',
        player: {
          id: sessionPlayer.id,
          user: sessionPlayer.user,
          status: sessionPlayer.status,
          joinedAt: sessionPlayer.joinedAt,
        }
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error joining session:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to join session' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
