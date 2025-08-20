'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { HybridConnectionManager } from './HybridConnectionManager';
import { Button } from '@/components/ui';

interface Game {
  id: string;
  name: string;
  description?: string;
  maxPlayers?: number;
  requiresVPN: boolean;
  executablePath?: string;
  launchParameters?: string;
  networkPorts?: string;
}

interface User {
  id: string;
  username: string;
}

interface SessionPlayer {
  id: string;
  status: string;
  user: User;
}

interface GameSession {
  id: string;
  name: string;
  status: 'WAITING' | 'STARTING' | 'ACTIVE' | 'COMPLETED';
  maxPlayers: number;
  createdAt: string;
  host: User;
  game: Game;
  players: SessionPlayer[];
}

export default function SimpleLobby() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllSessions, setShowAllSessions] = useState(false);
  const [showGameSelection, setShowGameSelection] = useState(false);
  const [selectedGameForSession, setSelectedGameForSession] = useState<Game | null>(null);
  const [selectedMaxPlayers, setSelectedMaxPlayers] = useState(4);
  const [showConnectionManager, setShowConnectionManager] = useState(false);
  const [selectedSession, setSelectedSession] = useState<GameSession | null>(null);

  // Helper function to get auth headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem('accessToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  };

  const filteredSessions = showAllSessions
    ? Array.isArray(sessions)
      ? sessions
      : []
    : Array.isArray(sessions)
      ? sessions.filter((session) => ['WAITING', 'STARTING', 'ACTIVE'].includes(session.status))
      : [];

  useEffect(() => {
    if (user) {
      loadSessions();
      loadGames();
    }
  }, [user]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/sessions');

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      console.log('📡 Loaded sessions response:', data);
      // Handle both direct array and paginated response formats
      const sessionsData = data.data || data;
      setSessions(Array.isArray(sessionsData) ? sessionsData : []);
      setError(null);
    } catch (err) {
      console.error('Error loading sessions:', err);
      setError(err instanceof Error ? err.message : 'Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const loadGames = async () => {
    try {
      const response = await fetch('/api/games');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      console.log('🎮 Loaded games response:', data);
      // Handle both direct array and paginated response formats
      const gamesData = data.data || data;
      setGames(Array.isArray(gamesData) ? gamesData : []);
    } catch (err) {
      console.error('Error loading games:', err);
      setError('Failed to load games');
    }
  };

  const scanForGames = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/games/scan', {
        method: 'POST',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to scan for games');
      }

      const result = await response.json();
      console.log('🔍 Game scan result:', result);

      // Show success message
      setError(
        `Game scan complete! Found ${result.scanned} games, added ${result.added} new games.`
      );

      // Reload games to show newly detected ones
      await loadGames();
    } catch (err) {
      console.error('Error scanning games:', err);
      setError(err instanceof Error ? err.message : 'Failed to scan for games');
    } finally {
      setLoading(false);
    }
  };

  const createSession = () => {
    setShowGameSelection(true);
  };

  const createSessionWithGame = async (game: Game) => {
    if (!game || !user) return;

    try {
      const sessionName = `${user.username}'s ${game.name} Session`;

      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          name: sessionName,
          gameId: game.id,
          maxPlayers: selectedMaxPlayers,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create session');
      }

      const newSession = await response.json();
      console.log('✅ Session created:', newSession);

      // Reset modal state
      setShowGameSelection(false);
      setSelectedGameForSession(null);

      // Reload sessions to show the new one
      await loadSessions();
    } catch (err) {
      console.error('Error creating session:', err);
      setError(err instanceof Error ? err.message : 'Failed to create session');
    }
  };

  const joinSession = async (sessionId: string) => {
    if (!user) return;

    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: 'join' }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to join session');
      }

      const updatedSession = await response.json();
      console.log('✅ Joined session:', updatedSession);

      // Update the session in our local state
      setSessions((prevSessions) =>
        prevSessions.map((session) => (session.id === sessionId ? updatedSession : session))
      );

      // Show connection manager for this session
      setSelectedSession(updatedSession);
      setShowConnectionManager(true);
    } catch (err) {
      console.error('Error joining session:', err);
      setError(err instanceof Error ? err.message : 'Failed to join session');
    }
  };

  const leaveSession = async (sessionId: string) => {
    if (!user) return;

    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ action: 'leave' }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to leave session');
      }

      const updatedSession = await response.json();
      console.log('✅ Left session:', updatedSession);

      // Update the session in our local state
      setSessions((prevSessions) =>
        prevSessions.map((session) => (session.id === sessionId ? updatedSession : session))
      );
    } catch (err) {
      console.error('Error leaving session:', err);
      setError(err instanceof Error ? err.message : 'Failed to leave session');
    }
  };

  const deleteSession = async (sessionId: string) => {
    if (!user) return;

    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: getAuthHeaders(),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete session');
      }

      console.log('✅ Session deleted:', sessionId);

      // Remove the session from our local state
      setSessions((prevSessions) => prevSessions.filter((session) => session.id !== sessionId));
    } catch (err) {
      console.error('Error deleting session:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete session');
    }
  };

  const handleConnectionEstablished = () => {
    console.log('🎉 Connection established!');
    setShowConnectionManager(false);
    setSelectedSession(null);
  };

  const handleConnectionFailed = (error: string) => {
    console.error('💥 Connection failed:', error);
    setError(`Connection failed: ${error}`);
  };

  const closeConnectionManager = () => {
    setShowConnectionManager(false);
    setSelectedSession(null);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <p>Please log in to access the lobby.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Game Selection Modal */}
      {showGameSelection && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[9999]">
          <div className="bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-96 overflow-y-auto shadow-2xl border border-gray-600">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">
                {selectedGameForSession ? 'Configure Session' : 'Select a Game'}
              </h2>
              <Button onClick={() => { setShowGameSelection(false); setSelectedGameForSession(null); }} variant="gray" padding="sm">Close</Button>
            </div>

            {!selectedGameForSession ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {games.map((game) => (
                  <div
                    key={game.id}
                    onClick={() => {
                      setSelectedGameForSession(game);
                      setSelectedMaxPlayers(Math.min(game.maxPlayers || 4, 8));
                    }}
                    className="bg-gray-700 rounded-lg p-4 hover:bg-gray-600 cursor-pointer transition-colors border border-gray-500"
                  >
                    <h3 className="font-semibold text-lg mb-2 text-white">{game.name}</h3>
                    {game.description && (
                      <p className="text-gray-300 text-sm mb-2">{game.description}</p>
                    )}
                    {game.maxPlayers && (
                      <p className="text-gray-400 text-sm">Max Players: {game.maxPlayers}</p>
                    )}
                  </div>
                ))}

                {games.length === 0 && (
                  <div className="text-center text-gray-400 py-8 col-span-2">
                    <p>No games available</p>
                    <p className="text-sm mt-2">Please add some games to the database</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-gray-700 rounded-lg p-4 border border-gray-500">
                  <h3 className="font-semibold text-lg mb-2 text-white">
                    {selectedGameForSession.name}
                  </h3>
                  {selectedGameForSession.description && (
                    <p className="text-gray-300 text-sm">{selectedGameForSession.description}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2 text-white">
                    Maximum Players: {selectedMaxPlayers}
                  </label>
                  <input
                    type="range"
                    min="2"
                    max={Math.min(selectedGameForSession.maxPlayers || 8, 8)}
                    value={selectedMaxPlayers}
                    onChange={(e) => setSelectedMaxPlayers(parseInt(e.target.value))}
                    className="w-full h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>2</span>
                    <span>{Math.min(selectedGameForSession.maxPlayers || 8, 8)}</span>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <Button onClick={() => setSelectedGameForSession(null)} variant="gray" className="flex-1">Back</Button>
                  <Button onClick={() => createSessionWithGame(selectedGameForSession)} variant="blue" className="flex-1">Create Session</Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Connection Manager Modal */}
      {showConnectionManager && selectedSession && user && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9998] p-4">
          <div className="bg-gray-800 rounded-lg max-w-md w-full max-h-[90vh] overflow-y-auto border border-gray-600">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-white">
                  Connect to {selectedSession.game.name}
                </h3>
                <Button onClick={closeConnectionManager} variant="gray" padding="sm">Close</Button>
              </div>

              <div className="mb-4 text-sm text-gray-300">
                <div>Session: {selectedSession.name}</div>
                <div>Game: {selectedSession.game.name}</div>
                <div>Host: {selectedSession.host.username}</div>
                <div>
                  Players: {selectedSession.players.length}/{selectedSession.maxPlayers}
                </div>
                <div>VPN Required: {selectedSession.game.requiresVPN ? 'Yes' : 'No'}</div>
              </div>

              <HybridConnectionManager
                sessionId={selectedSession.id}
                participantUserIds={selectedSession.players.map((p) => p.user.id)}
                currentUserId={user.id}
                gameConfig={{
                  gameName: selectedSession.game.name,
                  ports: selectedSession.game.networkPorts
                    ? selectedSession.game.networkPorts.split(',').map((p) => parseInt(p.trim()))
                    : [27015],
                  networkRange: '10.0.0.0/24',
                  maxPlayers: selectedSession.maxPlayers,
                  requiresVPN: selectedSession.game.requiresVPN,
                  executablePath: selectedSession.game.executablePath,
                  launchParameters: selectedSession.game.launchParameters,
                }}
                onConnectionEstablished={handleConnectionEstablished}
                onConnectionFailed={handleConnectionFailed}
              />
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 text-blue-400">Game Lobby</h1>
          <p className="text-gray-300">Welcome back, {user.username}!</p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-800 border border-red-600 text-red-200 px-4 py-3 rounded mb-6">
            <p className="font-bold">Error</p>
            <p>{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 border border-red-400"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Create Session Section */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8 border border-gray-600">
          <h2 className="text-2xl font-semibold mb-4 text-white">Create New Session</h2>
          <div className="text-center">
            <Button onClick={createSession} variant="blue">Create New Session</Button>
            <Button onClick={loadSessions} variant="green">Refresh Sessions</Button>
            <Button onClick={scanForGames} disabled={loading} variant="purple">{loading ? 'Scanning...' : 'Scan for Games'}</Button>
          </div>
        </div>

        {/* Sessions List */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-600">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-white">
              {showAllSessions ? 'All Game Sessions' : 'Active Game Sessions'}
            </h2>
            <Button onClick={() => setShowAllSessions(!showAllSessions)} variant={showAllSessions ? 'amber' : 'green'}>
              {showAllSessions ? 'Show Active Only' : 'Show All Sessions'}
            </Button>
          </div>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
              <p className="text-gray-400">Loading sessions...</p>
            </div>
          ) : filteredSessions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 text-lg mb-4">
                {showAllSessions ? 'No sessions found' : 'No active sessions found'}
              </p>
              <p className="text-gray-500">
                {showAllSessions
                  ? 'Create a new session to get started!'
                  : 'Create a new session or show all sessions to see inactive ones'}
              </p>
            </div>
          ) : (
            <div>
              <div className="mb-4 text-sm text-gray-400">
                Found {filteredSessions.length} session(s)
                {!showAllSessions &&
                  Array.isArray(sessions) &&
                  sessions.length > filteredSessions.length &&
                  ` (${sessions.length - filteredSessions.length} inactive hidden)`}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredSessions.map((session) => (
                  <div
                    key={session.id}
                    className="bg-gray-700 rounded-lg p-4 hover:bg-gray-600 transition-colors border border-gray-500"
                  >
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-lg text-white">{session.name}</h3>
                      <span
                        className={`px-2 py-1 rounded text-sm font-medium ${
                          session.status === 'WAITING'
                            ? 'bg-green-600 text-green-100'
                            : session.status === 'STARTING'
                              ? 'bg-yellow-600 text-yellow-100'
                              : session.status === 'ACTIVE'
                                ? 'bg-blue-600 text-blue-100'
                                : 'bg-gray-600 text-gray-100'
                        }`}
                      >
                        {session.status}
                      </span>
                    </div>

                    <p className="text-gray-300 mb-2">
                      Game: {session.game?.name || 'Unknown Game'}
                    </p>
                    <p className="text-gray-400 mb-2">
                      Host: {session.host?.username || 'Unknown'}
                    </p>
                    <p className="text-gray-400 mb-4">
                      Players: {session.players?.length || 0} / {session.maxPlayers}
                    </p>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">
                        Created: {new Date(session.createdAt).toLocaleDateString()}
                      </span>

                      <div className="flex gap-2">
                        {session.status === 'WAITING' && (
                          <>
                            {/* Check if user is the host */}
                            {session.host?.id === user?.id ? (
                              <Button onClick={() => deleteSession(session.id)} variant="rose" padding="sm">Delete</Button>
                            ) : (
                              <>
                                {/* Check if user is already in the session */}
                                {session.players?.some((p) => p.user.id === user?.id) ? (
                                  <Button onClick={() => leaveSession(session.id)} variant="amber" padding="sm">Leave</Button>
                                ) : (
                                  <Button onClick={() => joinSession(session.id)} variant="green" padding="sm">Join</Button>
                                )}
                              </>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Status Info */}
        <div className="mt-8 text-center text-gray-400 text-sm">
          <p>🔧 Simplified lobby mode - Real-time features will be added soon</p>
          <p>💡 Create a session and join to test the game launcher system</p>
        </div>
      </div>
    </div>
  );
}
