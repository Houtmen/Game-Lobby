import { NextRequest, NextResponse } from 'next/server';
import { wireGuardManager } from '@/lib/vpn/wireguard';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { prisma } from '@/lib/prisma';

// POST /api/vpn/[networkId]/start - Start VPN network
export async function POST(
  request: NextRequest,
  { params }: { params: { networkId: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { networkId } = params;
    const vpnSession = wireGuardManager.getVPNSession(networkId);
    
    if (!vpnSession) {
      return NextResponse.json({ error: 'VPN session not found' }, { status: 404 });
    }

    // Verify user is host of the session
    const session = await prisma.gameSession.findUnique({
      where: { id: vpnSession.sessionId }
    });

    if (!session || session.hostPlayerId !== decoded.userId) {
      return NextResponse.json({ error: 'Only session host can start VPN' }, { status: 403 });
    }

    // Start the VPN network
    await wireGuardManager.startVPNNetwork(networkId);

    // Update session status
    await prisma.gameSession.update({
      where: { id: vpnSession.sessionId },
      data: {
        vpnConfig: {
          ...session.vpnConfig as any,
          isActive: true
        }
      }
    });

    return NextResponse.json({ 
      message: 'VPN network started successfully',
      networkId 
    });

  } catch (error) {
    console.error('VPN start error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to start VPN network' },
      { status: 500 }
    );
  }
}

// DELETE /api/vpn/[networkId]/start - Stop VPN network
export async function DELETE(
  request: NextRequest,
  { params }: { params: { networkId: string } }
) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { networkId } = params;
    const vpnSession = wireGuardManager.getVPNSession(networkId);
    
    if (!vpnSession) {
      return NextResponse.json({ error: 'VPN session not found' }, { status: 404 });
    }

    // Verify user is host of the session
    const session = await prisma.gameSession.findUnique({
      where: { id: vpnSession.sessionId }
    });

    if (!session || session.hostPlayerId !== decoded.userId) {
      return NextResponse.json({ error: 'Only session host can stop VPN' }, { status: 403 });
    }

    // Stop the VPN network
    await wireGuardManager.stopVPNNetwork(networkId);

    // Update session status
    await prisma.gameSession.update({
      where: { id: vpnSession.sessionId },
      data: {
        vpnConfig: {
          ...session.vpnConfig as any,
          isActive: false
        }
      }
    });

    return NextResponse.json({ 
      message: 'VPN network stopped successfully',
      networkId 
    });

  } catch (error) {
    console.error('VPN stop error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to stop VPN network' },
      { status: 500 }
    );
  }
}
