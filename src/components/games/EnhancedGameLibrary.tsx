'use client';

import { useState, useMemo } from 'react';
import { Game } from '@/types';
import {
  FaPlus,
  FaSearch,
  FaFilter,
  FaGamepad,
  FaUsers,
  FaDownload,
  FaCog,
  FaTrash,
  FaPlay,
} from 'react-icons/fa';

interface EnhancedGameLibraryProps {
  games: Game[];
  availableGames: Game[];
  onAddGame: (gameData: Partial<Game>) => Promise<void>;
  onDeleteGame: (gameId: string) => Promise<void>;
  onScanGames: () => Promise<void>;
  userCanManage: boolean;
  isScanning?: boolean;
}

export default function EnhancedGameLibrary({
  games = [],
  availableGames = [],
  onAddGame,
  onDeleteGame,
  onScanGames,
  userCanManage,
  isScanning = false,
}: EnhancedGameLibraryProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showAddGameModal, setShowAddGameModal] = useState(false);
  const [showAvailableGames, setShowAvailableGames] = useState(false);

  // Filter games based on search and filters
  const filteredGames = useMemo(() => {
    return games.filter((game) => {
      const matchesSearch =
        game.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        game.description?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory =
        selectedCategory === 'all' ||
        game.category?.toLowerCase() === selectedCategory.toLowerCase();

      const matchesPlatform =
        selectedPlatform === 'all' ||
        game.supportedPlatforms?.some((p) => p.toLowerCase() === selectedPlatform.toLowerCase());

      return matchesSearch && matchesCategory && matchesPlatform;
    });
  }, [games, searchTerm, selectedCategory, selectedPlatform]);

  const categories = [...new Set(games.map((g) => g.category).filter(Boolean))];
  const platforms = [...new Set(games.flatMap((g) => g.supportedPlatforms || []))];

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-bold text-gray-900">Your Game Library</h2>
          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
            {filteredGames.length} game{filteredGames.length !== 1 ? 's' : ''}
          </span>
        </div>

        {userCanManage && (
          <div className="flex items-center gap-3">
            <button
              onClick={onScanGames}
              disabled={isScanning}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              <FaSearch className={`w-4 h-4 ${isScanning ? 'animate-spin' : ''}`} />
              {isScanning ? 'Scanning...' : 'Scan for Games'}
            </button>

            <button
              onClick={() => setShowAvailableGames(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <FaDownload className="w-4 h-4" />
              Browse Games
            </button>

            <button
              onClick={() => setShowAddGameModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <FaPlus className="w-4 h-4" />
              Add Game
            </button>
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col lg:flex-row gap-4 p-4 bg-white rounded-lg shadow-sm border">
        <div className="flex-1 relative">
          <FaSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Search games..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        <div className="flex gap-3">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Categories</option>
            {categories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>

          <select
            value={selectedPlatform}
            onChange={(e) => setSelectedPlatform(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Platforms</option>
            {platforms.map((platform) => (
              <option key={platform} value={platform}>
                {platform}
              </option>
            ))}
          </select>

          <div className="flex rounded-lg border border-gray-300 overflow-hidden">
            <button
              onClick={() => setViewMode('grid')}
              className={`px-3 py-2 ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              Grid
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`px-3 py-2 ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
            >
              List
            </button>
          </div>
        </div>
      </div>

      {/* Games Grid/List */}
      {filteredGames.length === 0 ? (
        <div className="text-center py-12">
          <FaGamepad className="mx-auto w-12 h-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No games found</h3>
          <p className="text-gray-500 mb-6">
            {games.length === 0
              ? 'Add your first game to get started with multiplayer gaming!'
              : 'Try adjusting your search terms or filters.'}
          </p>
          {userCanManage && games.length === 0 && (
            <div className="flex justify-center gap-3">
              <button
                onClick={onScanGames}
                className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                <FaSearch className="w-4 h-4" />
                Scan for Games
              </button>
              <button
                onClick={() => setShowAvailableGames(true)}
                className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FaDownload className="w-4 h-4" />
                Browse Games
              </button>
            </div>
          )}
        </div>
      ) : (
        <div
          className={
            viewMode === 'grid'
              ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
              : 'space-y-4'
          }
        >
          {filteredGames.map((game) => (
            <GameCard
              key={game.id}
              game={game}
              viewMode={viewMode}
              onDelete={userCanManage ? () => onDeleteGame(game.id) : undefined}
              onConfigure={userCanManage ? () => console.log('Configure', game.id) : undefined}
            />
          ))}
        </div>
      )}

      {/* Add Game Modal */}
      {showAddGameModal && (
        <AddGameModal onClose={() => setShowAddGameModal(false)} onSubmit={onAddGame} />
      )}

      {/* Available Games Modal */}
      {showAvailableGames && (
        <AvailableGamesModal
          games={availableGames}
          onClose={() => setShowAvailableGames(false)}
          onAddGame={onAddGame}
        />
      )}
    </div>
  );
}

interface GameCardProps {
  game: Game;
  viewMode: 'grid' | 'list';
  onDelete?: () => void;
  onConfigure?: () => void;
}

function GameCard({ game, viewMode, onDelete, onConfigure }: GameCardProps) {
  if (viewMode === 'list') {
    return (
      <div className="flex items-center gap-4 p-4 bg-white rounded-lg shadow-sm border hover:shadow-md transition-shadow">
        <img
          src={game.iconUrl || '/default-game-icon.png'}
          alt={game.name}
          className="w-12 h-12 rounded object-cover"
        />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{game.name}</h3>
          <p className="text-sm text-gray-500 truncate">{game.description}</p>
          <div className="flex items-center gap-4 mt-1">
            <span className="text-xs text-gray-500 flex items-center gap-1">
              <FaUsers className="w-3 h-3" />
              {game.minPlayers}-{game.maxPlayers} players
            </span>
            {game.category && (
              <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                {game.category}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors">
            <FaPlay className="w-4 h-4" />
          </button>
          {onConfigure && (
            <button
              onClick={onConfigure}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <FaCog className="w-4 h-4" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <FaTrash className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden hover:shadow-lg transition-all duration-200 group">
      <div className="aspect-video bg-gradient-to-br from-blue-50 to-indigo-100 relative overflow-hidden">
        {game.bannerUrl ? (
          <img
            src={game.bannerUrl}
            alt={game.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <FaGamepad className="w-12 h-12 text-gray-400" />
          </div>
        )}
        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
          <button className="opacity-0 group-hover:opacity-100 bg-white text-green-600 p-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-200">
            <FaPlay className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h3 className="font-semibold text-gray-900 truncate pr-2">{game.name}</h3>
          {game.category && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full whitespace-nowrap">
              {game.category}
            </span>
          )}
        </div>

        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{game.description}</p>

        <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
          <span className="flex items-center gap-1">
            <FaUsers className="w-3 h-3" />
            {game.minPlayers}-{game.maxPlayers} players
          </span>
          {game.requiresVPN && (
            <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded">VPN</span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm">
            <FaPlay className="w-3 h-3" />
            Play
          </button>
          {onConfigure && (
            <button
              onClick={onConfigure}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            >
              <FaCog className="w-4 h-4" />
            </button>
          )}
          {onDelete && (
            <button
              onClick={onDelete}
              className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <FaTrash className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Placeholder modals - will implement next
function AddGameModal({
  onClose,
  onSubmit,
}: {
  onClose: () => void;
  onSubmit: (data: Partial<Game>) => Promise<void>;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-lg font-semibold mb-4">Add Game Manually</h3>
        <p className="text-gray-600 mb-4">Manual game addition form coming next...</p>
        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}

function AvailableGamesModal({
  games,
  onClose,
  onAddGame,
}: {
  games: Game[];
  onClose: () => void;
  onAddGame: (data: Partial<Game>) => Promise<void>;
}) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-4">Browse Available Games</h3>
        <p className="text-gray-600 mb-4">Game catalog browser coming next...</p>
        <button
          onClick={onClose}
          className="w-full px-4 py-2 bg-gray-300 text-gray-700 rounded-lg hover:bg-gray-400 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}
