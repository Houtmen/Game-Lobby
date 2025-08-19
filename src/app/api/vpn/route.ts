import { NextRequest, NextResponse } from 'next/server';
import { wireGuardManager } from '@/lib/vpn/wireguard';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// POST /api/vpn/create - Create VPN network for session
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const body = await request.json();
    const { sessionId } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID is required' }, { status: 400 });
    }

    // Get session details and participants
    const session = await prisma.gameSession.findUnique({
      where: { id: sessionId },
      include: {
        players: {
          include: {
            user: true,
          },
        },
        game: true,
      },
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

  // Verify user is host or participant
  const isHost = session.hostId === decoded.userId;
    const isParticipant = session.players.some((p: any) => p.userId === decoded.userId);

    if (!isHost && !isParticipant) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Check if game requires VPN
    if (!session.game.requiresVPN) {
      return NextResponse.json({ error: 'This game does not require VPN' }, { status: 400 });
    }

    // Get participant user IDs
    const participantIds = session.players.map((p: any) => p.userId);

    // Check if VPN network already exists
    const existingVPN = wireGuardManager.getVPNSession(`lobby-${sessionId}`);
    if (existingVPN) {
      return NextResponse.json({
        vpnSession: existingVPN,
        message: 'VPN network already exists',
      });
    }

    // Create VPN network
    const vpnSession = await wireGuardManager.createVPNNetwork(sessionId, participantIds);

    // Update session with VPN details
    await prisma.gameSession.update({
      where: { id: sessionId },
      data: {
        vpnConfig: {
          networkId: vpnSession.networkId,
          isActive: false,
          createdAt: vpnSession.createdAt.toISOString(),
        },
      },
    });

    return NextResponse.json({
      vpnSession,
      message: 'VPN network created successfully',
    });
  } catch (error) {
    console.error('VPN creation error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create VPN network' },
      { status: 500 }
    );
  }
}

// GET /api/vpn - Get VPN sessions for user
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get user's active sessions with VPN
    const sessions = await prisma.gameSession.findMany({
      where: {
        players: {
          some: {
            userId: decoded.userId,
          },
        },
        vpnConfig: {
          not: Prisma.JsonNull,
        },
      },
      include: {
        game: true,
        players: {
          include: {
            user: true,
          },
        },
      },
    });

    // Get VPN session details for each
    const vpnSessions = sessions.map((session: any) => {
      const vpnSession = wireGuardManager.getVPNSession(`lobby-${session.id}`);
      return {
        sessionId: session.id,
        sessionName: session.name,
        gameName: session.game.name,
        vpnSession: vpnSession || null,
      };
    });

    return NextResponse.json({ vpnSessions });
  } catch (error) {
    console.error('VPN list error:', error);
    return NextResponse.json({ error: 'Failed to get VPN sessions' }, { status: 500 });
  }
}
