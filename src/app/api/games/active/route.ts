import { NextRequest, NextResponse } from 'next/server';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { prisma } from '@/lib/prisma';
import { gameLauncher } from '@/lib/gameLibrary/launcher';

// GET /api/games/active - Get all active games across all sessions
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

    // Get all running games from the launcher
    const allRunningGames = gameLauncher.updateAllProcessStatuses();

    // Get session and game details for each running process
    const enrichedGames = await Promise.all(
      allRunningGames
        .filter((game) => game.status === 'running')
        .map(async (gameProcess) => {
          try {
            // Get session details
            const session = await prisma.gameSession.findUnique({
              where: { id: gameProcess.sessionId },
              include: {
                game: {
                  select: {
                    id: true,
                    name: true,
                    executablePath: true,
                    requiresVPN: true,
                    networkPorts: true,
                    maxPlayers: true,
                    version: true,
                  },
                },
                host: {
                  select: {
                    id: true,
                    username: true,
                    avatar: true,
                  },
                },
                players: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        username: true,
                        avatar: true,
                      },
                    },
                  },
                },
              },
            });

            if (!session) return null;

            // Get the player info for this game process
            const player = session.players.find((p: any) => p.userId === gameProcess.userId);

            return {
              processId: gameProcess.processId,
              status: gameProcess.status,
              startTime: gameProcess.startTime,
              exitCode: gameProcess.exitCode,
              session: {
                id: session.id,
                name: session.name,
                status: session.status,
                createdAt: session.createdAt,
                game: session.game,
                host: session.host,
                playerCount: session.players.length,
              },
              player: player
                ? {
                    userId: player.userId,
                    username: player.user.username,
                    avatar: player.user.avatar,
                    isHost: player.userId === session.hostId,
                    status: player.status,
                  }
                : null,
            };
          } catch (error) {
            console.error(`Error enriching game process data:`, error);
            return null;
          }
        })
    );

    // Filter out null results
    const validGames = enrichedGames.filter((game) => game !== null);

    // Group by session for better organization
    const gamesBySession = validGames.reduce(
      (acc, game) => {
        const sessionId = game.session.id;
        if (!acc[sessionId]) {
          acc[sessionId] = {
            session: game.session,
            runningGames: [],
          };
        }
        acc[sessionId].runningGames.push({
          processId: game.processId,
          status: game.status,
          startTime: game.startTime,
          exitCode: game.exitCode,
          player: game.player,
        });
        return acc;
      },
      {} as Record<string, any>
    );

    return NextResponse.json({
      totalActiveGames: validGames.length,
      totalActiveSessions: Object.keys(gamesBySession).length,
      gamesBySession,
      summary: {
        runningProcesses: validGames.length,
        uniquePlayers: [...new Set(validGames.map((g) => g.player?.userId))].length,
        activeSessions: Object.keys(gamesBySession).length,
      },
    });
  } catch (error) {
    console.error('Active games error:', error);
    return NextResponse.json({ error: 'Failed to get active games' }, { status: 500 });
  }
}
