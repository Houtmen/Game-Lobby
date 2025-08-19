// Web-based P2P networking using WebRTC - No VPN download required!

export interface WebRTCGameSession {
  sessionId: string;
  isHost: boolean;
  peers: Map<string, RTCPeerConnection>;
  dataChannels: Map<string, RTCDataChannel>;
  onPlayerJoined?: (playerId: string) => void;
  onPlayerLeft?: (playerId: string) => void;
  onGameData?: (data: any, fromPlayer: string) => void;
}

export class WebRTCGameNetwork {
  private session: WebRTCGameSession | null = null;
  private localUserId: string;
  private signalServer: WebSocket | null = null;

  constructor(userId: string) {
    this.localUserId = userId;
  }

  /**
   * Create a new game session as host (no VPN needed!)
   */
  async createSession(sessionId: string): Promise<WebRTCGameSession> {
    console.log('🌐 Creating WebRTC game session (no VPN required)...');

    this.session = {
      sessionId,
      isHost: true,
      peers: new Map(),
      dataChannels: new Map(),
    };

    // Connect to signaling server for initial peer discovery
    await this.connectToSignalServer(sessionId);

    return this.session;
  }

  /**
   * Join an existing game session (no VPN needed!)
   */
  async joinSession(sessionId: string): Promise<WebRTCGameSession> {
    console.log('🚪 Joining WebRTC game session (no VPN required)...');

    this.session = {
      sessionId,
      isHost: false,
      peers: new Map(),
      dataChannels: new Map(),
    };

    await this.connectToSignalServer(sessionId);

    return this.session;
  }

  /**
   * Connect to signaling server for WebRTC negotiation
   */
  private async connectToSignalServer(sessionId: string): Promise<void> {
    const wsUrl = `ws://localhost:3000/api/webrtc-signal?session=${sessionId}&user=${this.localUserId}`;
    this.signalServer = new WebSocket(wsUrl);

    this.signalServer.onopen = () => {
      console.log('✅ Connected to signaling server');
      this.signalServer?.send(
        JSON.stringify({
          type: 'join-session',
          sessionId,
          userId: this.localUserId,
        })
      );
    };

    this.signalServer.onmessage = (event) => {
      const message = JSON.parse(event.data);
      this.handleSignalMessage(message);
    };
  }

  /**
   * Handle WebRTC signaling messages
   */
  private async handleSignalMessage(message: any): Promise<void> {
    switch (message.type) {
      case 'new-peer':
        await this.createPeerConnection(message.userId);
        break;

      case 'ice-candidate':
        await this.handleIceCandidate(message.userId, message.candidate);
        break;

      case 'offer':
        await this.handleOffer(message.userId, message.offer);
        break;

      case 'answer':
        await this.handleAnswer(message.userId, message.answer);
        break;

      case 'peer-left':
        this.handlePeerLeft(message.userId);
        break;
    }
  }

  /**
   * Create peer-to-peer connection with another player
   */
  private async createPeerConnection(remoteUserId: string): Promise<void> {
    const peerConnection = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' }, // Free STUN server
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });

    // Create data channel for game communication
    const dataChannel = peerConnection.createDataChannel('gameData', {
      ordered: true, // Ensure game state updates arrive in order
    });

    dataChannel.onopen = () => {
      console.log(`🔗 Data channel opened with ${remoteUserId}`);
      this.session?.onPlayerJoined?.(remoteUserId);
    };

    dataChannel.onmessage = (event) => {
      const gameData = JSON.parse(event.data);
      this.session?.onGameData?.(gameData, remoteUserId);
    };

    // Handle ICE candidates
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.signalServer?.send(
          JSON.stringify({
            type: 'ice-candidate',
            targetUser: remoteUserId,
            candidate: event.candidate,
          })
        );
      }
    };

    // Store connections
    this.session?.peers.set(remoteUserId, peerConnection);
    this.session?.dataChannels.set(remoteUserId, dataChannel);

    // Create and send offer if we're the host
    if (this.session?.isHost) {
      const offer = await peerConnection.createOffer();
      await peerConnection.setLocalDescription(offer);

      this.signalServer?.send(
        JSON.stringify({
          type: 'offer',
          targetUser: remoteUserId,
          offer: offer,
        })
      );
    }
  }

  /**
   * Send game data to all connected players
   */
  sendGameData(data: any): void {
    const message = JSON.stringify(data);

    this.session?.dataChannels.forEach((channel, userId) => {
      if (channel.readyState === 'open') {
        channel.send(message);
      }
    });
  }

  /**
   * Send game data to specific player
   */
  sendGameDataToPlayer(data: any, targetUserId: string): void {
    const channel = this.session?.dataChannels.get(targetUserId);
    if (channel && channel.readyState === 'open') {
      channel.send(JSON.stringify(data));
    }
  }

  /**
   * Get connected players
   */
  getConnectedPlayers(): string[] {
    return Array.from(this.session?.peers.keys() || []);
  }

  /**
   * Close all connections and leave session
   */
  async leaveSession(): Promise<void> {
    console.log('👋 Leaving WebRTC session...');

    // Close all peer connections
    this.session?.peers.forEach((peer) => {
      peer.close();
    });

    // Close signaling connection
    this.signalServer?.close();

    this.session = null;
  }

  private async handleIceCandidate(userId: string, candidate: RTCIceCandidate): Promise<void> {
    const peer = this.session?.peers.get(userId);
    if (peer) {
      await peer.addIceCandidate(candidate);
    }
  }

  private async handleOffer(userId: string, offer: RTCSessionDescription): Promise<void> {
    const peer = this.session?.peers.get(userId);
    if (peer) {
      await peer.setRemoteDescription(offer);
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);

      this.signalServer?.send(
        JSON.stringify({
          type: 'answer',
          targetUser: userId,
          answer: answer,
        })
      );
    }
  }

  private async handleAnswer(userId: string, answer: RTCSessionDescription): Promise<void> {
    const peer = this.session?.peers.get(userId);
    if (peer) {
      await peer.setRemoteDescription(answer);
    }
  }

  private handlePeerLeft(userId: string): void {
    console.log(`👋 Player ${userId} left the session`);

    const peer = this.session?.peers.get(userId);
    if (peer) {
      peer.close();
      this.session?.peers.delete(userId);
      this.session?.dataChannels.delete(userId);
      this.session?.onPlayerLeft?.(userId);
    }
  }
}

// Usage example:
/*
const gameNetwork = new WebRTCGameNetwork('user123');

// Host creates session
const session = await gameNetwork.createSession('game-session-456');
session.onPlayerJoined = (playerId) => {
  console.log(`Player ${playerId} joined!`);
};

session.onGameData = (data, fromPlayer) => {
  console.log(`Received game data from ${fromPlayer}:`, data);
};

// Send game state to all players
gameNetwork.sendGameData({
  type: 'player-move',
  position: { x: 100, y: 200 },
  timestamp: Date.now()
});
*/
