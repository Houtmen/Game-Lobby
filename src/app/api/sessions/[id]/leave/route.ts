import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateUser } from '@/lib/auth/middleware';

// POST /api/sessions/[id]/leave - Leave a session
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    
    // Authenticate user
    const user = authenticateUser(request);
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Check if user is in the session
    const sessionPlayer = await prisma.sessionPlayer.findUnique({
      where: {
        sessionId_userId: {
          sessionId,
          userId: user.userId,
        }
      },
      include: {
        session: {
          select: {
            id: true,
            hostId: true,
            status: true,
            players: {
              select: {
                userId: true,
                status: true,
              }
            }
          }
        }
      }
    });

    if (!sessionPlayer) {
      return new Response(
        JSON.stringify({ error: 'You are not in this session' }),
        { 
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // If user is the host and there are other players, transfer host or cancel session
    if (sessionPlayer.session.hostId === user.userId) {
      const otherPlayers = sessionPlayer.session.players.filter((p: any) => p.userId !== user.userId && p.status !== 'LEFT');
      
      if (otherPlayers.length > 0) {
        // Transfer host to the next player who joined
        const nextHost = await prisma.sessionPlayer.findFirst({
          where: {
            sessionId,
            userId: { not: user.userId },
            status: { not: 'LEFT' }
          },
          orderBy: {
            joinedAt: 'asc'
          }
        });

        if (nextHost) {
          await prisma.gameSession.update({
            where: { id: sessionId },
            data: { hostId: nextHost.userId }
          });
        }
      } else {
        // Cancel session if host leaves and no other players
        await prisma.gameSession.update({
          where: { id: sessionId },
          data: { 
            status: 'CANCELLED',
            endedAt: new Date(),
          }
        });
      }
    }

    // Update player status to LEFT
    await prisma.sessionPlayer.update({
      where: {
        sessionId_userId: {
          sessionId,
          userId: user.userId,
        }
      },
      data: {
        status: 'LEFT',
        leftAt: new Date(),
      }
    });

    return new Response(
      JSON.stringify({
        message: 'Successfully left session'
      }),
      { 
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error leaving session:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to leave session' }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}
