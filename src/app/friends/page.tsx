'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import Image from 'next/image';
import { Friend, FriendRequest } from '@/types';
import SimpleProtectedRoute from '@/components/auth/SimpleProtectedRoute';

interface UserSearchResult {
  id: string;
  username: string;
  avatar?: string;
  isOnline: boolean;
  lastSeen: Date;
  friendshipStatus: 'none' | 'friends' | 'request_sent' | 'request_received' | 'blocked';
  friendshipId?: string;
}

interface FriendsData {
  friends: Friend[];
  sentRequests: FriendRequest[];
  receivedRequests: FriendRequest[];
}

export default function FriendsPage() {
  const { user } = useAuth();
  const [friendsData, setFriendsData] = useState<FriendsData>({
    friends: [],
    sentRequests: [],
    receivedRequests: [],
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [activeTab, setActiveTab] = useState<'friends' | 'received' | 'sent' | 'search'>('friends');
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);

  // Get token from localStorage
  const getToken = () => localStorage.getItem('accessToken');

  // Fetch friends data
  const fetchFriendsData = async () => {
    const token = getToken();
    if (!token) return;

    try {
      const response = await fetch('/api/friends', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setFriendsData(data);
      }
    } catch (error) {
      console.error('Error fetching friends data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Search for users
  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    const token = getToken();
    if (!token) return;

    setSearchLoading(true);

    try {
      const response = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSearchResults(data.users || []);
      }
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setSearchLoading(false);
    }
  };

  // Send friend request
  const sendFriendRequest = async (username: string) => {
    const token = getToken();
    if (!token) return;

    try {
      const response = await fetch('/api/friends', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username }),
      });

      if (response.ok) {
        await fetchFriendsData();
        await searchUsers(searchQuery);
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to send friend request');
      }
    } catch (error) {
      console.error('Error sending friend request:', error);
    }
  };

  // Accept friend request
  const acceptFriendRequest = async (friendshipId: string) => {
    const token = getToken();
    if (!token) return;

    try {
      const response = await fetch(`/api/friends/${friendshipId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'accept' }),
      });

      if (response.ok) {
        await fetchFriendsData();
      }
    } catch (error) {
      console.error('Error accepting friend request:', error);
    }
  };

  // Decline friend request
  const declineFriendRequest = async (friendshipId: string) => {
    const token = getToken();
    if (!token) return;

    try {
      const response = await fetch(`/api/friends/${friendshipId}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'decline' }),
      });

      if (response.ok) {
        await fetchFriendsData();
      }
    } catch (error) {
      console.error('Error declining friend request:', error);
    }
  };

  // Remove friend
  const removeFriend = async (friendshipId: string) => {
    const token = getToken();
    if (!token) return;

    if (!confirm('Are you sure you want to remove this friend?')) {
      return;
    }

    try {
      const response = await fetch(`/api/friends/${friendshipId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        await fetchFriendsData();
      }
    } catch (error) {
      console.error('Error removing friend:', error);
    }
  };

  useEffect(() => {
    fetchFriendsData();
  }, [user]);

  useEffect(() => {
    const debounce = setTimeout(() => {
      if (activeTab === 'search') {
        searchUsers(searchQuery);
      }
    }, 300);

    return () => clearTimeout(debounce);
  }, [searchQuery, activeTab, user]);

  return (
    <SimpleProtectedRoute>
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4 text-blue-400">Friends</h1>
            <p className="text-gray-300">Connect with other players</p>
          </div>

          <div className="bg-gray-800 rounded-lg p-6 mb-8 border border-gray-600">
            <h2 className="text-2xl font-semibold mb-4 text-white">Friend Management</h2>
            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => setActiveTab('friends')}
                className={
                  activeTab === 'friends'
                    ? 'bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 px-6 rounded-lg transition-colors'
                    : 'bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors'
                }
              >
                Friends ({friendsData.friends.length})
              </button>
              <button
                onClick={() => setActiveTab('received')}
                className={
                  activeTab === 'received'
                    ? 'bg-green-700 hover:bg-green-800 text-white font-semibold py-3 px-6 rounded-lg transition-colors relative'
                    : 'bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors relative'
                }
              >
                Received ({friendsData.receivedRequests.length})
                {friendsData.receivedRequests.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                    {friendsData.receivedRequests.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('sent')}
                className={
                  activeTab === 'sent'
                    ? 'bg-yellow-600 hover:bg-yellow-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors'
                    : 'bg-yellow-500 hover:bg-yellow-600 text-white font-semibold py-3 px-6 rounded-lg transition-colors'
                }
              >
                Sent ({friendsData.sentRequests.length})
              </button>
              <button
                onClick={() => setActiveTab('search')}
                className={
                  activeTab === 'search'
                    ? 'bg-purple-700 hover:bg-purple-800 text-white font-semibold py-3 px-6 rounded-lg transition-colors'
                    : 'bg-purple-600 hover:bg-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors'
                }
              >
                Find Players
              </button>
            </div>
          </div>

          {activeTab === 'search' && (
            <div className="bg-gray-800 rounded-lg p-6 mb-8 border border-gray-600">
              <h2 className="text-2xl font-semibold mb-4 text-white">Find Players</h2>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search for players by username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full px-4 py-3 pl-12 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <svg
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                  />
                </svg>
              </div>
            </div>
          )}

          <div className="bg-gray-800 rounded-lg p-6 border border-gray-600">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
                <p className="text-gray-400">Loading friends...</p>
              </div>
            ) : (
              <>
                {activeTab === 'friends' && (
                  <div>
                    {friendsData.friends.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-400 text-lg mb-4">You don't have any friends yet</p>
                        <p className="text-gray-500 mb-4">
                          Find other players and send them friend requests!
                        </p>
                        <button
                          onClick={() => setActiveTab('search')}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                        >
                          Find Players
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {friendsData.friends.map((friend) => (
                          <div
                            key={friend.id}
                            className="flex items-center justify-between p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors border border-gray-500"
                          >
                            <div className="flex items-center space-x-4">
                              <div className="relative">
                                {friend.avatar ? (
                                  <Image
                                    src={friend.avatar}
                                    alt={friend.username}
                                    width={48}
                                    height={48}
                                    className="w-12 h-12 rounded-full"
                                  />
                                ) : (
                                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                                    {friend.username.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <div
                                  className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-gray-700 ${
                                    friend.isOnline ? 'bg-green-500' : 'bg-gray-500'
                                  }`}
                                />
                              </div>
                              <div>
                                <h3 className="font-semibold">{friend.username}</h3>
                                <p className="text-sm text-gray-400">
                                  {friend.isOnline
                                    ? 'Online'
                                    : `Last seen ${new Date(friend.lastSeen).toLocaleDateString()}`}
                                </p>
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => alert('Game invite feature coming soon!')}
                                className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors"
                              >
                                Invite to Game
                              </button>
                              <button
                                onClick={() => removeFriend(friend.friendshipId)}
                                className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'received' && (
                  <div>
                    {friendsData.receivedRequests.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-400 text-lg">No friend requests received</p>
                        <p className="text-gray-500 mt-2">
                          Friend requests will appear here when other players send them to you
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {friendsData.receivedRequests.map((request) => (
                          <div
                            key={request.id}
                            className="flex items-center justify-between p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors border border-gray-500"
                          >
                            <div className="flex items-center space-x-4">
                              <div className="relative">
                                {request.sender.avatar ? (
                                  <Image
                                    src={request.sender.avatar}
                                    alt={request.sender.username}
                                    width={48}
                                    height={48}
                                    className="w-12 h-12 rounded-full"
                                  />
                                ) : (
                                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                                    {request.sender.username.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <div
                                  className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-gray-700 ${
                                    request.sender.isOnline ? 'bg-green-500' : 'bg-gray-500'
                                  }`}
                                />
                              </div>
                              <div>
                                <h3 className="font-semibold">{request.sender.username}</h3>
                                <p className="text-sm text-gray-400">
                                  Sent {new Date(request.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex space-x-2">
                              <button
                                onClick={() => acceptFriendRequest(request.id)}
                                className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors"
                              >
                                Accept
                              </button>
                              <button
                                onClick={() => declineFriendRequest(request.id)}
                                className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors"
                              >
                                Decline
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'sent' && (
                  <div>
                    {friendsData.sentRequests.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-400 text-lg">No friend requests sent</p>
                        <p className="text-gray-500 mt-2">
                          Friend requests you send will appear here
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {friendsData.sentRequests.map((request) => (
                          <div
                            key={request.id}
                            className="flex items-center justify-between p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors border border-gray-500"
                          >
                            <div className="flex items-center space-x-4">
                              <div className="relative">
                                {request.receiver.avatar ? (
                                  <Image
                                    src={request.receiver.avatar}
                                    alt={request.receiver.username}
                                    width={48}
                                    height={48}
                                    className="w-12 h-12 rounded-full"
                                  />
                                ) : (
                                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                                    {request.receiver.username.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <div
                                  className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-gray-700 ${
                                    request.receiver.isOnline ? 'bg-green-500' : 'bg-gray-500'
                                  }`}
                                />
                              </div>
                              <div>
                                <h3 className="font-semibold">{request.receiver.username}</h3>
                                <p className="text-sm text-gray-400">
                                  Sent {new Date(request.createdAt).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div>
                              <span className="bg-yellow-600 text-white px-3 py-1 rounded-full text-sm">
                                Pending
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'search' && (
                  <div>
                    {searchLoading ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto mb-4"></div>
                        <p className="text-gray-400">Searching...</p>
                      </div>
                    ) : searchQuery.length < 2 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-400 text-lg">
                          Enter at least 2 characters to search for players
                        </p>
                        <p className="text-gray-500 mt-2">
                          Use the search box above to find other players
                        </p>
                      </div>
                    ) : searchResults.length === 0 ? (
                      <div className="text-center py-8">
                        <p className="text-gray-400 text-lg">
                          No players found with username "{searchQuery}"
                        </p>
                        <p className="text-gray-500 mt-2">Try a different search term</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {searchResults.map((user) => (
                          <div
                            key={user.id}
                            className="flex items-center justify-between p-4 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors border border-gray-500"
                          >
                            <div className="flex items-center space-x-4">
                              <div className="relative">
                                {user.avatar ? (
                                  <Image
                                    src={user.avatar}
                                    alt={user.username}
                                    width={48}
                                    height={48}
                                    className="w-12 h-12 rounded-full"
                                  />
                                ) : (
                                  <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                                    {user.username.charAt(0).toUpperCase()}
                                  </div>
                                )}
                                <div
                                  className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-gray-700 ${
                                    user.isOnline ? 'bg-green-500' : 'bg-gray-500'
                                  }`}
                                />
                              </div>
                              <div>
                                <h3 className="font-semibold">{user.username}</h3>
                                <p className="text-sm text-gray-400">
                                  {user.isOnline
                                    ? 'Online'
                                    : `Last seen ${new Date(user.lastSeen).toLocaleDateString()}`}
                                </p>
                              </div>
                            </div>
                            <div>
                              {user.friendshipStatus === 'none' && (
                                <button
                                  onClick={() => sendFriendRequest(user.username)}
                                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg text-sm transition-colors"
                                >
                                  Add Friend
                                </button>
                              )}
                              {user.friendshipStatus === 'friends' && (
                                <span className="bg-green-600 text-white px-3 py-1 rounded-full text-sm">
                                  Friends
                                </span>
                              )}
                              {user.friendshipStatus === 'request_sent' && (
                                <span className="bg-yellow-600 text-white px-3 py-1 rounded-full text-sm">
                                  Request Sent
                                </span>
                              )}
                              {user.friendshipStatus === 'request_received' && (
                                <div className="flex space-x-2">
                                  <button
                                    onClick={() =>
                                      user.friendshipId && acceptFriendRequest(user.friendshipId)
                                    }
                                    className="bg-green-600 hover:bg-green-700 text-white font-semibold py-1 px-3 rounded-md text-sm transition-colors"
                                  >
                                    Accept
                                  </button>
                                  <button
                                    onClick={() =>
                                      user.friendshipId && declineFriendRequest(user.friendshipId)
                                    }
                                    className="bg-red-600 hover:bg-red-700 text-white font-semibold py-1 px-3 rounded-md text-sm transition-colors"
                                  >
                                    Decline
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </SimpleProtectedRoute>
  );
}
