import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/games/available - Get all available games that can be added to library
export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const category = url.searchParams.get('category');
    const platform = url.searchParams.get('platform');
    const search = url.searchParams.get('search');

    let whereClause: any = {
      isActive: true,
    };

    if (category && category !== 'all') {
      whereClause.category = category.toUpperCase();
    }

    if (platform && platform !== 'all') {
      whereClause.supportedPlatforms = {
        has: platform.toUpperCase(),
      };
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { tags: { has: search.toLowerCase() } },
      ];
    }

    const games = await prisma.game.findMany({
      where: whereClause,
      orderBy: [{ name: 'asc' }],
      select: {
        id: true,
        name: true,
        description: true,
        version: true,
        iconUrl: true,
        bannerUrl: true,
        supportedPlatforms: true,
        maxPlayers: true,
        minPlayers: true,
        category: true,
        tags: true,
        releaseYear: true,
        developer: true,
        publisher: true,
        requiresVPN: true,
        networkPorts: true,
      },
    });

    return new Response(
      JSON.stringify({
        games,
        count: games.length,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Error fetching available games:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch available games' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
