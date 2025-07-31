import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { prisma } from '@/lib/prisma';
import { gameLauncher, GameLauncher } from '@/lib/gameLibrary/launcher';
import { wireGuardManager } from '@/lib/vpn/wireguard';
import { notifyGameLaunched, notifyGameTerminated, notifyGameStatusChange } from '@/lib/socket/server';

// POST /api/games/launch - Launch a game
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
    const { sessionId, gameId } = body;

    if (!sessionId || !gameId) {
      return NextResponse.json({ 
        error: 'Session ID and Game ID are required' 
      }, { status: 400 });
    }

    // Get session details with game info
    const session = await prisma.gameSession.findUnique({
      where: { id: sessionId },
      include: {
        game: true,
        players: true
      }
    });

    if (!session) {
      return NextResponse.json({ error: 'Session not found' }, { status: 404 });
    }

    // Verify user is a participant in the session
    const isParticipant = session.players.some((p: any) => p.userId === decoded.userId);
    if (!isParticipant) {
      return NextResponse.json({ 
        error: 'Access denied. You are not a participant in this session.' 
      }, { status: 403 });
    }

    // Check if game executable exists
    if (!session.game.executablePath) {
      return NextResponse.json({ 
        error: 'Game executable path not configured' 
      }, { status: 400 });
    }

    // Get VPN configuration if game requires VPN
    let vpnConfig;
    if (session.game.requiresVPN) {
      const vpnSession = wireGuardManager.getVPNSession(`lobby-${sessionId}`);
      if (!vpnSession || !vpnSession.isActive) {
        return NextResponse.json({ 
          error: 'VPN is required but not active for this session' 
        }, { status: 400 });
      }

      // Get user's VPN IP address
      const userIndex = vpnSession.participants.indexOf(decoded.userId);
      if (userIndex === -1) {
        return NextResponse.json({ 
          error: 'User not found in VPN participants' 
        }, { status: 400 });
      }

      const userPeer = vpnSession.config.peers[userIndex];
      vpnConfig = {
        networkId: vpnSession.networkId,
        clientIP: userPeer.ipAddress
      };
    }

    // Generate launch configuration
    const launchConfig = GameLauncher.generateLaunchConfig(
      session.game,
      session,
      vpnConfig
    );

    // Launch the game
    const gameProcess = await gameLauncher.launchGame(
      sessionId,
      decoded.userId,
      gameId,
      launchConfig
    );

    // Update session to mark game as started for this user
    await prisma.sessionPlayer.updateMany({
      where: {
        sessionId: sessionId,
        userId: decoded.userId
      },
      data: {
        status: 'IN_GAME'
      }
    });

    // Notify other players in the session via Socket.io
    notifyGameLaunched(sessionId, decoded.userId, {
      gameProcess: {
        processId: gameProcess.processId,
        status: gameProcess.status,
        startTime: gameProcess.startTime
      },
      gameName: session.game.name,
      playerName: (await prisma.user.findUnique({ 
        where: { id: decoded.userId }, 
        select: { username: true } 
      }))?.username
    });

    return NextResponse.json({
      success: true,
      gameProcess: {
        processId: gameProcess.processId,
        status: gameProcess.status,
        startTime: gameProcess.startTime
      },
      launchConfig: {
        gameExecutable: launchConfig.gameExecutable,
        vpnRequired: !!vpnConfig,
        networkSettings: launchConfig.networkSettings
      },
      message: 'Game launched successfully'
    });

  } catch (error) {
    console.error('Game launch error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to launch game' },
      { status: 500 }
    );
  }
}

// GET /api/games/launch - Get running game status
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

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ 
        error: 'Session ID is required' 
      }, { status: 400 });
    }

    // Get game process status
    const gameProcess = gameLauncher.getGameProcess(sessionId, decoded.userId);

    if (!gameProcess) {
      return NextResponse.json({
        isRunning: false,
        status: 'not_started',
        message: 'No game process found for this session'
      });
    }

    return NextResponse.json({
      isRunning: gameProcess.status === 'running',
      status: gameProcess.status,
      processId: gameProcess.processId,
      startTime: gameProcess.startTime,
      exitCode: gameProcess.exitCode
    });

  } catch (error) {
    console.error('Game status error:', error);
    return NextResponse.json(
      { error: 'Failed to get game status' },
      { status: 500 }
    );
  }
}

// DELETE /api/games/launch - Terminate running game
export async function DELETE(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ 
        error: 'Session ID is required' 
      }, { status: 400 });
    }

    // Terminate the game process
    const terminated = await gameLauncher.terminateGame(sessionId, decoded.userId);

    if (!terminated) {
      return NextResponse.json({
        success: false,
        message: 'No running game process found to terminate'
      });
    }

    // Update session player status
    await prisma.sessionPlayer.updateMany({
      where: {
        sessionId: sessionId,
        userId: decoded.userId
      },
      data: {
        status: 'JOINED'
      }
    });

    // Notify other players via Socket.io
    notifyGameTerminated(sessionId, decoded.userId, {
      playerName: (await prisma.user.findUnique({ 
        where: { id: decoded.userId }, 
        select: { username: true } 
      }))?.username,
      terminatedAt: new Date()
    });

    return NextResponse.json({
      success: true,
      message: 'Game terminated successfully'
    });

  } catch (error) {
    console.error('Game termination error:', error);
    return NextResponse.json(
      { error: 'Failed to terminate game' },
      { status: 500 }
    );
  }
}
