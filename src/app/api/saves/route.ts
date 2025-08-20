import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { getPhase4CStore } from '@/lib/phase4c/store';

// List saves for current user, optionally by gameId
export const GET = requireAuth(async (req: AuthenticatedRequest) => {
  const userId = req.user!.userId;
  const gameId = req.nextUrl.searchParams.get('gameId') || undefined;
  const store = getPhase4CStore();
  const saves = store.listSaves(userId, gameId || undefined);
  return NextResponse.json({ saves });
});

// Create a save state
export const POST = requireAuth(async (req: AuthenticatedRequest) => {
  const userId = req.user!.userId;
  const schema = z.object({
    gameId: z.string().min(1),
    sessionId: z.string().optional(),
    storageKey: z.string().min(1),
    notes: z.string().optional(),
    metadata: z.record(z.unknown()).optional(),
  });
  const body = schema.parse(await req.json());
  const store = getPhase4CStore();
  const created = store.createSave({
    userId,
    gameId: body.gameId,
    sessionId: body.sessionId,
    storageKey: body.storageKey,
    notes: body.notes,
    metadata: body.metadata,
  });
  return NextResponse.json(created, { status: 201 });
});

// Update a save by id (?id=...)
export const PATCH = requireAuth(async (req: AuthenticatedRequest) => {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  const patchSchema = z
    .object({
      sessionId: z.string().optional(),
      storageKey: z.string().optional(),
      notes: z.string().optional(),
      metadata: z.record(z.unknown()).optional(),
    })
    .partial();
  const body = patchSchema.parse(await req.json());
  const store = getPhase4CStore();
  const updated = store.updateSave(id, body);
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(updated);
});

// Delete a save by id (?id=...)
export const DELETE = requireAuth(async (req: AuthenticatedRequest) => {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  const store = getPhase4CStore();
  const ok = store.deleteSave(id);
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true });
});
