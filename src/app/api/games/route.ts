import { NextRequest, NextResponse } from 'next/server';
import { Game, ApiResponse, PaginatedResponse } from '@/types';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth/utils';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// GET /api/games - Retrieve all games from database
export async function GET(request: NextRequest) {
  try {
  console.warn('Loading games from database...');

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const offset = (page - 1) * limit;

    const user = await getAuthenticatedUser(request).catch(() => null);

    if (user) {
      // Return only detected games for this user via UserGame link
      const [userGames, total] = await Promise.all([
        prisma.userGame.findMany({
          where: { userId: user.id },
          include: { game: true },
          skip: offset,
          take: limit,
          orderBy: { addedAt: 'desc' },
        }),
        prisma.userGame.count({ where: { userId: user.id } }),
      ]);

      const transformed: Game[] = userGames.map((ug) => ({
        id: ug.game.id,
        name: ug.customName || ug.game.name,
        description: ug.game.description || '',
        executable: ug.executablePath || ug.game.executablePath || 'game.exe',
        iconUrl: ug.game.iconUrl || undefined,
        bannerUrl: ug.game.bannerUrl || undefined,
        networkProtocol: 'tcp',
        defaultPort: 2300,
        portRange: { min: 2300, max: 2350 },
        maxPlayers: ug.game.maxPlayers,
        minPlayers: ug.game.minPlayers,
        vpnRequired: ug.game.requiresVPN,
        launchParameters: ug.launchParams ? ug.launchParams.split(',') : (ug.game.launchParameters ? ug.game.launchParameters.split(',') : []),
        supportedPlatforms: ug.game.supportedPlatforms
          ? (ug.game.supportedPlatforms
              .split(',')
              .map((p) => p.trim().toLowerCase())
              .filter((p) => ['windows', 'mac', 'linux'].includes(p)) as ('windows' | 'mac' | 'linux')[])
          : ['windows'],
        isActive: ug.game.isActive,
        addedBy: user.id,
        addedAt: ug.addedAt,
        version: ug.game.version || '1.0',
        requirements: {
          os: 'Windows 10',
          memory: '512 MB RAM',
          storage: '1 GB',
          graphics: 'DirectX compatible',
        },
      }));

      const totalPages = Math.ceil(total / limit);
      return NextResponse.json({
        success: true,
        data: transformed,
        pagination: { page, limit, total, pages: totalPages },
      } satisfies PaginatedResponse<Game>);
    }

    // Fallback: unauthenticated – return all games
    const [games, total] = await Promise.all([
      prisma.game.findMany({
        skip: offset,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      prisma.game.count(),
    ]);

    const transformedGames: Game[] = games.map((game) => ({
      id: game.id,
      name: game.name,
      description: game.description,
      executable: game.executablePath || 'game.exe',
      iconUrl: game.iconUrl || undefined,
      bannerUrl: game.bannerUrl || undefined,
      networkProtocol: 'tcp',
      defaultPort: 2300,
      portRange: { min: 2300, max: 2350 },
      maxPlayers: game.maxPlayers,
      minPlayers: game.minPlayers,
      vpnRequired: game.requiresVPN,
      launchParameters: game.launchParameters ? game.launchParameters.split(',') : [],
      supportedPlatforms: game.supportedPlatforms
        ? (game.supportedPlatforms
            .split(',')
            .map((p) => p.trim().toLowerCase())
            .filter((p) => ['windows', 'mac', 'linux'].includes(p)) as ('windows' | 'mac' | 'linux')[])
        : ['windows'],
      isActive: game.isActive,
      addedBy: 'system',
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
    return NextResponse.json({
      success: true,
      data: transformedGames,
      pagination: { page, limit, total, pages: totalPages },
    } satisfies PaginatedResponse<Game>);
  } catch (error) {
    console.error('Error loading games:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to load games',
      } satisfies ApiResponse,
      { status: 500 }
    );
  }
}

// POST /api/games - Add a game (minimal payload support)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const name = body.name as string;
    const executablePath = (body.executablePath || body.executable) as string | undefined;
    if (!name || !executablePath) {
      return NextResponse.json({ success: false, error: 'name and executablePath are required' }, { status: 400 });
    }

    // Prevent duplicates by path
    const existing = await prisma.game.findFirst({ where: { executablePath } });
    if (existing) {
      return NextResponse.json({ success: true, data: { id: existing.id } });
    }

    const created = await prisma.game.create({
      data: {
        name,
        description: body.description || `Added manually: ${name}`,
        executablePath,
        supportedPlatforms: 'WINDOWS',
        maxPlayers: body.maxPlayers ?? 8,
        minPlayers: body.minPlayers ?? 2,
        isActive: true,
        category: 'OTHER',
        requiresVPN: body.requiresVPN ?? true,
        version: body.version || '1.0',
      },
    });

    return NextResponse.json({ success: true, data: { id: created.id } });
  } catch (error) {
    console.error('Error adding game:', error);
    return NextResponse.json({ success: false, error: 'Failed to add game' }, { status: 500 });
  }
}
