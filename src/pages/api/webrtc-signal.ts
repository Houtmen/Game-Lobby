import { NextApiRequest, NextApiResponse } from 'next';
import { Server as HTTPServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';

interface SignalingMessage {
  type: 'join-session' | 'offer' | 'answer' | 'ice-candidate' | 'peer-left';
  sessionId?: string;
  userId?: string;
  targetUser?: string;
  offer?: RTCSessionDescriptionInit;
  answer?: RTCSessionDescriptionInit;
  candidate?: RTCIceCandidateInit;
}

interface ConnectedUser {
  userId: string;
  sessionId: string;
  socket: WebSocket;
}

class WebRTCSignalingServer {
  private wss: WebSocketServer | null = null;
  private connections: Map<string, ConnectedUser> = new Map();
  private sessions: Map<string, Set<string>> = new Map(); // sessionId -> userIds

  initialize(server: HTTPServer) {
    if (this.wss) return; // Already initialized

    this.wss = new WebSocketServer({
      server,
      path: '/api/webrtc-signal',
    });

    this.wss.on('connection', (ws: WebSocket, req) => {
      const url = new URL(req.url || '', `http://${req.headers.host}`);
      const sessionId = url.searchParams.get('session');
      const userId = url.searchParams.get('user');

      if (!sessionId || !userId) {
        ws.close(1000, 'Missing session or user ID');
        return;
      }

      console.log(`🌐 WebRTC: User ${userId} connecting to session ${sessionId}`);

      // Store connection
      const connectionId = `${sessionId}-${userId}`;
      this.connections.set(connectionId, { userId, sessionId, socket: ws });

      // Add to session
      if (!this.sessions.has(sessionId)) {
        this.sessions.set(sessionId, new Set());
      }
      this.sessions.get(sessionId)!.add(userId);

      // Notify existing peers about new user
      this.notifyPeersAboutNewUser(sessionId, userId);

      ws.on('message', (data) => {
        try {
          const message: SignalingMessage = JSON.parse(data.toString());
          this.handleSignalingMessage(sessionId, userId, message);
        } catch (error) {
          console.error('❌ WebRTC signaling error:', error);
        }
      });

      ws.on('close', () => {
        console.log(`👋 WebRTC: User ${userId} left session ${sessionId}`);
        this.handleUserDisconnect(sessionId, userId);
      });

      ws.on('error', (error) => {
        console.error(`❌ WebRTC connection error for ${userId}:`, error);
        this.handleUserDisconnect(sessionId, userId);
      });
    });

    console.log('✅ WebRTC Signaling Server initialized');
  }

  private notifyPeersAboutNewUser(sessionId: string, newUserId: string): void {
    const sessionUsers = this.sessions.get(sessionId);
    if (!sessionUsers) return;

    // Tell the new user about existing peers
    sessionUsers.forEach((existingUserId) => {
      if (existingUserId !== newUserId) {
        this.sendToUser(sessionId, newUserId, {
          type: 'new-peer',
          userId: existingUserId,
        });

        // Tell existing users about the new peer
        this.sendToUser(sessionId, existingUserId, {
          type: 'new-peer',
          userId: newUserId,
        });
      }
    });
  }

  private handleSignalingMessage(
    sessionId: string,
    fromUserId: string,
    message: SignalingMessage
  ): void {
    switch (message.type) {
      case 'offer':
      case 'answer':
      case 'ice-candidate':
        if (message.targetUser) {
          this.sendToUser(sessionId, message.targetUser, {
            ...message,
            userId: fromUserId,
          });
        }
        break;

      default:
        console.log(`📡 WebRTC: Received ${message.type} from ${fromUserId}`);
    }
  }

  private sendToUser(sessionId: string, userId: string, message: any): void {
    const connectionId = `${sessionId}-${userId}`;
    const connection = this.connections.get(connectionId);

    if (connection && connection.socket.readyState === WebSocket.OPEN) {
      connection.socket.send(JSON.stringify(message));
    }
  }

  private handleUserDisconnect(sessionId: string, userId: string): void {
    const connectionId = `${sessionId}-${userId}`;
    this.connections.delete(connectionId);

    const sessionUsers = this.sessions.get(sessionId);
    if (sessionUsers) {
      sessionUsers.delete(userId);

      // Notify remaining users
      sessionUsers.forEach((remainingUserId) => {
        this.sendToUser(sessionId, remainingUserId, {
          type: 'peer-left',
          userId: userId,
        });
      });

      // Clean up empty sessions
      if (sessionUsers.size === 0) {
        this.sessions.delete(sessionId);
      }
    }
  }

  getSessionStats(): { activeSessions: number; totalConnections: number } {
    return {
      activeSessions: this.sessions.size,
      totalConnections: this.connections.size,
    };
  }
}

const signalingServer = new WebRTCSignalingServer();

export default function handler(req: NextApiRequest, res: any) {
  if (!res.socket.server.webrtcSignaling) {
    console.log('🌐 Initializing WebRTC Signaling Server...');
    signalingServer.initialize(res.socket.server);
    res.socket.server.webrtcSignaling = signalingServer;
  }

  const stats = signalingServer.getSessionStats();
  res.status(200).json({
    message: 'WebRTC Signaling Server active',
    stats,
  });
}
