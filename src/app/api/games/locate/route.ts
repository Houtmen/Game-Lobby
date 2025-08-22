import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { getAuthenticatedUser } from '@/lib/auth/utils';

// Ensure Node.js runtime (required for fs access)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function isExe(p: string) {
  return p && p.toLowerCase().endsWith('.exe') && fs.existsSync(p) && fs.statSync(p).isFile();
}

function pickLikelyExe(dir: string): string | null {
  try {
    const files = fs.readdirSync(dir);
    // Prefer files that include common tokens
    const priorities = ['game', 'launch', 'start', 'play'];
    const exes = files.filter((f) => f.toLowerCase().endsWith('.exe'));
    const scored = exes
      .map((f) => ({ f, score: priorities.reduce((s, t) => (f.toLowerCase().includes(t) ? s + 1 : s), 0) }))
      .sort((a, b) => b.score - a.score || a.f.length - b.f.length);
    if (scored.length > 0) return path.join(dir, scored[0].f);
  } catch {}
  return null;
}

export async function POST(request: NextRequest) {
  try {
  const user = await getAuthenticatedUser(request);
  const body = await request.json().catch(() => ({}));
  const { gameName, selectedPath } = body as { gameName?: string; selectedPath?: string };

    if (!selectedPath) {
      return new Response(JSON.stringify({ error: 'selectedPath is required' }), { status: 400 });
    }

    let executablePath: string | null = null;
    if (isExe(selectedPath)) {
      executablePath = selectedPath;
    } else if (fs.existsSync(selectedPath) && fs.statSync(selectedPath).isDirectory()) {
      // If a directory, try to find the best candidate exe
      executablePath = pickLikelyExe(selectedPath);
    }

    if (!executablePath) {
      return new Response(JSON.stringify({ valid: false, message: 'No executable found at path' }), {
        status: 200,
      });
    }

    // Build minimal game payload to allow client to add it
    const name = gameName || path.basename(executablePath, '.exe');

    // Persist the custom path to remember for this user: create stub Game and UserGame if needed
    if (user) {
      // Try find existing game by path or name
      let game = await prisma.game.findFirst({
        where: {
          OR: [
            { executablePath: executablePath },
            { name: name },
          ],
        },
      });
      if (!game) {
        game = await prisma.game.create({
          data: {
            name,
            description: `Manually linked: ${name}`,
            executablePath: executablePath,
            supportedPlatforms: 'WINDOWS',
            category: 'OTHER',
            isActive: true,
          },
        });
      } else if (!game.executablePath) {
        await prisma.game.update({ where: { id: game.id }, data: { executablePath: executablePath } });
      }

      // Ensure UserGame link stores the executablePath for this user
      await prisma.userGame.upsert({
        where: { userId_gameId: { userId: user.id, gameId: game.id } },
        update: { executablePath: executablePath },
        create: { userId: user.id, gameId: game.id, executablePath: executablePath },
      });
    }

    return new Response(
      JSON.stringify({
        valid: true,
        game: {
          name,
          executable: executablePath,
          executablePath,
          requiresVPN: true,
          supportedPlatforms: ['windows'],
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('locate error', error);
    return new Response(JSON.stringify({ error: 'Failed to validate path' }), { status: 500 });
  }
}
