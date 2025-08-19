'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Friend } from '@/types';

interface FriendSelectorProps {
  sessionId: string;
  onInviteSent: () => void;
  onClose: () => void;
}

export default function FriendSelector({ sessionId, onInviteSent, onClose }: FriendSelectorProps) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Get token from localStorage
  const getToken = () => localStorage.getItem('accessToken');

  useEffect(() => {
    fetchFriends();
  }, []);

  const fetchFriends = async () => {
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
        // Only get online friends for better gaming experience
        const onlineFriends = data.friends.filter((friend: Friend) => friend.isOnline);
        setFriends(onlineFriends);
      }
    } catch (error) {
      console.error('Error fetching friends:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleFriendSelection = (friendId: string) => {
    setSelectedFriends((prev) =>
      prev.includes(friendId) ? prev.filter((id) => id !== friendId) : [...prev, friendId]
    );
  };

  const sendInvites = async () => {
    if (selectedFriends.length === 0) return;

    const token = getToken();
    if (!token) return;

    setSending(true);
    try {
      const response = await fetch(`/api/sessions/${sessionId}/invite`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ friendIds: selectedFriends }),
      });

      if (response.ok) {
        onInviteSent();
        onClose();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to send invites');
      }
    } catch (error) {
      console.error('Error sending invites:', error);
      alert('Failed to send invites');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md max-h-[80vh] overflow-hidden">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Invite Friends</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
            <p className="mt-2 text-gray-400">Loading friends...</p>
          </div>
        ) : friends.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-400">No online friends available to invite</p>
          </div>
        ) : (
          <>
            <div className="mb-4">
              <p className="text-sm text-gray-400 mb-2">
                Select friends to invite ({selectedFriends.length} selected)
              </p>
              <div className="text-xs text-gray-500">
                Only online friends are shown for better gaming experience
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto space-y-3 mb-6">
              {friends.map((friend) => (
                <div
                  key={friend.id}
                  className={`flex items-center p-3 rounded-lg cursor-pointer transition-colors ${
                    selectedFriends.includes(friend.id)
                      ? 'bg-blue-600 border-2 border-blue-500'
                      : 'bg-gray-700 hover:bg-gray-600 border-2 border-transparent'
                  }`}
                  onClick={() => toggleFriendSelection(friend.id)}
                >
                  <div className="flex items-center space-x-3 flex-1">
                    <div className="relative">
                      {friend.avatar ? (
                        <img
                          src={friend.avatar}
                          alt={friend.username}
                          className="w-10 h-10 rounded-full"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                          {friend.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-gray-800" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{friend.username}</h3>
                      <p className="text-xs text-gray-300">Online</p>
                    </div>
                  </div>
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                      selectedFriends.includes(friend.id)
                        ? 'bg-white border-white'
                        : 'border-gray-400'
                    }`}
                  >
                    {selectedFriends.includes(friend.id) && (
                      <svg
                        className="w-3 h-3 text-blue-600"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex space-x-3">
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-600 hover:bg-gray-500 text-white rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={sendInvites}
                disabled={selectedFriends.length === 0 || sending}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedFriends.length === 0 || sending
                    ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                }`}
              >
                {sending ? (
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Sending...</span>
                  </div>
                ) : (
                  `Send Invites (${selectedFriends.length})`
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
