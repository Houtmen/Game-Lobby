import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { getPhase4CStore } from '@/lib/phase4c/store';

// List game profiles for the current user
export const GET = requireAuth(async (req: AuthenticatedRequest) => {
  const userId = req.user!.userId;
  const gameId = req.nextUrl.searchParams.get('gameId') || undefined;
  const store = getPhase4CStore();
  const profiles = store.listProfiles(userId, gameId || undefined);
  return NextResponse.json({ profiles });
});

// Create a profile for the current user
export const POST = requireAuth(async (req: AuthenticatedRequest) => {
  const userId = req.user!.userId;
  const schema = z.object({
    gameId: z.string().min(1),
    name: z.string().min(1),
    args: z.array(z.string()).optional(),
    env: z.record(z.string()).optional(),
    workingDir: z.string().optional(),
    isDefault: z.boolean().optional(),
  });
  const body = schema.parse(await req.json());

  const store = getPhase4CStore();
  const created = store.createProfile({
    userId,
  gameId: body.gameId,
  name: body.name,
  args: body.args ?? [],
  env: body.env ?? {},
  workingDir: body.workingDir,
  isDefault: Boolean(body.isDefault),
  });
  return NextResponse.json(created, { status: 201 });
});

// Update a profile by id (query ?id=...)
export const PATCH = requireAuth(async (req: AuthenticatedRequest) => {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });

  const action = req.nextUrl.searchParams.get('action');
  const store = getPhase4CStore();
  if (action === 'setDefault') {
    const userId = req.user!.userId;
    const current = store.updateProfile(id, {});
    if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const updated = store.setProfileDefault(userId, current.gameId, id);
    return NextResponse.json(updated);
  }

  const patchSchema = z
    .object({
      name: z.string().min(1).optional(),
      args: z.array(z.string()).optional(),
      env: z.record(z.string()).optional(),
      workingDir: z.string().optional(),
      isDefault: z.boolean().optional(),
    })
    .partial();
  const body = patchSchema.parse(await req.json());
  const updated = store.updateProfile(id, body);
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(updated);
});

// Delete a profile by id (query ?id=...)
export const DELETE = requireAuth(async (req: AuthenticatedRequest) => {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  const store = getPhase4CStore();
  const ok = store.deleteProfile(id);
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true });
});
