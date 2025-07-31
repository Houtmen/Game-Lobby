// Hybrid networking: Try WebRTC first, fallback to VPN if needed
import { WebRTCGameNetwork } from './webrtc-game-network';

export type ConnectionMode = 'webrtc' | 'vpn' | 'none';

export interface ConnectionQuality {
  isGoodEnough: boolean;
  latency: number;
  packetLoss: number;
  bandwidth: number;
}

export interface GameConfig {
  gameName: string;
  ports: number[];
  networkRange?: string;
  requiresLowLatency?: boolean;
  maxPlayers: number;
}

export class HybridGameNetwork {
  private webrtcNetwork: WebRTCGameNetwork;
  private currentMode: ConnectionMode = 'none';
  private userId: string;
  private sessionId: string | null = null;

  constructor(userId: string) {
    this.userId = userId;
    this.webrtcNetwork = new WebRTCGameNetwork(userId);
  }

  /**
   * Smart connection: Try WebRTC first, fallback to VPN
   */
  async smartConnect(
    sessionId: string, 
    participantUserIds: string[],
    gameConfig: GameConfig
  ): Promise<{mode: ConnectionMode; message: string}> {
    this.sessionId = sessionId;
    console.log(`🎯 Smart connecting to ${gameConfig.gameName}...`);
    
    try {
      // Step 1: Try WebRTC (no download needed)
      console.log('🌐 Attempting WebRTC connection (no download required)...');
      
      const webrtcSession = await this.webrtcNetwork.joinSession(sessionId);
      
      // Set up event handlers
      webrtcSession.onPlayerJoined = (playerId) => {
        console.log(`🎮 Player ${playerId} joined via WebRTC`);
      };
      
      webrtcSession.onGameData = (data, fromPlayer) => {
        console.log(`📡 Game data from ${fromPlayer}:`, data);
      };
      
      // Test connection quality
      const connectionQuality = await this.testWebRTCQuality();
      
      if (connectionQuality.isGoodEnough || !gameConfig.requiresLowLatency) {
        console.log('✅ WebRTC connection successful - no VPN needed!');
        this.currentMode = 'webrtc';
        return {
          mode: 'webrtc',
          message: `🌐 Connected via browser to ${gameConfig.gameName} - no downloads needed!`
        };
      } else {
        console.log('⚠️ WebRTC quality insufficient for this game, suggesting VPN...');
        // Don't auto-fallback, let user choose
        return {
          mode: 'webrtc',
          message: `🌐 Connected via WebRTC, but VPN may provide better performance for ${gameConfig.gameName}`
        };
      }
      
    } catch (webrtcError) {
      console.log('❌ WebRTC failed, VPN option available:', webrtcError);
      
      return {
        mode: 'none',
        message: `❌ Browser connection failed. VPN download available for ${gameConfig.gameName}`
      };
    }
  }

  /**
   * Manually connect via VPN (user choice)
   */
  async connectViaVPN(
    sessionId: string,
    participantUserIds: string[],
    gameConfig: GameConfig
  ): Promise<{success: boolean; message: string; configUrl?: string}> {
    try {
      console.log(`🔒 Creating VPN connection for ${gameConfig.gameName}...`);
      
      // Create VPN session via API
      const response = await fetch('/api/vpn', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          participantUserIds,
          gameConfig
        })
      });

      if (!response.ok) {
        throw new Error('Failed to create VPN network');
      }

      const vpnResult = await response.json();

      this.currentMode = 'vpn';
      
      return {
        success: true,
        message: `🔒 VPN configuration ready for ${gameConfig.gameName}. Download and import into WireGuard.`,
        configUrl: vpnResult.configUrl
      };
      
    } catch (error) {
      console.error('❌ VPN connection failed:', error);
      return {
        success: false,
        message: `❌ Failed to create VPN connection: ${error}`
      };
    }
  }

  /**
   * Test WebRTC connection quality
   */
  private async testWebRTCQuality(): Promise<{isGoodEnough: boolean, latency: number}> {
    // Simple ping test through WebRTC
    const startTime = Date.now();
    
    try {
      // Send test data and measure response time
      this.webrtcNetwork.sendGameData({ type: 'ping-test', timestamp: startTime });
      
      // Wait for response (simplified - real implementation would be more robust)
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const latency = Date.now() - startTime;
      
      return {
        isGoodEnough: latency < 100, // Good if under 100ms
        latency
      };
    } catch (error) {
      return { isGoodEnough: false, latency: 9999 };
    }
  }

  /**
   * Get user-friendly connection status
   */
  getConnectionStatus(): {
    mode: string;
    quality: string;
    privacyLevel: string;
    userMessage: string;
  } {
    switch (this.currentMode) {
      case 'webrtc':
        return {
          mode: 'WebRTC (Browser-based)',
          quality: 'Good',
          privacyLevel: 'High - Direct P2P',
          userMessage: '🌐 Connected via browser - no downloads needed!'
        };
        
      case 'vpn':
        return {
          mode: 'Secure VPN',
          quality: 'Excellent',
          privacyLevel: 'Maximum - Encrypted tunnel',
          userMessage: '🔒 Connected via secure VPN - only game traffic routed'
        };
        
      default:
        return {
          mode: 'Not connected',
          quality: 'N/A',
          privacyLevel: 'N/A',
          userMessage: '❌ No active connection'
        };
    }
  }

  /**
   * Send game data through active connection
   */
  sendGameData(data: any): void {
    if (this.currentMode === 'webrtc') {
      this.webrtcNetwork.sendGameData(data);
    } else if (this.currentMode === 'vpn') {
      // VPN connections use traditional networking
      // Game handles networking through VPN tunnel
      console.log('📡 Sending game data through VPN tunnel');
    }
  }

  /**
   * Disconnect from current session
   */
  async disconnect(): Promise<void> {
    if (this.currentMode === 'webrtc') {
      await this.webrtcNetwork.leaveSession();
    } else if (this.currentMode === 'vpn') {
      // VPN cleanup handled by VPN manager
      console.log('🔒 VPN session will cleanup automatically');
    }
    
    this.currentMode = 'none';
  }
}

// Usage in game lobby:
/*
const hybridNetwork = new HybridGameNetwork(currentUser.id);

// Try to connect intelligently
const connectionMode = await hybridNetwork.smartConnect(sessionId, {
  gameName: 'Heroes of Might and Magic II',
  ports: [2350, 2351],
  networkRange: '10.0.0.0/24'
});

if (connectionMode === 'webrtc') {
  showMessage('🌐 Connected instantly - no downloads needed!');
} else if (connectionMode === 'vpn') {
  showMessage('🔒 Secure VPN connection established. Only game traffic is routed.');
}
*/
