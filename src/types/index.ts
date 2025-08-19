import { DefaultSession } from 'next-auth';

// Extend NextAuth types
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      username: string;
      provider: string;
      avatar?: string;
    } & DefaultSession['user'];
  }

  interface User {
    username: string;
    provider: string;
    avatar?: string;
  }
}

// Core user interface
export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen: Date;
  createdAt: Date;
  provider?: string;
  providerId?: string;
  emailVerified?: Date;
  friends: string[]; // User IDs
  blockedUsers: string[]; // User IDs
}

// Friend request interface
export interface FriendRequest {
  id: string;
  senderId: string;
  receiverId: string;
  status: 'PENDING' | 'ACCEPTED' | 'BLOCKED';
  createdAt: Date;
  acceptedAt?: Date;
  sender: {
    id: string;
    username: string;
    avatar?: string;
    isOnline: boolean;
  };
  receiver: {
    id: string;
    username: string;
    avatar?: string;
    isOnline: boolean;
  };
}

// Friend interface
export interface Friend {
  id: string;
  username: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen: Date;
  friendshipId: string;
  friendshipCreatedAt: Date;
}

// Game configuration interface
export interface Game {
  id: string;
  name: string;
  description: string;
  executable: string; // legacy alias for executablePath
  executablePath?: string;
  iconUrl?: string;
  bannerUrl?: string;
  category?: string;
  networkProtocol: 'tcp' | 'udp' | 'ipx';
  defaultPort: number;
  portRange?: { min: number; max: number };
  maxPlayers: number;
  minPlayers: number;
  vpnRequired: boolean; // legacy alias
  requiresVPN?: boolean;
  launchParameters?: string[];
  supportedPlatforms: ('windows' | 'mac' | 'linux')[];
  isActive: boolean;
  addedBy: string; // User ID who added the game
  addedAt: Date;
  version?: string;
  requirements?: {
    os?: string;
    memory?: string;
    storage?: string;
    graphics?: string;
  };
}

// Game session/lobby interface
export interface GameSession {
  id: string;
  gameId: string;
  name: string;
  description?: string;
  hostPlayerId: string;
  players: SessionPlayer[];
  status: 'waiting' | 'starting' | 'active' | 'finished' | 'cancelled';
  isPrivate: boolean;
  password?: string;
  maxPlayers: number;
  vpnNetwork?: VPNNetwork;
  gameSettings?: Record<string, any>;
  createdAt: Date;
  startedAt?: Date;
  endedAt?: Date;
  inviteCode?: string;
}

// Player in a session
export interface SessionPlayer {
  userId: string;
  username: string;
  avatar?: string;
  isHost: boolean;
  isReady: boolean;
  joinedAt: Date;
  vpnIP?: string;
  status: 'connected' | 'disconnected' | 'in-game';
  team?: number;
  position?: number;
}

// VPN network configuration
export interface VPNNetwork {
  id: string;
  sessionId: string;
  networkAddress: string; // e.g., "10.10.0.0/24"
  gateway: string; // e.g., "10.10.0.1"
  dnsServers: string[];
  peers: VPNPeer[];
  isActive: boolean;
  createdAt: Date;
  expiresAt: Date;
}

// VPN peer configuration
export interface VPNPeer {
  userId: string;
  publicKey: string;
  privateKey: string;
  ipAddress: string;
  allowedIPs: string[];
  endpoint?: string;
  port?: number;
  isConnected: boolean;
  lastHandshake?: Date;
}

// Chat message interface
export interface ChatMessage {
  id: string;
  sessionId?: string; // If null, it's a global lobby message
  userId: string;
  username: string;
  message: string;
  timestamp: Date;
  type: 'text' | 'system' | 'join' | 'leave' | 'game-start' | 'game-end';
}

// Real-time events for Socket.io
export interface SocketEvents {
  // User events
  'user:join': (data: { sessionId: string; user: User }) => void;
  'user:leave': (data: { sessionId: string; userId: string }) => void;
  'user:ready': (data: { sessionId: string; userId: string; isReady: boolean }) => void;

  // Session events
  'session:created': (session: GameSession) => void;
  'session:updated': (session: GameSession) => void;
  'session:deleted': (sessionId: string) => void;
  'session:player-joined': (data: { sessionId: string; player: SessionPlayer }) => void;
  'session:player-left': (data: { sessionId: string; userId: string }) => void;
  'session:started': (data: { sessionId: string; vpnConfig: VPNNetwork }) => void;
  'session:ended': (sessionId: string) => void;

  // Chat events
  'chat:message': (message: ChatMessage) => void;
  'chat:typing': (data: { sessionId: string; userId: string; isTyping: boolean }) => void;

  // VPN events
  'vpn:config': (config: VPNPeer) => void;
  'vpn:status': (data: { sessionId: string; userId: string; isConnected: boolean }) => void;

  // Game events
  'game:launch': (data: { sessionId: string; gameConfig: Game; vpnConfig: VPNPeer }) => void;
  'game:status': (data: { sessionId: string; userId: string; status: string }) => void;
}

// API Response interfaces
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Authentication interfaces
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

// Game launcher interfaces
export interface GameLaunchConfig {
  gameExecutable: string;
  gameDirectory: string;
  launchParameters: string[];
  vpnConfig: VPNPeer;
  networkSettings: {
    serverIP: string;
    port: number;
    protocol: string;
  };
}

export interface GameProcess {
  sessionId: string;
  userId: string;
  processId: number;
  gameId: string;
  startTime: Date;
  status: 'starting' | 'running' | 'terminated' | 'error';
  exitCode?: number;
}

// Notification interfaces
export interface Notification {
  id: string;
  userId: string;
  type: 'friend-request' | 'session-invite' | 'game-update' | 'system';
  title: string;
  message: string;
  data?: Record<string, any>;
  isRead: boolean;
  createdAt: Date;
  expiresAt?: Date;
}

// Settings interfaces
export interface UserSettings {
  userId: string;
  theme: 'light' | 'dark' | 'system';
  language: string;
  notifications: {
    friendRequests: boolean;
    sessionInvites: boolean;
    gameUpdates: boolean;
    systemMessages: boolean;
  };
  privacy: {
    showOnlineStatus: boolean;
    allowFriendRequests: boolean;
    showGameLibrary: boolean;
  };
  gameDefaults: {
    autoLaunch: boolean;
    closeAfterGame: boolean;
    preferredVoiceChat: string;
  };
}

// Error interfaces
export interface AppError {
  code: string;
  message: string;
  details?: Record<string, any>;
  timestamp: Date;
}

export interface ValidationError extends AppError {
  field: string;
  value: any;
}
