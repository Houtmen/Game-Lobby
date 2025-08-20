import { v4 as uuidv4 } from 'uuid';
import type { GameProfile, GameMod, SessionRecording, SaveState, Tournament, ID } from '@/types/phase4c';

// Very small in-memory store. This is a temporary dev scaffold until Prisma models are added.
// Data is partitioned per userId where applicable to keep scope minimal.
class Phase4CStore {
  private profilesMap: Map<ID, GameProfile> = new Map();
  private modsMap: Map<ID, GameMod> = new Map();
  private recordingsMap: Map<ID, SessionRecording> = new Map();
  private savesMap: Map<ID, SaveState> = new Map();
  private tournamentsMap: Map<ID, Tournament> = new Map();

  private nowISO() {
    return new Date().toISOString();
  }

  // Profiles
  listProfiles(userId: ID, gameId?: ID) {
  const arr = Array.from(this.profilesMap.values());
  return arr.filter((p) => p.userId === userId && (!gameId || p.gameId === gameId));
  }
  createProfile(input: Omit<GameProfile, 'id' | 'createdAt' | 'updatedAt'>) {
    const now = this.nowISO();
  const id = uuidv4();
  const entity: GameProfile = { id, ...input, createdAt: now, updatedAt: now };
  this.profilesMap.set(id, entity);
  // If this profile is marked as default, ensure it's the single default for its user+game
  if (entity.isDefault) {
    this.setProfileDefault(entity.userId, entity.gameId, entity.id);
  }
  return entity;
  }
  updateProfile(id: ID, patch: Partial<GameProfile>) {
  const existing = this.profilesMap.get(id);
  if (!existing) return undefined;
  const updated: GameProfile = { ...existing, ...patch, updatedAt: this.nowISO() };
  this.profilesMap.set(id, updated);
  return updated;
  }
  /**
   * Mark a profile as the single default for the given user and game.
   * Unsets isDefault on all sibling profiles.
   */
  setProfileDefault(userId: ID, gameId: ID, profileId: ID): GameProfile | undefined {
    let result: GameProfile | undefined;
    for (const [id, p] of this.profilesMap) {
      if (p.userId === userId && p.gameId === gameId) {
        const next: GameProfile = {
          ...p,
          isDefault: id === profileId,
          updatedAt: this.nowISO(),
        };
        this.profilesMap.set(id, next);
        if (id === profileId) result = next;
      }
    }
    return result;
  }
  deleteProfile(id: ID) {
  return this.profilesMap.delete(id);
  }

  // Mods
  listMods(gameId?: ID) {
  const arr = Array.from(this.modsMap.values());
  return arr.filter((m) => (!gameId ? true : m.gameId === gameId));
  }
  createMod(input: Omit<GameMod, 'id' | 'installedAt'>) {
    const installedAt = this.nowISO();
  const id = uuidv4();
  const entity: GameMod = { id, ...input, installedAt };
  this.modsMap.set(id, entity);
  return entity;
  }
  updateMod(id: ID, patch: Partial<GameMod>) {
  const existing = this.modsMap.get(id);
  if (!existing) return undefined;
  const updated: GameMod = { ...existing, ...patch };
  this.modsMap.set(id, updated);
  return updated;
  }
  deleteMod(id: ID) {
  return this.modsMap.delete(id);
  }

  // Recordings
  listRecordings(userId: ID, sessionId?: ID) {
    const arr = Array.from(this.recordingsMap.values());
    return arr.filter((r) => r.userId === userId && (!sessionId || r.sessionId === sessionId));
  }
  createRecording(input: Omit<SessionRecording, 'id' | 'startedAt' | 'status'>) {
    const id = uuidv4();
    const entity: SessionRecording = {
      id,
      ...input,
      startedAt: this.nowISO(),
      status: 'recording',
    };
    this.recordingsMap.set(id, entity);
    return entity;
  }
  completeRecording(id: ID, patch?: Partial<SessionRecording>) {
    const existing = this.recordingsMap.get(id);
    if (!existing) return undefined;
    const updated: SessionRecording = {
      ...existing,
      status: 'completed',
      endedAt: this.nowISO(),
      ...(patch || {}),
    };
    this.recordingsMap.set(id, updated);
    return updated;
  }
  deleteRecording(id: ID) {
    return this.recordingsMap.delete(id);
  }

  // Saves
  listSaves(userId: ID, gameId?: ID) {
  const arr = Array.from(this.savesMap.values());
  return arr.filter((s) => s.userId === userId && (!gameId || s.gameId === gameId));
  }
  createSave(input: Omit<SaveState, 'id' | 'createdAt'>) {
  const id = uuidv4();
  const entity: SaveState = { id, ...input, createdAt: this.nowISO() };
  this.savesMap.set(id, entity);
  return entity;
  }
  updateSave(id: ID, patch: Partial<SaveState>) {
  const existing = this.savesMap.get(id);
  if (!existing) return undefined;
  const updated: SaveState = { ...existing, ...patch };
  this.savesMap.set(id, updated);
  return updated;
  }
  deleteSave(id: ID) {
  return this.savesMap.delete(id);
  }

  // Tournaments (global scope; could be per organizer in future)
  listTournaments(status?: Tournament['status']) {
  const arr = Array.from(this.tournamentsMap.values());
  return arr.filter((t) => (!status ? true : t.status === status));
  }
  createTournament(input: Omit<Tournament, 'id'>) {
  const id = uuidv4();
  const entity: Tournament = { id, ...input } as Tournament;
  this.tournamentsMap.set(id, entity);
  return entity;
  }
  updateTournament(id: ID, patch: Partial<Tournament>) {
  const existing = this.tournamentsMap.get(id);
  if (!existing) return undefined;
  const updated: Tournament = { ...existing, ...patch };
  this.tournamentsMap.set(id, updated);
  return updated;
  }
  deleteTournament(id: ID) {
  return this.tournamentsMap.delete(id);
  }
}

declare global {
  var __phase4cStore: Phase4CStore | undefined;
}

export function getPhase4CStore(): Phase4CStore {
  if (!globalThis.__phase4cStore) {
    globalThis.__phase4cStore = new Phase4CStore();
  }
  return globalThis.__phase4cStore;
}
