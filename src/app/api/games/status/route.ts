import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { gameLauncher } from '@/lib/gameLibrary/launcher';

// GET /api/games/status - Get all running games for user
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

    // Get all running games for this user
    const runningGames = gameLauncher.getAllUserGames(decoded.userId);

    const gameStatuses = runningGames.map((game: any) => ({
      sessionId: game.sessionId,
      gameId: game.gameId,
      processId: game.processId,
      status: game.status,
      startTime: game.startTime,
      exitCode: game.exitCode,
      isRunning: game.status === 'running'
    }));

    return NextResponse.json({
      runningGames: gameStatuses,
      totalRunning: gameStatuses.filter((g: any) => g.isRunning).length
    });

  } catch (error) {
    console.error('Game status error:', error);
    return NextResponse.json(
      { error: 'Failed to get game status' },
      { status: 500 }
    );
  }
}

// POST /api/games/status - Check and update all game statuses
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

    // Update all process statuses
    const updatedProcesses = gameLauncher.updateAllProcessStatuses();

    // Filter for user's processes only
    const userProcesses = updatedProcesses.filter((p: any) => p.userId === decoded.userId);

    const processStatuses = userProcesses.map((process: any) => ({
      sessionId: process.sessionId,
      gameId: process.gameId,
      processId: process.processId,
      status: process.status,
      startTime: process.startTime,
      exitCode: process.exitCode,
      isRunning: process.status === 'running'
    }));

    return NextResponse.json({
      updatedProcesses: processStatuses,
      totalUpdated: userProcesses.length,
      totalRunning: processStatuses.filter((p: any) => p.isRunning).length
    });

  } catch (error) {
    console.error('Process status update error:', error);
    return NextResponse.json(
      { error: 'Failed to update process statuses' },
      { status: 500 }
    );
  }
}
