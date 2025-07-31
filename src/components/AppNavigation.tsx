'use client';

import { useAuth } from '@/contexts/AuthContext';
import Navigation from '@/components/Navigation';

export default function AppNavigation() {
  const { user, isLoading, logout } = useAuth();

  if (isLoading) {
    return (
      <nav className="bg-gray-900 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">GL</span>
              </div>
              <span className="font-bold text-xl">Game Lobby</span>
            </div>
            <div className="animate-pulse">
              <div className="h-8 w-20 bg-gray-700 rounded"></div>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  return <Navigation user={user || undefined} onLogout={logout} />;
}
