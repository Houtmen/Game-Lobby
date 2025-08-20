import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { getPhase4CStore } from '@/lib/phase4c/store';

// List mods globally or by gameId
export const GET = requireAuth(async (req: AuthenticatedRequest) => {
  const gameId = req.nextUrl.searchParams.get('gameId') || undefined;
  const store = getPhase4CStore();
  const mods = store.listMods(gameId || undefined);
  return NextResponse.json({ mods });
});

// Create a mod
export const POST = requireAuth(async (req: AuthenticatedRequest) => {
  const schema = z.object({
    gameId: z.string().min(1),
    name: z.string().min(1),
    version: z.string().optional(),
    enabled: z.boolean().optional(),
    source: z.enum(['local', 'workshop', 'url']).optional(),
  });
  const body = schema.parse(await req.json());

  const store = getPhase4CStore();
  const created = store.createMod({
    gameId: body.gameId,
    name: body.name,
    version: body.version,
  enabled: Boolean(body.enabled),
    source: body.source,
  });
  return NextResponse.json(created, { status: 201 });
});

// Update a mod by id (?id=...)
export const PATCH = requireAuth(async (req: AuthenticatedRequest) => {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  const toggle = req.nextUrl.searchParams.get('toggle');
  if (toggle === 'enabled') {
    const store = getPhase4CStore();
    const mod = store.updateMod(id, {});
    if (!mod) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const updated = store.updateMod(id, { enabled: !mod.enabled });
    return NextResponse.json(updated);
  }

  const patchSchema = z
    .object({
      name: z.string().optional(),
      version: z.string().optional(),
      enabled: z.boolean().optional(),
      source: z.enum(['local', 'workshop', 'url']).optional(),
    })
    .partial();
  const body = patchSchema.parse(await req.json());
  const store = getPhase4CStore();
  const updated = store.updateMod(id, body);
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(updated);
});

// Delete a mod by id (?id=...)
export const DELETE = requireAuth(async (req: AuthenticatedRequest) => {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  const store = getPhase4CStore();
  const ok = store.deleteMod(id);
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true });
});
