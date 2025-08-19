import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { getAuthenticatedUser } from '@/lib/auth/utils';
import { z } from 'zod';

const updateSessionSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().max(500).optional(),
  maxPlayers: z.number().min(2).max(16).optional(),
  isPrivate: z.boolean().optional(),
  password: z.string().optional(),
  allowSpectators: z.boolean().optional(),
  autoStart: z.boolean().optional(),
  sessionRules: z.record(z.any()).optional(),
});

// GET /api/sessions/[id] - Get session details
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
  const { id: sessionId } = await params;

    const session = await prisma.gameSession.findUnique({
      where: { id: sessionId },
      include: {
        game: {
          select: {
            id: true,
            name: true,
            iconUrl: true,
            bannerUrl: true,
            maxPlayers: true,
            category: true,
            description: true,
            networkPorts: true,
            requiresVPN: true,
          },
        },
        host: {
          select: {
            id: true,
            username: true,
            avatar: true,
            subscriptionTier: true,
          },
        },
        players: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true,
                isOnline: true,
                subscriptionTier: true,
              },
            },
          },
          orderBy: {
            joinedAt: 'asc',
          },
        },
        vpnNetwork: {
          select: {
            id: true,
            name: true,
            subnet: true,
            isActive: true,
          },
        },
        chatMessages: {
          include: {
            author: {
              select: {
                id: true,
                username: true,
                avatar: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 50, // Last 50 messages
        },
      },
    });

    if (!session) {
      return new Response(JSON.stringify({ error: 'Session not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const formattedSession = {
      id: session.id,
      name: session.name,
      description: session.description,
      game: session.game,
      host: session.host,
      maxPlayers: session.maxPlayers,
      currentPlayers: session.players.length,
      isPrivate: session.isPrivate,
      hasPassword: !!session.password,
      status: session.status,
      allowSpectators: session.allowSpectators,
      autoStart: session.autoStart,
      sessionRules: session.sessionRules,
      createdAt: session.createdAt,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      vpnNetwork: session.vpnNetwork,
      players: session.players.map((p) => ({
        id: p.id,
        user: p.user,
        status: p.status,
        joinedAt: p.joinedAt,
        leftAt: p.leftAt,
      })),
      chatMessages: session.chatMessages.map((msg) => ({
        id: msg.id,
        content: msg.content,
        author: msg.author,
        type: msg.type,
        createdAt: msg.createdAt,
      })),
      canJoin: session.status === 'WAITING' && session.players.length < session.maxPlayers,
    };

    return new Response(JSON.stringify({ session: formattedSession }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error fetching session:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch session' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// PUT /api/sessions/[id] - Update session (host only)
export const PUT = requireAuth<{ params: Promise<{ id: string }> }>(
  async (request: AuthenticatedRequest, { params }: { params: Promise<{ id: string }> }) => {
    try {
      const { id: sessionId } = await params;
      const body = await request.json();
      const updateData = updateSessionSchema.parse(body);

      // Check if session exists and user is host
      const session = await prisma.gameSession.findUnique({
        where: { id: sessionId },
        select: {
          id: true,
          hostId: true,
          status: true,
          maxPlayers: true,
          players: { select: { id: true } },
        },
      });

      if (!session) {
        return new Response(JSON.stringify({ error: 'Session not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        });
      }

  if (session.hostId !== request.user!.userId) {
        return new Response(JSON.stringify({ error: 'Only the host can update this session' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (session.status !== 'WAITING') {
        return new Response(
          JSON.stringify({ error: 'Cannot update session that has already started' }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      // If reducing max players, ensure current players don't exceed new limit
      if (updateData.maxPlayers && updateData.maxPlayers < session.players.length) {
        return new Response(
          JSON.stringify({
            error: `Cannot reduce max players below current player count (${session.players.length})`,
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      // Update the session
      const updatedSession = await prisma.gameSession.update({
        where: { id: sessionId },
        data: updateData,
        include: {
          game: {
            select: {
              id: true,
              name: true,
              iconUrl: true,
              maxPlayers: true,
              category: true,
            },
          },
          host: {
            select: {
              id: true,
              username: true,
              avatar: true,
              subscriptionTier: true,
            },
          },
          players: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  avatar: true,
                  isOnline: true,
                },
              },
            },
          },
        },
      });

      return new Response(
        JSON.stringify({
          message: 'Session updated successfully',
          session: {
            id: updatedSession.id,
            name: updatedSession.name,
            description: updatedSession.description,
            game: updatedSession.game,
            host: updatedSession.host,
            maxPlayers: updatedSession.maxPlayers,
            currentPlayers: updatedSession.players.length,
            isPrivate: updatedSession.isPrivate,
            hasPassword: !!updatedSession.password,
            status: updatedSession.status,
            allowSpectators: updatedSession.allowSpectators,
            autoStart: updatedSession.autoStart,
            sessionRules: updatedSession.sessionRules,
            createdAt: updatedSession.createdAt,
            players: updatedSession.players.map((p) => ({
              id: p.id,
              user: p.user,
              status: p.status,
              joinedAt: p.joinedAt,
            })),
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        return new Response(
          JSON.stringify({
            error: 'Validation failed',
            details: error.errors,
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      console.error('Error updating session:', error);
      return new Response(JSON.stringify({ error: 'Failed to update session' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }
);

// DELETE /api/sessions/[id] - Delete session (host only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;

    // Authenticate user using cookie-based auth (consistent with other APIs)
    const user = await getAuthenticatedUser(request);

    if (!user) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Check if session exists and user is host
    const session = await prisma.gameSession.findUnique({
      where: { id: sessionId },
      select: {
        id: true,
        hostId: true,
        status: true,
        vpnNetworkId: true,
      },
    });

    if (!session) {
      return new Response(JSON.stringify({ error: 'Session not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (session.hostId !== user.id) {
      return new Response(JSON.stringify({ error: 'Only the host can delete this session' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Update session status to cancelled instead of hard delete
    await prisma.gameSession.update({
      where: { id: sessionId },
      data: {
        status: 'CANCELLED',
        endedAt: new Date(),
      },
    });

    // If there's a VPN network, mark it as inactive
    if (session.vpnNetworkId) {
      await prisma.vPNNetwork.update({
        where: { id: session.vpnNetworkId },
        data: { isActive: false },
      });
    }

    return new Response(JSON.stringify({ message: 'Session cancelled successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error deleting session:', error);
    return new Response(JSON.stringify({ error: 'Failed to delete session' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
