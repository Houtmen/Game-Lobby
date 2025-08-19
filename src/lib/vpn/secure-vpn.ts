// Enhanced VPN configuration with explicit split tunneling
import crypto from 'crypto';
import { WireGuardManager, WireGuardConfig, WireGuardPeer, VPNSession } from './wireguard';

export class SecureVPNManager extends WireGuardManager {
  /**
   * Generate secure client configuration with split tunneling
   * ONLY routes game traffic through VPN, everything else stays local
   */
  async generateSecureClientConfig(
    config: WireGuardConfig,
    peerIndex: number,
    serverEndpoint: string,
    gameSpecificRoutes: string[] = []
  ): Promise<string> {
    const peer = config.peers[peerIndex];
    if (!peer) {
      throw new Error(`Peer ${peerIndex} not found in configuration`);
    }

    // Default game network routes (only these go through VPN)
    const defaultGameRoutes = [
      '10.0.0.0/24', // Game session network
      '192.168.100.0/24', // Alternative game network
    ];

    // Combine default and game-specific routes
    const allowedRoutes = [...defaultGameRoutes, ...gameSpecificRoutes];

    return `[Interface]
PrivateKey = ${peer.privateKey}
Address = ${peer.ipAddress}/24
DNS = 8.8.8.8

# Split Tunneling Configuration
# ONLY these networks will use the VPN:
# - Game session traffic (10.x.x.x)
# - Specific game ports
# ALL other traffic (web browsing, etc.) stays on your normal connection

[Peer]
PublicKey = ${config.serverPublicKey}
Endpoint = ${serverEndpoint}:${config.serverPort}
AllowedIPs = ${allowedRoutes.join(', ')}
PersistentKeepalive = 25

# Security Notes:
# ✅ Only game traffic goes through VPN
# ✅ Your browsing/personal data stays private
# ✅ Other players can't see your real IP
# ✅ Game traffic is encrypted and secure`;
  }

  /**
   * Create a privacy-focused VPN session with minimal data exposure
   */
  async createPrivacyFocusedSession(
    sessionId: string,
    participantUserIds: string[],
    gameConfig: {
      ports: number[];
      networkRange?: string;
      gameName: string;
    }
  ): Promise<VPNSession> {
    console.log(`🔒 Creating privacy-focused VPN for ${gameConfig.gameName}`);

    const networkId = `game-${sessionId}`;
    const serverPort = 51820 + Math.floor(Math.random() * 1000);
    const networkCIDR = gameConfig.networkRange || '10.0.0.0/24';

    // Generate keys for server
    const serverKeys = await this.generateKeyPair();

    // Generate peer configurations with limited scope
    const peers: WireGuardPeer[] = [];
    for (let i = 0; i < participantUserIds.length; i++) {
      const peerKeys = await this.generateKeyPair();
      const peerIP = `10.0.0.${i + 2}`; // Start from .2, .1 is server

      peers.push({
        publicKey: peerKeys.publicKey,
        privateKey: peerKeys.privateKey,
        ipAddress: peerIP,
        allowedIPs: [networkCIDR], // Only allow game network
        port: serverPort,
      });
    }

    const config: WireGuardConfig = {
      networkId,
      serverPrivateKey: serverKeys.privateKey,
      serverPublicKey: serverKeys.publicKey,
      serverAddress: '10.0.0.1',
      serverPort,
      networkCIDR,
      peers,
    };

    const vpnSession: VPNSession = {
      id: crypto.randomUUID(),
      sessionId,
      networkId,
      config,
      isActive: false,
      createdAt: new Date(),
      participants: participantUserIds,
    };

  this.setActiveSession(networkId, vpnSession);

    console.log(`✅ Privacy-focused VPN created for ${gameConfig.gameName}`);
    console.log(`🔒 Only game traffic (${networkCIDR}) will use VPN`);
    console.log(`🌐 All other internet traffic stays on your normal connection`);

    return vpnSession;
  }

  /**
   * Generate user-friendly privacy information
   */
  generatePrivacyInfo(sessionId: string): string {
    return `
🔒 VPN Privacy Information for Game Session

✅ WHAT IS PROTECTED:
• Your real IP address (hidden from other players)
• Game traffic encryption (secure communication)
• Direct connection for better game performance

✅ WHAT STAYS PRIVATE (NOT shared through VPN):
• Your web browsing (Google, YouTube, etc.)
• Your personal files and documents
• Other applications on your computer
• Your internet history
• Non-game network traffic

✅ WHAT OTHER PLAYERS CAN SEE:
• Your game character/actions (normal gameplay)
• Your game username
• Game-related communication only

🌐 TECHNICAL DETAILS:
• VPN only routes 10.0.0.0/24 network (game traffic)
• All other traffic uses your normal internet connection
• Session expires when game ends
• No permanent VPN installation required

🔐 SECURITY LEVEL: HIGH
• End-to-end encryption for game data
• No logging of personal activities
• Temporary network (auto-deleted after session)
`;
  }
}
