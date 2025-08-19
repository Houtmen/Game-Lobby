'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function AccountPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <div className="flex items-center space-x-4">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.username}
                  className="w-16 h-16 rounded-full object-cover"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white text-2xl font-bold">
                  {user.username.charAt(0).toUpperCase()}
                </div>
              )}
              <div>
                <h1 className="text-2xl font-bold">{user.username}</h1>
                <p className="text-gray-400">{user.email}</p>
                <div className="flex items-center space-x-2 mt-1">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-sm text-green-400">Online</span>
                </div>
              </div>
            </div>
          </div>

          {/* Account Information */}
          <div className="bg-gray-800 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-semibold mb-4">Account Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Username</label>
                <div className="bg-gray-700 rounded-md px-3 py-2">{user.username}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">
                  Email Address
                </label>
                <div className="bg-gray-700 rounded-md px-3 py-2">{user.email}</div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-1">Member Since</label>
                <div className="bg-gray-700 rounded-md px-3 py-2">
                  {user.createdAt
                    ? new Date(user.createdAt).toLocaleDateString()
                    : 'Recently joined'}
                </div>
              </div>
              {user.provider && (
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-1">
                    Authentication Provider
                  </label>
                  <div className="bg-gray-700 rounded-md px-3 py-2 capitalize">{user.provider}</div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-gray-800 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button className="bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors">
                Edit Profile
              </button>
              <button className="bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded-md transition-colors">
                Change Password
              </button>
              <button className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-md transition-colors">
                Privacy Settings
              </button>
              <button className="bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded-md transition-colors">
                Game Library
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
