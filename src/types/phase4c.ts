// Phase 4C: Enhanced Launcher Features - Types
// These interfaces define the contract for profiles, mods, recordings, saves, and tournaments.

export type ID = string;

export interface GameProfile {
  id: ID;
  gameId: ID;
  userId: ID;
  name: string;
  args?: string[];
  env?: Record<string, string>;
  workingDir?: string;
  isDefault?: boolean;
  createdAt: string; // ISO
  updatedAt: string; // ISO
}

export interface GameMod {
  id: ID;
  gameId: ID;
  name: string;
  version?: string;
  enabled: boolean;
  source?: 'local' | 'workshop' | 'url';
  installedAt?: string; // ISO
}

export interface SessionRecording {
  id: ID;
  sessionId: ID;
  gameId: ID;
  userId: ID;
  startedAt: string; // ISO
  endedAt?: string; // ISO
  status: 'recording' | 'completed' | 'failed';
  sizeBytes?: number;
  filePath?: string;
}

export interface SaveState {
  id: ID;
  gameId: ID;
  userId: ID;
  sessionId?: ID;
  storageKey: string; // e.g., cloud path or local key
  notes?: string;
  metadata?: Record<string, unknown>;
  createdAt: string; // ISO
}

export interface Tournament {
  id: ID;
  name: string;
  gameId: ID;
  status: 'upcoming' | 'active' | 'completed';
  startAt?: string; // ISO
  rules?: string;
  bracket?: Record<string, unknown>;
}
