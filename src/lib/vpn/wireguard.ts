import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const execAsync = promisify(exec);

export interface WireGuardPeer {
  publicKey: string;
  privateKey: string;
  ipAddress: string;
  allowedIPs: string[];
  endpoint?: string;
  port?: number;
}

export interface WireGuardConfig {
  networkId: string;
  serverPrivateKey: string;
  serverPublicKey: string;
  serverAddress: string;
  serverPort: number;
  networkCIDR: string;
  peers: WireGuardPeer[];
}

export interface VPNSession {
  id: string;
  sessionId: string;
  networkId: string;
  config: WireGuardConfig;
  isActive: boolean;
  createdAt: Date;
  participants: string[]; // user IDs
}

export class WireGuardManager {
  private configDir: string;
  private activeConfigs: Map<string, VPNSession> = new Map();

  constructor(configDir = 'C:\\Program Files\\WireGuard\\Data\\Configurations') {
    this.configDir = configDir;
  }

  // Allow subclasses to register sessions in a controlled way
  protected setActiveSession(networkId: string, session: VPNSession) {
    this.activeConfigs.set(networkId, session);
  }

  /**
   * Generate a new WireGuard key pair
   */
  async generateKeyPair(): Promise<{ privateKey: string; publicKey: string }> {
    try {
      // Generate private key
      const { stdout: privateKey } = await execAsync('wg genkey');

      // Generate public key from private key
      const { stdout: publicKey } = await execAsync(`echo ${privateKey.trim()} | wg pubkey`);

      return {
        privateKey: privateKey.trim(),
        publicKey: publicKey.trim(),
      };
    } catch (error) {
      throw new Error(`Failed to generate WireGuard keys: ${error}`);
    }
  }

