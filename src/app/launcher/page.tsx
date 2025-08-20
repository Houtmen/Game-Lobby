'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { GameLauncher } from '@/components/games/GameLauncher';
import { Monitor, Users, Wifi, WifiOff } from 'lucide-react';
import { Button, buttonClasses } from '@/components/ui';

interface ActiveSession {
  id: string;
  name: string;
  status: string;
  game: {
    id: string;
    name: string;
    requiresVPN: boolean;
    executablePath?: string;
  };
  players: Array<{
    id: string;
    user: {
      id: string;
      username: string;
    };
    status: string;
  }>;
}

interface GameProcess {
  isRunning: boolean;
  status: string;
  processId?: number;
  startTime?: string;
  exitCode?: number;
}

export default function GameLauncherPage() {
  const { user } = useAuth();
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [gameProcesses, setGameProcesses] = useState<Record<string, GameProcess>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const getToken = () => localStorage.getItem('accessToken');

  useEffect(() => {
    if (user) {
      loadActiveSessions();
      const interval = setInterval(loadActiveSessions, 10000); // Refresh every 10 seconds
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadActiveSessions = async () => {
    try {
      setLoading(true);
      const token = getToken();
      if (!token) {
        setError('Authentication required');
        return;
      }

      // Load sessions where user is a participant and status is ACTIVE
      const response = await fetch('/api/sessions?status=ACTIVE&participant=true', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const sessions = data.sessions || [];
        setActiveSessions(sessions);

        // Load game process status for each session
        const processPromises = sessions.map((session: ActiveSession) =>
          loadGameProcessStatus(session.id)
        );
        await Promise.all(processPromises);

        setError(null);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to load active sessions');
      }
    } catch (error) {
      console.error('Error loading active sessions:', error);
      setError('Failed to load active sessions');
    } finally {
      setLoading(false);
    }
  };

  const loadGameProcessStatus = async (sessionId: string) => {
    try {
      const token = getToken();
      if (!token) return;

      const response = await fetch(`/api/games/launch?sessionId=${sessionId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const status = await response.json();
        setGameProcesses((prev) => ({
          ...prev,
          [sessionId]: status,
        }));
      }
    } catch (error) {
      console.error(`Error loading game process status for session ${sessionId}:`, error);
    }
  };

  const launchGameForSession = async (sessionId: string, gameId: string) => {
    try {
      const token = getToken();
      if (!token) {
        setError('Authentication required');
        return;
      }

      const response = await fetch('/api/games/launch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          sessionId,
          gameId,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Game launched successfully:', result);
        // Refresh the status
        await loadGameProcessStatus(sessionId);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to launch game');
      }
    } catch (error) {
      console.error('Error launching game:', error);
      setError('Failed to launch game');
    }
  };

  const terminateGameForSession = async (sessionId: string) => {
    try {
      const token = getToken();
      if (!token) {
        setError('Authentication required');
        return;
      }

      const response = await fetch(`/api/games/launch?sessionId=${sessionId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        console.log('Game terminated successfully');
        // Refresh the status
        await loadGameProcessStatus(sessionId);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to terminate game');
      }
    } catch (error) {
      console.error('Error terminating game:', error);
      setError('Failed to terminate game');
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
          <p className="text-gray-300 mb-6">Please log in to access the game launcher.</p>
          <Link 
            href="/login"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 text-blue-400">🎮 Game Launcher</h1>
          <p className="text-gray-300">Launch and manage your active game sessions</p>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-800 border border-red-600 text-red-200 px-4 py-3 rounded mb-6">
            <p className="font-bold">Error</p>
            <p>{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-2 text-sm inline-flex px-3 py-1 text-white font-semibold rounded-lg border-2 bg-rose-600 hover:bg-rose-700 border-rose-400"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Quick Actions */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8 border border-gray-600">
          <h2 className="text-2xl font-semibold mb-4 text-white">Quick Actions</h2>
          <div className="flex flex-wrap gap-4">
            <Button onClick={loadActiveSessions} disabled={loading} variant="green">
              {loading ? 'Refreshing...' : 'Refresh Status'}
            </Button>
            <Link href="/lobby" className={buttonClasses('blue')}>
              Back to Lobby
            </Link>
            <Link href="/games" className={buttonClasses('purple')}>
              Manage Games
            </Link>
            {/* Phase 4C Entrypoints */}
            <Link href="/profiles" className={buttonClasses('amber')}>
              Profiles
            </Link>
            <Link href="/mods" className={buttonClasses('cyan')}>
              Mods
            </Link>
            <Link href="/recordings" className={buttonClasses('teal')}>
              Recordings
            </Link>
            <Link href="/saves" className={buttonClasses('indigo')}>
              Save States
            </Link>
            <Link href="/tournaments" className={buttonClasses('rose')}>
              Tournaments
            </Link>
          </div>
        </div>

        {/* Active Sessions */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-600">
          <h2 className="text-2xl font-semibold mb-4 text-white">Active Game Sessions</h2>

          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
              <p className="text-gray-400">Loading active sessions...</p>
            </div>
          ) : activeSessions.length === 0 ? (
            <div className="text-center py-8">
              <Monitor className="mx-auto h-16 w-16 text-gray-400 mb-4" />
              <p className="text-gray-400 text-lg mb-4">No active game sessions</p>
              <p className="text-gray-500 mb-4">
                Join or create a session in the lobby to start playing!
              </p>
              <Link
                href="/lobby"
                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg inline-block"
              >
                Go to Lobby
              </Link>
            </div>
          ) : (
            <div className="space-y-6">
              {activeSessions.map((session) => {
                const gameProcess = gameProcesses[session.id];
                const isGameRunning = gameProcess?.isRunning || false;

                return (
                  <div
                    key={session.id}
                    className="bg-gray-700 rounded-lg p-6 border border-gray-600"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-xl font-semibold text-white mb-2">{session.name}</h3>
                        <p className="text-gray-300 mb-1">Game: {session.game.name}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-400">
                          <span className="flex items-center gap-1">
                            <Users className="h-4 w-4" />
                            {session.players.length} players
                          </span>
                          <span className="flex items-center gap-1">
                            {session.game.requiresVPN ? (
                              <>
                                <Wifi className="h-4 w-4 text-orange-400" />
                                VPN Required
                              </>
                            ) : (
                              <>
                                <WifiOff className="h-4 w-4 text-green-400" />
                                Direct Connection
                              </>
                            )}
                          </span>
                        </div>
                      </div>

                      <div className="text-right">
                        <span
                          className={`px-3 py-1 rounded text-sm font-medium ${
                            isGameRunning
                              ? 'bg-green-600 text-green-100'
                              : 'bg-gray-600 text-gray-100'
                          }`}
                        >
                          {isGameRunning ? '🎮 Running' : '⏸️ Stopped'}
                        </span>
                        {gameProcess?.processId && (
                          <p className="text-xs text-gray-400 mt-1">PID: {gameProcess.processId}</p>
                        )}
                      </div>
                    </div>

                    {/* Game Process Status */}
                    {gameProcess && (
                      <div className="bg-gray-800 rounded p-3 mb-4">
                        <h4 className="text-sm font-medium text-gray-300 mb-2">Process Status</h4>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-gray-400">Status:</span>
                            <span
                              className={`ml-2 font-medium ${
                                gameProcess.status === 'running'
                                  ? 'text-green-400'
                                  : gameProcess.status === 'terminated'
                                    ? 'text-red-400'
                                    : 'text-yellow-400'
                              }`}
                            >
                              {gameProcess.status}
                            </span>
                          </div>
                          {gameProcess.startTime && (
                            <div>
                              <span className="text-gray-400">Started:</span>
                              <span className="ml-2 text-white">
                                {new Date(gameProcess.startTime).toLocaleTimeString()}
                              </span>
                            </div>
                          )}
                          {gameProcess.exitCode !== undefined && (
                            <div>
                              <span className="text-gray-400">Exit Code:</span>
                              <span className="ml-2 text-white">{gameProcess.exitCode}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Enhanced Game Launcher Component */}
                    <div className="border-t border-gray-600 pt-4">
                      <GameLauncher
                        sessionId={session.id}
                        gameId={session.game.id}
                        gameName={session.game.name}
                        gameExecutable={session.game.executablePath}
                        vpnRequired={session.game.requiresVPN}
                        onLaunchStateChange={(isLaunching) => {
                          if (isLaunching) {
                            console.log(`Launching game for session ${session.id}`);
                          }
                        }}
                      />
                    </div>

                    {/* Session Players */}
                    <div className="border-t border-gray-600 pt-4 mt-4">
                      <h4 className="text-sm font-medium text-gray-300 mb-2">Session Players</h4>
                      <div className="flex flex-wrap gap-2">
                        {session.players.map((player) => (
                          <span
                            key={player.id}
                            className={`px-2 py-1 rounded text-xs ${
                              player.user.id === user.id
                                ? 'bg-blue-600 text-blue-100'
                                : 'bg-gray-600 text-gray-100'
                            }`}
                          >
                            {player.user.username}
                            {player.user.id === user.id && ' (You)'}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="mt-8 text-center text-gray-400 text-sm">
          <p>🎮 Game Launcher Integration - Launch and manage your games seamlessly</p>
          <p>💡 Make sure your games are properly configured before launching</p>
        </div>
      </div>
    </div>
  );
}
