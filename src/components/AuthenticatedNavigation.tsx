'use client';

import { useSession, signOut } from 'next-auth/react';
import Navigation from '@/components/Navigation';

export default function AuthenticatedNavigation() {
  const { data: session, status } = useSession();

  const handleLogout = async () => {
    await signOut({ callbackUrl: '/login' });
  };

  if (status === 'loading') {
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

  // Convert NextAuth session to our User type
  const user = session?.user
    ? {
        id: session.user.id,
        username: session.user.username,
        email: session.user.email!,
        avatar: session.user.avatar,
        isOnline: true,
        lastSeen: new Date(),
        createdAt: new Date(),
        provider: session.user.provider,
        friends: [],
        blockedUsers: [],
      }
    : null;

  return <Navigation user={user || undefined} onLogout={handleLogout} />;
}