  /**
   * Create a new VPN network for a game session
   */
  async createVPNNetwork(sessionId: string, participantUserIds: string[]): Promise<VPNSession> {
    const networkId = `lobby-${sessionId}`;

    // Generate server keys
    const serverKeys = await this.generateKeyPair();

    // Create base network configuration
    const baseIP = this.generateNetworkIP();
    const serverAddress = `${baseIP}.1`;
    const networkCIDR = `${baseIP}.0/24`;
    const serverPort = this.getAvailablePort();

    // Generate peer configurations for each participant
    const peers: WireGuardPeer[] = [];
    for (let i = 0; i < participantUserIds.length; i++) {
      const peerKeys = await this.generateKeyPair();
      const peerIP = `${baseIP}.${i + 2}`; // Start from .2

      peers.push({
        publicKey: peerKeys.publicKey,
        privateKey: peerKeys.privateKey,
        ipAddress: peerIP,
        allowedIPs: [networkCIDR], // Allow access to entire network
      });
    }

    const config: WireGuardConfig = {
      networkId,
      serverPrivateKey: serverKeys.privateKey,
      serverPublicKey: serverKeys.publicKey,
      serverAddress,
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

    // Store configuration
    this.activeConfigs.set(networkId, vpnSession);

    return vpnSession;
  }

  /**
   * Generate server configuration file
   */
  async generateServerConfig(config: WireGuardConfig): Promise<string> {
    const peers = config.peers
      .map(
        (peer) => `
[Peer]
PublicKey = ${peer.publicKey}
AllowedIPs = ${peer.ipAddress}/32`
      )
      .join('\n');

    return `[Interface]
PrivateKey = ${config.serverPrivateKey}
Address = ${config.serverAddress}/24
ListenPort = ${config.serverPort}
SaveConfig = true

# PostUp and PostDown scripts for traffic routing
PostUp = netsh interface ipv4 set subinterface "${config.networkId}" mtu=1420
PostDown = echo "VPN session ${config.networkId} terminated"
${peers}`;
  }

  /**
   * Generate client configuration for a specific peer
   */
  async generateClientConfig(
    config: WireGuardConfig,
    peerIndex: number,
    serverEndpoint: string
  ): Promise<string> {
    const peer = config.peers[peerIndex];
    if (!peer) {
      throw new Error(`Peer ${peerIndex} not found in configuration`);
    }

    return `[Interface]
PrivateKey = ${peer.privateKey}
Address = ${peer.ipAddress}/24
DNS = 8.8.8.8

[Peer]
PublicKey = ${config.serverPublicKey}
Endpoint = ${serverEndpoint}:${config.serverPort}
AllowedIPs = ${config.networkCIDR}
PersistentKeepalive = 25`;
  }

  /**
   * Start VPN network (server-side)
   */
  async startVPNNetwork(networkId: string): Promise<void> {
    const vpnSession = this.activeConfigs.get(networkId);
    if (!vpnSession) {
      throw new Error(`VPN session ${networkId} not found`);
    }

    try {
      // Generate server configuration
      const serverConfig = await this.generateServerConfig(vpnSession.config);
      const configPath = path.join(this.configDir, `${networkId}.conf`);

      // Write configuration file
      await fs.writeFile(configPath, serverConfig);

      // Start WireGuard interface
      await execAsync(`wg-quick up "${configPath}"`);

      // Mark as active
      vpnSession.isActive = true;
      this.activeConfigs.set(networkId, vpnSession);

      console.log(`VPN network ${networkId} started successfully`);
    } catch (error) {
      throw new Error(`Failed to start VPN network ${networkId}: ${error}`);
    }
  }

  /**
   * Stop VPN network
   */
  async stopVPNNetwork(networkId: string): Promise<void> {
    const vpnSession = this.activeConfigs.get(networkId);
    if (!vpnSession) {
      throw new Error(`VPN session ${networkId} not found`);
    }

    try {
      const configPath = path.join(this.configDir, `${networkId}.conf`);

      // Stop WireGuard interface
      await execAsync(`wg-quick down "${configPath}"`);

      // Clean up configuration file
      await fs.unlink(configPath).catch(() => {}); // Ignore if file doesn't exist

      // Mark as inactive
      vpnSession.isActive = false;
      this.activeConfigs.set(networkId, vpnSession);

      console.log(`VPN network ${networkId} stopped successfully`);
    } catch (error) {
      throw new Error(`Failed to stop VPN network ${networkId}: ${error}`);
    }
  }

  /**
   * Get client configuration for download
   */
  async getClientConfig(
    networkId: string,
    userId: string,
    serverEndpoint: string
  ): Promise<string> {
    const vpnSession = this.activeConfigs.get(networkId);
    if (!vpnSession) {
      throw new Error(`VPN session ${networkId} not found`);
    }

    const peerIndex = vpnSession.participants.indexOf(userId);
    if (peerIndex === -1) {
      throw new Error(`User ${userId} is not a participant in VPN session ${networkId}`);
    }

    return this.generateClientConfig(vpnSession.config, peerIndex, serverEndpoint);
  }

  /**
   * Get VPN session status
   */
  getVPNSession(networkId: string): VPNSession | undefined {
    return this.activeConfigs.get(networkId);
  }

  /**
   * List all active VPN sessions
   */
  getActiveVPNSessions(): VPNSession[] {
    return Array.from(this.activeConfigs.values()).filter((session) => session.isActive);
  }

  /**
   * Generate a unique network IP range
   */
  private generateNetworkIP(): string {
    // Use 10.x.x.x range for private networks
    const octet2 = Math.floor(Math.random() * 255) + 1;
    const octet3 = Math.floor(Math.random() * 255) + 1;
    return `10.${octet2}.${octet3}`;
  }

  /**
   * Get an available port for WireGuard
   */
  private getAvailablePort(): number {
    // WireGuard typically uses 51820, but we'll use a range for multiple sessions
    return 51820 + Math.floor(Math.random() * 1000);
  }

  /**
   * Check if WireGuard is installed and available
   */
  async checkWireGuardAvailability(): Promise<boolean> {
    try {
      await execAsync('wg --version');
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clean up expired or inactive VPN sessions
   */
  async cleanupInactiveSessions(maxAgeHours = 24): Promise<void> {
    const cutoffTime = new Date(Date.now() - maxAgeHours * 60 * 60 * 1000);

    for (const [networkId, session] of this.activeConfigs) {
      if (!session.isActive && session.createdAt < cutoffTime) {
        try {
          await this.stopVPNNetwork(networkId);
          this.activeConfigs.delete(networkId);
          console.log(`Cleaned up expired VPN session: ${networkId}`);
        } catch (error) {
          console.error(`Failed to cleanup VPN session ${networkId}:`, error);
        }
      }
    }
  }
}

// Export singleton instance
export const wireGuardManager = new WireGuardManager();
