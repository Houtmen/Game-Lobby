import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: { slug: string } }
) {
  const { slug } = context.params || { slug: '' };
  // Ignore common asset requests accidentally routed here in dev
  if (slug === 'favicon.ico' || slug === '_next') {
    return new NextResponse('Not Found', { status: 404 });
  }
  return NextResponse.json({ message: `Hello ${slug}!` });
}
