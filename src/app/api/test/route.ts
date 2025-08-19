import { NextRequest } from 'next/server';

// GET /api/test - Simple test endpoint without authentication
export async function GET(request: NextRequest) {
  return new Response(
    JSON.stringify({
      message: 'Test endpoint working',
      cookies: Object.fromEntries(
        request.cookies.getAll().map((c) => [c.name, c.value.substring(0, 20) + '...'])
      ),
      headers: Object.fromEntries(request.headers.entries()),
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}

// POST /api/test - Test authentication
export async function POST(request: NextRequest) {
  const { getAuthenticatedUser } = await import('@/lib/auth/utils');

  try {
    const user = await getAuthenticatedUser(request);

    return new Response(
      JSON.stringify({
        authenticated: !!user,
        user: user ? { id: user.id, username: user.username } : null,
        cookies: Object.fromEntries(
          request.cookies.getAll().map((c) => [c.name, c.value.substring(0, 20) + '...'])
        ),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'Authentication test failed',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
