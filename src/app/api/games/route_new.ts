import { NextRequest, NextResponse } from 'next/server';
import { Game, ApiResponse, PaginatedResponse } from '@/types';
import { prisma } from '@/lib/prisma';

// GET /api/games - Retrieve all games from database
export async function GET(request: NextRequest) {
  try {
    console.log('📚 Loading games from database...');

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const offset = (page - 1) * limit;

    // Get games from database
    const [games, total] = await Promise.all([
      prisma.game.findMany({
        skip: offset,
        take: limit,
        orderBy: {
          name: 'asc',
        },
      }),
      prisma.game.count(),
    ]);

    console.log(`✅ Found ${games.length} games in database`);
    games.forEach((game) => {
      console.log(`  - ${game.id}: ${game.name}`);
    });

    // Transform to match the Game interface
    const transformedGames: Game[] = games.map((game) => ({
      id: game.id,
      name: game.name,
      description: game.description,
      executable: game.executablePath || 'game.exe',
      iconUrl: game.iconUrl || undefined,
      bannerUrl: game.bannerUrl || undefined,
      networkProtocol: 'tcp' as const, // Default to TCP
      defaultPort: 2300, // Default port
      portRange: { min: 2300, max: 2350 }, // Default range
      maxPlayers: game.maxPlayers,
      minPlayers: game.minPlayers,
      vpnRequired: game.requiresVPN,
      launchParameters: game.launchParameters ? game.launchParameters.split(',') : [],
      supportedPlatforms: game.supportedPlatforms
        ? (game.supportedPlatforms
            .split(',')
            .map((p) => p.trim())
            .filter((p) => ['windows', 'mac', 'linux'].includes(p)) as (
            | 'windows'
            | 'mac'
            | 'linux'
          )[])
        : ['windows'],
      isActive: game.isActive,
      addedBy: '1', // Default user
      addedAt: game.addedAt,
      version: game.version || '1.0',
      requirements: {
        os: 'Windows 10',
        memory: '512 MB RAM',
        storage: '1 GB',
        graphics: 'DirectX compatible',
      },
    }));

    const totalPages = Math.ceil(total / limit);

    const response: PaginatedResponse<Game> = {
      success: true,
      data: transformedGames,
      pagination: {
        page,
        limit,
        total,
        pages: totalPages,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('❌ Error loading games:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to load games',
      } satisfies ApiResponse,
      { status: 500 }
    );
  }
}
