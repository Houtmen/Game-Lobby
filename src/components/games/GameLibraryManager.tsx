'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface Game {
  id: string;
  name: string;
  description?: string;
  maxPlayers?: number;
  requiresVPN: boolean;
  executablePath?: string;
  launchParameters?: string;
  networkPorts?: string;
  isActive: boolean;
  version?: string;
}

export default function GameLibraryManager() {
  const { user, isLoading } = useAuth();
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);

  // Helper function to get auth headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem('accessToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }),
    };
  };

  useEffect(() => {
    if (user) {
      loadGames();
    }
  }, [user]);

  const loadGames = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/games');
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data = await response.json();
      const gamesData = data.data || data;
      setGames(Array.isArray(gamesData) ? gamesData : []);
      setError(null);
    } catch (err) {
      console.error('Error loading games:', err);
      setError('Failed to load games');
    } finally {
      setLoading(false);
    }
  };

  const scanForGames = async () => {
    try {
      setScanning(true);
      setError(null);
      
      const response = await fetch('/api/games/scan', {
        method: 'POST',
        headers: getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to scan for games');
      }

      const result = await response.json();
      console.log('🔍 Game scan result:', result);
      
      // Show success message
      setError(`✅ Scan complete! Found ${result.scanned} games, added ${result.added} new games.`);
      
      // Reload games to show newly detected ones
      await loadGames();
    } catch (err) {
      console.error('Error scanning games:', err);
      setError(err instanceof Error ? err.message : 'Failed to scan for games');
    } finally {
      setScanning(false);
    }
  };

  const toggleGameActive = async (gameId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/games/${gameId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ isActive: !isActive })
      });

      if (!response.ok) {
        throw new Error('Failed to update game');
      }

      // Update local state
      setGames(prevGames => 
        prevGames.map(game => 
          game.id === gameId ? { ...game, isActive: !isActive } : game
        )
      );
    } catch (err) {
      setError('Failed to update game status');
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
          <p className="text-gray-300 mb-6">Please log in to manage your games.</p>
          <a 
            href="/login" 
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
          >
            Go to Login
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4 text-blue-400">Game Library</h1>
          <p className="text-gray-300">Manage your games and scan for new installations</p>
        </div>

        {/* Error Display */}
        {error && (
          <div className={`border px-4 py-3 rounded mb-6 ${
            error.includes('✅') 
              ? 'bg-green-800 border-green-600 text-green-200' 
              : 'bg-red-800 border-red-600 text-red-200'
          }`}>
            <p>{error}</p>
            <button 
              onClick={() => setError(null)}
              className="mt-2 px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Actions */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8 border border-gray-600">
          <h2 className="text-2xl font-semibold mb-4 text-white">Game Management</h2>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={scanForGames}
              disabled={scanning || loading}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-purple-800 text-white font-semibold py-3 px-6 rounded-lg border border-purple-400"
            >
              {scanning ? 'Scanning System...' : 'Scan for Games'}
            </button>
            <button
              onClick={loadGames}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 disabled:bg-green-800 text-white font-semibold py-3 px-6 rounded-lg border border-green-400"
            >
              {loading ? 'Loading...' : 'Refresh List'}
            </button>
          </div>
        </div>

        {/* Games List */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-600">
          <h2 className="text-2xl font-semibold mb-4 text-white">Detected Games ({games.length})</h2>
          
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
              <p className="text-gray-400">Loading games...</p>
            </div>
          ) : games.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400 text-lg mb-4">No games found</p>
              <p className="text-gray-500">Try scanning your system for installed games</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-600">
                    <th className="text-left py-3 px-4 text-white">Game</th>
                    <th className="text-left py-3 px-4 text-white">Executable</th>
                    <th className="text-left py-3 px-4 text-white">Players</th>
                    <th className="text-left py-3 px-4 text-white">VPN</th>
                    <th className="text-left py-3 px-4 text-white">Status</th>
                    <th className="text-left py-3 px-4 text-white">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {games.map((game) => (
                    <tr key={game.id} className="border-b border-gray-700 hover:bg-gray-700">
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-semibold text-white">{game.name}</div>
                          {game.description && (
                            <div className="text-sm text-gray-400">{game.description}</div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-300">
                        <code className="bg-gray-700 px-2 py-1 rounded text-xs">
                          {game.executablePath || 'Not set'}
                        </code>
                      </td>
                      <td className="py-3 px-4 text-gray-300">
                        {game.maxPlayers ? `2-${game.maxPlayers}` : 'Unknown'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs ${
                          game.requiresVPN 
                            ? 'bg-yellow-600 text-yellow-100' 
                            : 'bg-green-600 text-green-100'
                        }`}>
                          {game.requiresVPN ? 'Required' : 'Optional'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded text-xs ${
                          game.isActive 
                            ? 'bg-green-600 text-green-100' 
                            : 'bg-gray-600 text-gray-100'
                        }`}>
                          {game.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => toggleGameActive(game.id, game.isActive)}
                          className={`px-3 py-1 rounded text-xs font-medium border ${
                            game.isActive
                              ? 'bg-red-600 hover:bg-red-700 text-white border-red-400'
                              : 'bg-green-600 hover:bg-green-700 text-white border-green-400'
                          }`}
                        >
                          {game.isActive ? 'Disable' : 'Enable'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Status Info */}
        <div className="mt-8 text-center text-gray-400 text-sm">
          <p>🎮 The system scans common game installation folders</p>
          <p>📁 Supported: Steam, GOG, and custom installations</p>
          <p>🔍 Detected games can be enabled/disabled for lobby sessions</p>
        </div>
      </div>
    </div>
  );
}
