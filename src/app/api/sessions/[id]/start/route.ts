import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/auth/utils';
import { prisma } from '@/lib/prisma';

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

  const { id: sessionId } = await params;

    // Verify session exists and user is the host
    const session = await prisma.gameSession.findFirst({
      where: {
        id: sessionId,
        hostId: user.id,
      },
      include: {
        game: true,
        players: {
          include: {
            user: true,
          },
        },
        vpnNetwork: true,
      },
    });

    if (!session) {
      return NextResponse.json(
        {
          error: 'Session not found or you are not the host',
        },
        { status: 404 }
      );
    }

    // Check if session is in the right state to start
    if (session.status !== 'WAITING') {
      return NextResponse.json(
        {
          error: `Cannot start session with status: ${session.status}`,
        },
        { status: 400 }
      );
    }

    // Ensure there are players (at least the host)
    if (!session.players || session.players.length === 0) {
      return NextResponse.json(
        {
          error: 'Cannot start session with no players',
        },
        { status: 400 }
      );
    }

    // Verify the game is available
    if (!session.game || !session.game.isActive) {
      return NextResponse.json(
        {
          error: 'Game is not available or inactive',
        },
        { status: 400 }
      );
    }

    // If VPN is required, ensure VPN network is set up
    if (session.game.requiresVPN && !session.vpnNetwork) {
      return NextResponse.json(
        {
          error: 'VPN is required for this game but network is not configured',
        },
        { status: 400 }
      );
    }

    // Update session status to ACTIVE
    const updatedSession = await prisma.gameSession.update({
      where: { id: sessionId },
      data: {
        status: 'ACTIVE',
        updatedAt: new Date(),
      },
      include: {
        game: true,
        players: {
          include: {
            user: true,
          },
        },
        vpnNetwork: true,
      },
    });

    // Optional: Notify all players via Socket.io about session start
    // This would require importing the socket server
    console.log(`Session ${sessionId} started by host ${user.username}`);

    return NextResponse.json({
      success: true,
      message: 'Session started successfully',
      session: {
        id: updatedSession.id,
        name: updatedSession.name,
        status: updatedSession.status,
        maxPlayers: updatedSession.maxPlayers,
        playerCount: updatedSession.players.length,
        gameName: updatedSession.game.name,
        vpnRequired: updatedSession.game.requiresVPN,
        vpnNetworkId: updatedSession.vpnNetwork?.id,
      },
    });
  } catch (error) {
    console.error('Session start error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Failed to start session',
      },
      { status: 500 }
    );
  }
}
