import { NextRequest, NextResponse } from 'next/server';
import { wireGuardManager } from '@/lib/vpn/wireguard';
import { verifyAccessToken } from '@/lib/auth/jwt';

// GET /api/vpn/[networkId]/config - Download client VPN configuration
export async function GET(request: NextRequest, { params }: { params: Promise<{ networkId: string }> }) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

  const { networkId } = await params;
    const { searchParams } = new URL(request.url);
    const serverEndpoint = searchParams.get('endpoint');

    if (!serverEndpoint) {
      return NextResponse.json({ error: 'Server endpoint is required' }, { status: 400 });
    }

    const vpnSession = wireGuardManager.getVPNSession(networkId);
    if (!vpnSession) {
      return NextResponse.json({ error: 'VPN session not found' }, { status: 404 });
    }

    // Verify user is participant in this VPN session
    if (!vpnSession.participants.includes(decoded.userId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Generate client configuration
    const clientConfig = await wireGuardManager.getClientConfig(
      networkId,
      decoded.userId,
      serverEndpoint
    );

    // Return configuration as downloadable file
    return new NextResponse(clientConfig, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        'Content-Disposition': `attachment; filename="${networkId}-client.conf"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (error) {
    console.error('VPN config download error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate VPN configuration' },
      { status: 500 }
    );
  }
}

// POST /api/vpn/[networkId]/config - Get client configuration as JSON
export async function POST(request: NextRequest, { params }: { params: Promise<{ networkId: string }> }) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

  const { networkId } = await params;
    const body = await request.json();
    const { serverEndpoint } = body;

    if (!serverEndpoint) {
      return NextResponse.json({ error: 'Server endpoint is required' }, { status: 400 });
    }

    const vpnSession = wireGuardManager.getVPNSession(networkId);
    if (!vpnSession) {
      return NextResponse.json({ error: 'VPN session not found' }, { status: 404 });
    }

    // Verify user is participant in this VPN session
    if (!vpnSession.participants.includes(decoded.userId)) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Generate client configuration
    const clientConfig = await wireGuardManager.getClientConfig(
      networkId,
      decoded.userId,
      serverEndpoint
    );

    // Get peer info for user
    const peerIndex = vpnSession.participants.indexOf(decoded.userId);
    const peerConfig = vpnSession.config.peers[peerIndex];

    return NextResponse.json({
      config: clientConfig,
      peerInfo: {
        ipAddress: peerConfig?.ipAddress,
        publicKey: peerConfig?.publicKey,
        networkCIDR: vpnSession.config.networkCIDR,
      },
      networkInfo: {
        networkId,
        serverAddress: vpnSession.config.serverAddress,
        serverPort: vpnSession.config.serverPort,
        isActive: vpnSession.isActive,
      },
    });
  } catch (error) {
    console.error('VPN config error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to generate VPN configuration' },
      { status: 500 }
    );
  }
}
