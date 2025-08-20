import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { getPhase4CStore } from '@/lib/phase4c/store';

// List tournaments optionally filtered by status
export const GET = requireAuth(async (req: AuthenticatedRequest) => {
  const status = req.nextUrl.searchParams.get('status') as
    | 'upcoming'
    | 'active'
    | 'completed'
    | null;
  const store = getPhase4CStore();
  const tournaments = store.listTournaments(status || undefined);
  return NextResponse.json({ tournaments });
});

// Create a tournament
export const POST = requireAuth(async (req: AuthenticatedRequest) => {
  const schema = z.object({
    name: z.string().min(1),
    gameId: z.string().min(1),
    status: z.enum(['upcoming', 'active', 'completed']).optional(),
    startAt: z.string().optional(),
    rules: z.string().optional(),
    bracket: z.record(z.unknown()).optional(),
  });
  const body = schema.parse(await req.json());
  const store = getPhase4CStore();
  const created = store.createTournament({
    name: body.name,
    gameId: body.gameId,
    status: body.status || 'upcoming',
    startAt: body.startAt,
    rules: body.rules,
    bracket: body.bracket,
  });
  return NextResponse.json(created, { status: 201 });
});

// Update a tournament by id (?id=...)
export const PATCH = requireAuth(async (req: AuthenticatedRequest) => {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  const patchSchema = z
    .object({
      name: z.string().optional(),
      gameId: z.string().optional(),
      status: z.enum(['upcoming', 'active', 'completed']).optional(),
      startAt: z.string().optional(),
      rules: z.string().optional(),
      bracket: z.record(z.unknown()).optional(),
    })
    .partial();
  const body = patchSchema.parse(await req.json());
  const store = getPhase4CStore();
  const updated = store.updateTournament(id, body);
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(updated);
});

// Delete a tournament by id (?id=...)
export const DELETE = requireAuth(async (req: AuthenticatedRequest) => {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  const store = getPhase4CStore();
  const ok = store.deleteTournament(id);
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true });
});
