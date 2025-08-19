import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { gameScanner } from '@/lib/gameLibrary/scanner';
import { getAuthenticatedUser } from '@/lib/auth/utils';

// POST /api/games/scan - Scan system for installed games and add them
export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Games scan request received');

    const user = await getAuthenticatedUser(request);

    if (!user) {
      console.log('❌ Authentication failed');
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json().catch(() => ({}));
    const { customPaths = [], manualPath, gameName } = body;

    console.log('Starting game scan for user:', user.username);

    let detectedGames = [];

    // Handle manual game addition
    if (manualPath) {
      console.log('🎯 Adding manual game:', manualPath);
      const manualGame = await gameScanner.addGameByPath(manualPath, gameName);
      if (manualGame) {
        detectedGames = [manualGame];
        console.log('✅ Manual game validated:', manualGame.name);
      } else {
        return new Response(JSON.stringify({ error: 'Invalid game executable path' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }
    } else {
      // Scan for games on the system
      detectedGames = await gameScanner.scanForGames(customPaths);
    }

    // Filter out games that are already in the database
    const existingGames = await prisma.game.findMany({
      select: { name: true, executablePath: true },
    });

    const existingPaths = new Set(existingGames.map((g) => g.executablePath?.toLowerCase()));
    const newGames = detectedGames.filter(
      (game) => game.executable && !existingPaths.has(game.executable.toLowerCase())
    );

    if (newGames.length === 0) {
      console.log(`Scan complete: Found ${detectedGames.length} games, 0 new`);
      return new Response(
        JSON.stringify({
          message: manualPath ? 'Game already exists in library' : 'No new games found',
          scanned: detectedGames.length,
          added: 0,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Add new games to the database
    const addedGames = [];
    for (const gameData of newGames) {
      try {
        const game = await prisma.game.create({
          data: {
            name: gameData.name,
            description: gameData.description || `Auto-detected: ${gameData.name}`,
            executablePath: gameData.executable!,
            iconUrl: gameData.iconUrl,
            supportedPlatforms: (gameData.supportedPlatforms || ['WINDOWS']).join(','),
            maxPlayers: gameData.maxPlayers || 8,
            minPlayers: gameData.minPlayers || 2,
            category: 'STRATEGY', // Default category since gameData.category might not match enum
            isActive: true,
            version: gameData.version || '1.0',
            requiresVPN: gameData.vpnRequired ?? true,
            networkPorts: (gameData.networkPorts || []).join(','),
          },
        });
        addedGames.push(game);
        console.log(`✅ Added: ${game.name}`);
      } catch (error) {
        console.error(`Failed to add game ${gameData.name}:`, error);
      }
    }

    console.log(`Scan completed: ${addedGames.length} new games added`);

    return new Response(
      JSON.stringify({
        message: `Found ${addedGames.length} new games`,
        scanned: detectedGames.length,
        added: addedGames.length,
        games: addedGames.map((game) => ({
          id: game.id,
          name: game.name,
          executable: game.executablePath,
        })),
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error scanning for games:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to scan for games',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// GET /api/games/scan - Get scan results without adding to database
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return new Response(JSON.stringify({ error: 'Authentication required' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('Starting game scan preview...');
    const detectedGames = await gameScanner.scanForGames();

    return new Response(
      JSON.stringify({
        message: 'Game scan completed',
        detectedGames,
        count: detectedGames.length,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error scanning for games:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to scan for games',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
