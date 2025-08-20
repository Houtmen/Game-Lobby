import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth, AuthenticatedRequest } from '@/lib/auth/middleware';
import { getPhase4CStore } from '@/lib/phase4c/store';

// List recordings for current user, optionally by sessionId
export const GET = requireAuth(async (req: AuthenticatedRequest) => {
  const userId = req.user!.userId;
  const sessionId = req.nextUrl.searchParams.get('sessionId') || undefined;
  const store = getPhase4CStore();
  const recordings = store.listRecordings(userId, sessionId || undefined);
  return NextResponse.json({ recordings });
});

// Start a new recording
export const POST = requireAuth(async (req: AuthenticatedRequest) => {
  const userId = req.user!.userId;
  const schema = z.object({
    sessionId: z.string().min(1),
    gameId: z.string().min(1),
    filePath: z.string().optional(),
  });
  const body = schema.parse(await req.json());
  const store = getPhase4CStore();
  const created = store.createRecording({
    userId,
    sessionId: body.sessionId,
    gameId: body.gameId,
    filePath: body.filePath,
  });
  return NextResponse.json(created, { status: 201 });
});

// Complete a recording by id (?id=...)
export const PATCH = requireAuth(async (req: AuthenticatedRequest) => {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  const patchSchema = z
    .object({
      sizeBytes: z.number().int().nonnegative().optional(),
      filePath: z.string().optional(),
    })
    .partial();
  const body = await req
    .json()
    .then((v) => patchSchema.parse(v))
    .catch(() => ({} as z.infer<typeof patchSchema>));
  const store = getPhase4CStore();
  const updated = store.completeRecording(id, body);
  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json(updated);
});

// Delete a recording by id (?id=...)
export const DELETE = requireAuth(async (req: AuthenticatedRequest) => {
  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  const store = getPhase4CStore();
  const ok = store.deleteRecording(id);
  if (!ok) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ success: true });
});
