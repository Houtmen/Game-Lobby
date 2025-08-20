'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import FriendSelector from '@/components/friends/FriendSelector';
import { GameLauncher } from '@/components/games/GameLauncher';
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

export default function BasicLobby() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAllSessions, setShowAllSessions] = useState(false);
  const [showFriendSelector, setShowFriendSelector] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  // Get token from localStorage (consistent with Friends page)
  const getToken = () => localStorage.getItem('accessToken');

  useEffect(() => {
    if (user) {
      loadSessions();
      loadGames();
    }
  }, [user]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const token = getToken();
      if (!token) {
        setError('Authentication required');
        return;
      }

      const response = await fetch('/api/sessions', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
      } else {
        setError('Failed to load sessions');
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
      setError('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  const loadGames = async () => {
    try {
      const token = getToken();
      if (!token) return;

      const response = await fetch('/api/games', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setGames(data.games || []);
      }
    } catch (error) {
      console.error('Error loading games:', error);
    }
  };

  const createSession = async () => {
    if (games.length === 0) {
      setError('No games available. Please scan for games first.');
      return;
    }

    try {
      const token = getToken();
      if (!token) {
        setError('Authentication required');
        return;
      }

      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: `${user?.username}'s Game`,
          gameId: games[0].id,
          maxPlayers: 4,
        }),
      });

      if (response.ok) {
        loadSessions();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to create session');
      }
    } catch (error) {
      console.error('Error creating session:', error);
      setError('Failed to create session');
    }
  };

  const joinSession = async (sessionId: string) => {
    try {
      const token = getToken();
      if (!token) {
        setError('Authentication required');
        return;
      }

      const response = await fetch(`/api/sessions/${sessionId}/join`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        loadSessions();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to join session');
      }
    } catch (error) {
      console.error('Error joining session:', error);
      setError('Failed to join session');
    }
  };

  const leaveSession = async (sessionId: string) => {
    try {
      const token = getToken();
      if (!token) {
        setError('Authentication required');
        return;
      }

      const response = await fetch(`/api/sessions/${sessionId}/leave`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        loadSessions();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to leave session');
      }
    } catch (error) {
      console.error('Error leaving session:', error);
      setError('Failed to leave session');
    }
  };

  const startSession = async (sessionId: string) => {
    try {
      const token = getToken();
      if (!token) {
        setError('Authentication required');
        return;
      }

      const response = await fetch(`/api/sessions/${sessionId}/start`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        loadSessions();
        setError(null);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to start session');
      }
    } catch (error) {
      console.error('Error starting session:', error);
      setError('Failed to start session');
    }
  };

  const deleteSession = async (sessionId: string) => {
    try {
      const token = getToken();
      if (!token) {
        setError('Authentication required');
        return;
      }

      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        loadSessions();
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to delete session');
      }
    } catch (error) {
      console.error('Error deleting session:', error);
      setError('Failed to delete session');
    }
  };

  const scanForGames = async () => {
    try {
      setLoading(true);
      const token = getToken();
      if (!token) {
        setError('Authentication required');
        return;
      }

      const response = await fetch('/api/games/scan', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        await loadGames();
        setError(null); // Clear any previous errors
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to scan for games');
      }
    } catch (error) {
      console.error('Error scanning for games:', error);
      setError('Failed to scan for games');
    } finally {
      setLoading(false);
    }
  };

  const openFriendSelector = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setShowFriendSelector(true);
  };

  const closeFriendSelector = () => {
    setShowFriendSelector(false);
    setSelectedSessionId(null);
  };

  const onInviteSent = () => {
    // Optionally refresh sessions to show updated player count
    loadSessions();
  };

  const filteredSessions = sessions.filter(
    (session) => showAllSessions || session.status === 'WAITING' || session.status === 'ACTIVE'
  );

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <p>Please log in to access the lobby.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
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
            <Button onClick={() => setError(null)} variant="rose" padding="sm">Dismiss</Button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8 border border-gray-600">
          <h2 className="text-2xl font-semibold mb-4 text-white">Quick Actions</h2>
          <div className="flex flex-wrap gap-4">
            <Button onClick={createSession} variant="blue">Create New Session</Button>
            <Button onClick={loadSessions} variant="green">Refresh Sessions</Button>
            <Button onClick={scanForGames} disabled={loading} variant="purple">{loading ? 'Scanning...' : 'Scan for Games'}</Button>
          </div>
          <div className="mt-4 text-sm text-gray-400">
            <p>Games found: {games.length}</p>
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

                  <p className="text-gray-300 mb-2">Game: {session.game?.name || 'Unknown Game'}</p>
                  <p className="text-gray-400 mb-2">Host: {session.host?.username || 'Unknown'}</p>
                  <p className="text-gray-400 mb-4">
                    Players: {session.players?.length || 0} / {session.maxPlayers}
                  </p>

                  {/* Game Launcher Integration */}
                  {session.players?.some((p) => p.user.id === user?.id) &&
                    session.status === 'ACTIVE' && (
                      <div className="mb-4 border-t border-gray-600 pt-3">
                        <GameLauncher
                          sessionId={session.id}
                          gameId={session.game?.id || ''}
                          gameName={session.game?.name || 'Unknown Game'}
                          gameExecutable={session.game?.executablePath}
                          vpnRequired={session.game?.requiresVPN}
                        />
                      </div>
                    )}

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-500">
                      Created: {new Date(session.createdAt).toLocaleDateString()}
                    </span>
                    <div className="flex gap-2">
                      {session.status === 'WAITING' && (
                        <>
                          {session.host?.id === user?.id ? (
                            <>
                              <Button onClick={() => openFriendSelector(session.id)} variant="blue" padding="sm">Invite Friends</Button>
                              <Button onClick={() => startSession(session.id)} variant="green" padding="sm" disabled={!session.players || session.players.length < 1}>Start Game</Button>
                              <Button onClick={() => deleteSession(session.id)} variant="rose" padding="sm">Delete</Button>
                            </>
                          ) : (
                            <>
                              {session.players?.some((p) => p.user.id === user?.id) ? (
                                <Button onClick={() => leaveSession(session.id)} variant="amber" padding="sm">Leave</Button>
                              ) : (
                                <Button onClick={() => joinSession(session.id)} variant="green" padding="sm">Join</Button>
                              )}
                            </>
                          )}
                        </>
                      )}
                      {session.status === 'ACTIVE' &&
                        session.players?.some((p) => p.user.id === user?.id) && (
                          <div className="flex gap-2">
                            <span className="text-green-400 text-sm font-medium">
                              🎮 Game Active
                            </span>
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Status Info */}
        <div className="mt-8 text-center text-gray-400 text-sm">
          <p>🔧 Basic lobby mode - Advanced networking features will be added soon</p>
          <p>💡 Create a session and join to test the basic game management system</p>
        </div>

        {/* Friend Selector Modal */}
        {showFriendSelector && selectedSessionId && (
          <FriendSelector
            sessionId={selectedSessionId}
            onInviteSent={onInviteSent}
            onClose={closeFriendSelector}
          />
        )}
      </div>
    </div>
  );
}
