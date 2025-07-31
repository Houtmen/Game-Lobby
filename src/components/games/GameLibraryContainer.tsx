'use client';

import { useEffect, useState } from 'react';
import EnhancedGameLibrary from '@/components/games/EnhancedGameLibrary';
import { Game } from '@/types';

export default function GameLibraryContainer() {
  const [games, setGames] = useState<Game[]>([]);
  const [availableGames, setAvailableGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);
  const [isScanning, setIsScanning] = useState(false);

  const fetchGames = async () => {
    try {
      const response = await fetch('/api/games');
      const data = await response.json();
      setGames(data.games || []);
    } catch (error) {
      console.error('Failed to fetch games:', error);
    }
  };

  const fetchAvailableGames = async () => {
    try {
      const response = await fetch('/api/games/available');
      const data = await response.json();
      setAvailableGames(data.games || []);
    } catch (error) {
      console.error('Failed to fetch available games:', error);
    }
  };

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        await Promise.all([fetchGames(), fetchAvailableGames()]);
      } catch (error) {
        console.error('Failed to load game data:', error);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const handleAddGame = async (gameData: Partial<Game>) => {
    try {
      const response = await fetch('/api/games', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(gameData),
      });

      if (response.ok) {
        await fetchGames(); // Refresh games list
      } else {
        const error = await response.json();
        console.error('Failed to add game:', error);
        throw new Error(error.message || 'Failed to add game');
      }
    } catch (error) {
      console.error('Failed to add game:', error);
      throw error;
    }
  };

  const handleDeleteGame = async (gameId: string) => {
    try {
      const response = await fetch(`/api/games/${gameId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchGames(); // Refresh games list
      } else {
        const error = await response.json();
        console.error('Failed to delete game:', error);
        throw new Error(error.message || 'Failed to delete game');
      }
    } catch (error) {
      console.error('Failed to delete game:', error);
      throw error;
    }
  };

  const handleScanGames = async () => {
    setIsScanning(true);
    try {
      const response = await fetch('/api/games/scan', {
        method: 'POST',
      });

      if (response.ok) {
        const result = await response.json();
        console.log('Scan completed:', result);
        await fetchGames(); // Refresh games list with newly found games
      } else {
        const error = await response.json();
        console.error('Failed to scan games:', error);
        throw new Error(error.message || 'Failed to scan for games');
      }
    } catch (error) {
      console.error('Failed to scan games:', error);
    } finally {
      setIsScanning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your game library...</p>
        </div>
      </div>
    );
  }

  return (
    <EnhancedGameLibrary
      games={games}
      availableGames={availableGames}
      onAddGame={handleAddGame}
      onDeleteGame={handleDeleteGame}
      onScanGames={handleScanGames}
      userCanManage={true}
      isScanning={isScanning}
    />
  );
}
