'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button, buttonClasses } from '@/components/ui';

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
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [manualPath, setManualPath] = useState('');
  const [manualName, setManualName] = useState('');
  const [customPaths, setCustomPaths] = useState<string[]>([]);
  const [newCustomPath, setNewCustomPath] = useState('');

  // Helper function to get auth headers
  const getAuthHeaders = () => {
    const token = localStorage.getItem('accessToken');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
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

  const scanForGames = async (useCustomPaths = false) => {
    try {
      setScanning(true);
      setError(null);

      const requestBody = useCustomPaths ? { customPaths } : {};

      const response = await fetch('/api/games/scan', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify(requestBody),
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

  const addManualGame = async () => {
    if (!manualPath.trim()) {
      setError('Please enter a valid executable path');
      return;
    }

    try {
      setScanning(true);
      setError(null);

      const response = await fetch('/api/games/scan', {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          manualPath: manualPath.trim(),
          gameName: manualName.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add game');
      }

      const result = await response.json();

      // Show success message
      setError(`✅ Game added successfully!`);

      // Reset form and close modal
      setManualPath('');
      setManualName('');
      setShowManualAdd(false);

      // Reload games
      await loadGames();
    } catch (err) {
      console.error('Error adding manual game:', err);
      setError(err instanceof Error ? err.message : 'Failed to add game');
    } finally {
      setScanning(false);
    }
  };

  const addCustomPath = () => {
    if (newCustomPath.trim() && !customPaths.includes(newCustomPath.trim())) {
      setCustomPaths([...customPaths, newCustomPath.trim()]);
      setNewCustomPath('');
    }
  };

  const removeCustomPath = (index: number) => {
    setCustomPaths(customPaths.filter((_, i) => i !== index));
  };

  const toggleGameActive = async (gameId: string, isActive: boolean) => {
    try {
      const response = await fetch(`/api/games/${gameId}`, {
        method: 'PATCH',
        headers: getAuthHeaders(),
        body: JSON.stringify({ isActive: !isActive }),
      });

      if (!response.ok) {
        throw new Error('Failed to update game');
      }

      // Update local state
      setGames((prevGames) =>
        prevGames.map((game) => (game.id === gameId ? { ...game, isActive: !isActive } : game))
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
          <h1 className="text-4xl font-bold mb-4 text-blue-400">Game Library</h1>
          <p className="text-gray-300">Manage your games and scan for new installations</p>
        </div>

        {/* Error Display */}
        {error && (
          <div
            className={`border px-4 py-3 rounded mb-6 ${
              error.startsWith('✅')
                ? 'bg-green-800 border-green-600 text-green-200'
                : 'bg-red-800 border-red-600 text-red-200'
            }`}
          >
            <p>{error}</p>
            <button
              onClick={() => setError(null)}
              className={`mt-2 text-sm inline-flex px-3 py-1 text-white font-semibold rounded-lg border-2 ${
                error.startsWith('✅')
                  ? 'bg-green-600 hover:bg-green-700 border-green-400'
                  : 'bg-rose-600 hover:bg-rose-700 border-rose-400'
              }`}
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="bg-gray-800 rounded-lg p-6 mb-8 border border-gray-600">
          <h2 className="text-2xl font-semibold mb-4 text-white">Game Management</h2>
          <div className="flex flex-wrap gap-4 mb-4">
            <Button onClick={() => scanForGames(false)} disabled={scanning || loading} variant="purple">
              {scanning ? 'Scanning System...' : 'Scan Common Locations'}
            </Button>
            <Button onClick={() => scanForGames(true)} disabled={scanning || loading || customPaths.length === 0} variant="indigo">
              {scanning ? 'Scanning...' : 'Scan Custom Paths'}
            </Button>
            <Button onClick={() => setShowManualAdd(true)} disabled={scanning} variant="blue">
              Add Game Manually
            </Button>
            <Button onClick={loadGames} disabled={loading} variant="green">
              {loading ? 'Loading...' : 'Refresh List'}
            </Button>
          </div>

          {/* Custom Paths Section */}
          <div className="border-t border-gray-600 pt-4">
            <h3 className="text-lg font-semibold mb-3 text-white">Custom Scan Paths</h3>
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                placeholder="Enter custom path (e.g., D:\MyGames)"
                value={newCustomPath}
                onChange={(e) => setNewCustomPath(e.target.value)}
                className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400"
                onKeyPress={(e) => e.key === 'Enter' && addCustomPath()}
              />
              <Button onClick={addCustomPath} variant="gray" padding="sm">Add Path</Button>
            </div>
            {customPaths.length > 0 && (
              <div className="space-y-2">
                {customPaths.map((path, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between bg-gray-700 px-3 py-2 rounded"
                  >
                    <span className="text-sm text-gray-300">{path}</span>
                    <button onClick={() => removeCustomPath(index)} className="text-rose-300 hover:text-rose-200 text-sm">Remove</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Manual Game Addition Modal */}
        {showManualAdd && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-600 w-full max-w-lg">
              <h3 className="text-xl font-semibold mb-4 text-white">Add Game Manually</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Executable Path (required)
                  </label>
                  <input
                    type="text"
                    placeholder="C:\Games\MyGame\game.exe"
                    value={manualPath}
                    onChange={(e) => setManualPath(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Game Name (optional)
                  </label>
                  <input
                    type="text"
                    placeholder="Custom Game Name"
                    value={manualName}
                    onChange={(e) => setManualName(e.target.value)}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white placeholder-gray-400"
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button onClick={() => { setShowManualAdd(false); setManualPath(''); setManualName(''); }} variant="gray" padding="sm">Cancel</Button>
                  <Button onClick={addManualGame} disabled={!manualPath.trim() || scanning} variant="blue" padding="sm">{scanning ? 'Adding...' : 'Add Game'}</Button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Games List */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-600">
          <h2 className="text-2xl font-semibold mb-4 text-white">
            Detected Games ({games.length})
          </h2>

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
                      <td className="py-3 px-4">
                        <div className="text-sm text-gray-300 font-mono break-all">
                          {game.executablePath || 'N/A'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-sm text-gray-300">
                          {game.maxPlayers ? `2-${game.maxPlayers}` : 'N/A'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            game.requiresVPN
                              ? 'bg-orange-800 text-orange-200'
                              : 'bg-green-800 text-green-200'
                          }`}
                        >
                          {game.requiresVPN ? 'Required' : 'Not Required'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            game.isActive
                              ? 'bg-green-800 text-green-200'
                              : 'bg-gray-600 text-gray-300'
                          }`}
                        >
                          {game.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <Button onClick={() => toggleGameActive(game.id, game.isActive)} variant={game.isActive ? 'rose' : 'green'} padding="sm">
                          {game.isActive ? 'Disable' : 'Enable'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
