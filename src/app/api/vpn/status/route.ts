import { NextRequest, NextResponse } from 'next/server';
import { wireGuardManager } from '@/lib/vpn/wireguard';
import { verifyAccessToken } from '@/lib/auth/jwt';

// GET /api/vpn/status - Get WireGuard status and active sessions
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check WireGuard availability
    const isWireGuardAvailable = await wireGuardManager.checkWireGuardAvailability();
    
    // Get active VPN sessions
    const activeSessions = wireGuardManager.getActiveVPNSessions();
    
    // Filter to sessions where user is a participant
    const userSessions = activeSessions.filter(session => 
      session.participants.includes(decoded.userId)
    );

    return NextResponse.json({
      wireGuardAvailable: isWireGuardAvailable,
      activeSessions: userSessions.length,
      userVPNSessions: userSessions.map(session => ({
        networkId: session.networkId,
        sessionId: session.sessionId,
        isActive: session.isActive,
        createdAt: session.createdAt,
        participantCount: session.participants.length
      }))
    });

  } catch (error) {
    console.error('VPN status error:', error);
    return NextResponse.json(
      { error: 'Failed to get VPN status' },
      { status: 500 }
    );
  }
}

// POST /api/vpn/status - Health check and cleanup
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '');
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = verifyAccessToken(token);
    if (!decoded) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Only allow admin users to trigger cleanup (you can add role check here)
    // For now, allow any authenticated user

    // Run cleanup of inactive sessions
    await wireGuardManager.cleanupInactiveSessions();

    // Check WireGuard status
    const isAvailable = await wireGuardManager.checkWireGuardAvailability();
    const activeSessions = wireGuardManager.getActiveVPNSessions();

    return NextResponse.json({
      message: 'VPN health check completed',
      wireGuardAvailable: isAvailable,
      activeSessionsCount: activeSessions.length,
      cleanupCompleted: true
    });

  } catch (error) {
    console.error('VPN health check error:', error);
    return NextResponse.json(
      { error: 'Failed to perform VPN health check' },
      { status: 500 }
    );
  }
}
