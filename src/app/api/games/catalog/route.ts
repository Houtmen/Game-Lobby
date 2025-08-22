import { NextRequest } from 'next/server';
import { fetchGameRangerCatalog, catalogFallback, getSuggestedPathsForName } from '@/lib/gameLibrary/catalog';
import { GAMERANGER_GAMES } from '@/lib/gameLibrary/gamerangerList';
import { prisma } from '@/lib/prisma';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  try {
    // 1) Prefer DB-backed catalog if available
    const dbCatalog = await prisma.gameCatalog.findMany({ orderBy: { name: 'asc' } }).catch(() => []);
    if (dbCatalog && dbCatalog.length) {
      const games = dbCatalog.map((g) => ({
        name: g.name,
        provider: (g.provider as any) ?? 'gameranger',
        suggestedPaths: (g.suggestedPaths as any) ?? getSuggestedPathsForName(g.name),
      }));
      return new Response(
        JSON.stringify({ provider: 'gameranger', count: games.length, games }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 2) Fallback to static list/live fetch
    let catalog = (GAMERANGER_GAMES && GAMERANGER_GAMES.length
      ? GAMERANGER_GAMES.map((name) => ({ name, provider: 'gameranger', suggestedPaths: getSuggestedPathsForName(name) }))
      : await fetchGameRangerCatalog().catch(() => catalogFallback)) as any;
    if (!catalog || catalog.length === 0) catalog = catalogFallback;

    return new Response(
      JSON.stringify({
        provider: 'gameranger',
        count: catalog.length,
        games: catalog,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Failed to load catalog', err);
    return new Response(
      JSON.stringify({ provider: 'gameranger', count: catalogFallback.length, games: catalogFallback }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
