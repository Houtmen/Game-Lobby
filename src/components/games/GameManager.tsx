import React, { useState, useEffect } from 'react';
import { Monitor, Users, Play, Square, Clock, Activity, AlertTriangle } from 'lucide-react';

interface ActiveGame {
  processId: number;
  status: string;
  startTime: string;
  player: {
    userId: string;
    username: string;
    avatar?: string;
    isHost: boolean;
  };
}

interface ActiveSession {
  session: {
    id: string;
    name: string;
    status: string;
    createdAt: string;
    game: {
      id: string;
      name: string;
      vpnRequired: boolean;
    };
    host: {
      id: string;
      username: string;
      avatar?: string;
    };
    playerCount: number;
  };
  runningGames: ActiveGame[];
}

interface GameManagerData {
  totalActiveGames: number;
  totalActiveSessions: number;
  gamesBySession: Record<string, ActiveSession>;
  summary: {
    runningProcesses: number;
    uniquePlayers: number;
    activeSessions: number;
  };
}

export const GameManager: React.FC = () => {
  const [data, setData] = useState<GameManagerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchActiveGames = async () => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        setError('Authentication required');
        return;
      }

      const response = await fetch('/api/games/active', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch active games');
      }

      const result = await response.json();
      setData(result);
      setLastUpdate(new Date());
      setError(null);
    } catch (err) {
      console.error('Error fetching active games:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveGames();
    
    // Refresh every 10 seconds
    const interval = setInterval(fetchActiveGames, 10000);
    
    return () => clearInterval(interval);
  }, []);

  const formatDuration = (startTime: string) => {
    const start = new Date(startTime);
    const now = new Date();
    const diff = now.getTime() - start.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    }
    return `${minutes}m`;
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-center">
          <Activity className="w-5 h-5 animate-spin mr-2" />
          <span>Loading game manager...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-red-200 p-6">
        <div className="flex items-center text-red-600">
          <AlertTriangle className="w-5 h-5 mr-2" />
          <span>Error: {error}</span>
        </div>
        <button 
          onClick={fetchActiveGames}
          className="mt-3 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const sessions = Object.values(data.gamesBySession);

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Game Manager</h2>
            <p className="text-gray-600">Monitor active games across all sessions</p>
          </div>
          <button
            onClick={fetchActiveGames}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Activity className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="p-6 border-b border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-green-50 p-4 rounded-lg">
            <div className="flex items-center">
              <Play className="w-8 h-8 text-green-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-green-600">Running Games</p>
                <p className="text-2xl font-bold text-green-900">{data.summary.runningProcesses}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center">
              <Users className="w-8 h-8 text-blue-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-blue-600">Active Players</p>
                <p className="text-2xl font-bold text-blue-900">{data.summary.uniquePlayers}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center">
              <Monitor className="w-8 h-8 text-purple-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-purple-600">Active Sessions</p>
                <p className="text-2xl font-bold text-purple-900">{data.summary.activeSessions}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="flex items-center">
              <Clock className="w-8 h-8 text-gray-600 mr-3" />
              <div>
                <p className="text-sm font-medium text-gray-600">Last Update</p>
                <p className="text-sm font-bold text-gray-900">{lastUpdate.toLocaleTimeString()}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Active Sessions */}
      <div className="p-6">
        {sessions.length === 0 ? (
          <div className="text-center py-8">
            <Monitor className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No active games running</p>
            <p className="text-sm text-gray-500">Games will appear here when players launch them</p>
          </div>
        ) : (
          <div className="space-y-6">
            {sessions.map((sessionData) => (
              <div key={sessionData.session.id} className="border border-gray-200 rounded-lg p-4">
                {/* Session Header */}
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      {sessionData.session.name}
                    </h3>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Monitor className="w-4 h-4" />
                        {sessionData.session.game.name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {sessionData.session.playerCount} players
                      </span>
                      <span>Host: {sessionData.session.host.username}</span>
                      {sessionData.session.game.vpnRequired && (
                        <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs">
                          VPN Required
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600">
                      Created: {new Date(sessionData.session.createdAt).toLocaleString()}
                    </div>
                    <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                      sessionData.session.status === 'ACTIVE' 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {sessionData.session.status}
                    </div>
                  </div>
                </div>

                {/* Running Games */}
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">
                    Running Games ({sessionData.runningGames.length})
                  </h4>
                  {sessionData.runningGames.map((game) => (
                    <div key={game.processId} className="bg-gray-50 rounded p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                          {game.player.avatar ? (
                            <img 
                              src={game.player.avatar} 
                              alt={game.player.username} 
                              className="w-8 h-8 rounded-full" 
                            />
                          ) : (
                            <span className="text-sm font-bold text-white">
                              {game.player.username[0].toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{game.player.username}</span>
                            {game.player.isHost && (
                              <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">
                                Host
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600">
                            PID: {game.processId} • Running for {formatDuration(game.startTime)}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                          game.status === 'running' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {game.status}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default GameManager;
