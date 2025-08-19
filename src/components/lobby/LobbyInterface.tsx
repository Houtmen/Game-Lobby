'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import {
  FaGamepad,
  FaUsers,
  FaCog,
  FaPaperPlane,
  FaMicrophone,
  FaSignOutAlt,
  FaPlay,
  FaPause,
  FaCrown,
  FaCheck,
  FaTimes,
} from 'react-icons/fa';
import { io, Socket } from 'socket.io-client';
import VPNManager from '@/components/vpn/VPNManager';
import GameLauncher from '@/components/games/GameLauncher';

interface GameRoom {
  sessionId: string;
  gameId: string;
  gameName: string;
  gameRequiresVPN: boolean;
  hostId: string;
  players: RoomPlayer[];
  messages: ChatMessage[];
  status: 'waiting' | 'starting' | 'in_progress' | 'finished';
}

interface RoomPlayer {
  userId: string;
  username: string;
  avatar?: string;
  isHost: boolean;
  isReady: boolean;
  joinedAt: Date;
}

interface ChatMessage {
  id: string;
  sessionId: string;
  userId: string;
  username: string;
  message: string;
  timestamp: Date;
  type: 'text' | 'system';
}

interface LobbyState {
  currentRoom: GameRoom | null;
  isConnected: boolean;
  isInLobby: boolean;
  activeSessions: GameSession[];
  loadingSessions: boolean;
}

interface GameSession {
  id: string;
  name: string;
  gameId: string;
  hostPlayerId: string;
  maxPlayers: number;
  status: string;
  game: {
    id: string;
    name: string;
    description?: string;
  };
  host: {
    id: string;
    username: string;
    avatar?: string;
  };
  players: Array<{
    id: string;
    user: {
      id: string;
      username: string;
      avatar?: string;
    };
  }>;
  createdAt: string;
}

export const LobbyInterface: React.FC = () => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [lobbyState, setLobbyState] = useState<LobbyState>({
    currentRoom: null,
    isConnected: false,
    isInLobby: false,
    activeSessions: [],
    loadingSessions: true,
  });
  const [chatMessage, setChatMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load active sessions
  const loadActiveSessions = async () => {
    try {
      setLobbyState((prev) => ({ ...prev, loadingSessions: true }));
      const response = await fetch('/api/sessions?status=WAITING&status=STARTING');
      if (response.ok) {
        const sessions = await response.json();
        setLobbyState((prev) => ({
          ...prev,
          activeSessions: sessions.data || sessions,
          loadingSessions: false,
        }));
      }
    } catch (error) {
      console.error('Error loading sessions:', error);
      setLobbyState((prev) => ({ ...prev, loadingSessions: false }));
    }
  };

  // Join a session
  const joinSession = (sessionId: string) => {
    if (socket) {
      socket.emit('join_session', sessionId);
    }
  };

  // Socket connection and event handlers
  useEffect(() => {
    if (!user) return;

    // Load sessions immediately, don't wait for socket
    loadActiveSessions();

    // Auto-connect timeout - show lobby after 3 seconds even if socket fails
    const connectTimeout = setTimeout(() => {
      console.log('⏰ Socket connection timeout - showing lobby anyway');
      setLobbyState((prev) => ({ ...prev, isConnected: true }));
    }, 3000);

    // Initialize socket connection
    const initSocket = async () => {
      // Get auth token from localStorage (where our auth system stores it)
      const token =
        localStorage.getItem('accessToken') ||
        localStorage.getItem('authToken') ||
        localStorage.getItem('token');

      if (!token) {
        console.error('No auth token found in localStorage');
        console.log('Available localStorage keys:', Object.keys(localStorage));
        // Set connected to true anyway so user can see the lobby
        setLobbyState((prev) => ({ ...prev, isConnected: true }));
        return;
      }

      console.log('🔌 Initializing socket with token:', token.substring(0, 10) + '...');

      const socketInstance = io({
        path: '/api/socket',
        auth: { token },
      });

      socketInstance.on('connect', () => {
        console.log('✅ Socket connected successfully!');
        clearTimeout(connectTimeout);
        setLobbyState((prev) => ({ ...prev, isConnected: true }));
        socketInstance.emit('join_lobby');
      });

      socketInstance.on('connect_error', (error) => {
        console.error('❌ Socket connection error:', error);
        console.log('🔄 Allowing lobby access without real-time features');
        clearTimeout(connectTimeout);
        // Still allow lobby access even if socket fails
        setLobbyState((prev) => ({ ...prev, isConnected: true }));
      });

      socketInstance.on('disconnect', () => {
        console.log('🔌 Socket disconnected');
        setLobbyState((prev) => ({ ...prev, isConnected: false, isInLobby: false }));
      });

      socketInstance.on('lobby_joined', () => {
        setLobbyState((prev) => ({ ...prev, isInLobby: true }));
        loadActiveSessions();
      });

      socketInstance.on('room_joined', (room: GameRoom) => {
        setLobbyState((prev) => ({ ...prev, currentRoom: room }));
      });

      socketInstance.on(
        'player_joined',
        (player: { userId: string; username: string; avatar?: string }) => {
          setLobbyState((prev) => {
            if (!prev.currentRoom) return prev;
            const updatedRoom = {
              ...prev.currentRoom,
              players: [
                ...prev.currentRoom.players,
                {
                  ...player,
                  isHost: false,
                  isReady: false,
                  joinedAt: new Date(),
                },
              ],
            };
            return { ...prev, currentRoom: updatedRoom };
          });
        }
      );

      socketInstance.on('player_left', (data: { userId: string; username: string }) => {
        setLobbyState((prev) => {
          if (!prev.currentRoom) return prev;
          const updatedRoom = {
            ...prev.currentRoom,
            players: prev.currentRoom.players.filter((p) => p.userId !== data.userId),
          };
          return { ...prev, currentRoom: updatedRoom };
        });
      });

      socketInstance.on('player_ready_changed', (data: { userId: string; ready: boolean }) => {
        setLobbyState((prev) => {
          if (!prev.currentRoom) return prev;
          const updatedRoom = {
            ...prev.currentRoom,
            players: prev.currentRoom.players.map((p) =>
              p.userId === data.userId ? { ...p, isReady: data.ready } : p
            ),
          };
          return { ...prev, currentRoom: updatedRoom };
        });
      });

      socketInstance.on('host_changed', (data: { newHostId: string; newHostName: string }) => {
        setLobbyState((prev) => {
          if (!prev.currentRoom) return prev;
          const updatedRoom = {
            ...prev.currentRoom,
            hostId: data.newHostId,
            players: prev.currentRoom.players.map((p) => ({
              ...p,
              isHost: p.userId === data.newHostId,
            })),
          };
          return { ...prev, currentRoom: updatedRoom };
        });
      });

      socketInstance.on('new_message', (message: ChatMessage) => {
        setLobbyState((prev) => {
          if (!prev.currentRoom) return prev;
          const updatedRoom = {
            ...prev.currentRoom,
            messages: [...prev.currentRoom.messages, message],
          };
          return { ...prev, currentRoom: updatedRoom };
        });
      });

      socketInstance.on('game_starting', () => {
        setLobbyState((prev) => {
          if (!prev.currentRoom) return prev;
          return {
            ...prev,
            currentRoom: { ...prev.currentRoom, status: 'starting' },
          };
        });
      });

      socketInstance.on('all_players_ready', () => {
        // Visual feedback that all players are ready
      });

      socketInstance.on('error', (error: string) => {
        console.error('Socket error:', error);
      });

      setSocket(socketInstance);
    };

    initSocket();

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [user]);

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [lobbyState.currentRoom?.messages]);

  const sendMessage = () => {
    if (!socket || !chatMessage.trim()) return;

    socket.emit('send_message', {
      sessionId: lobbyState.currentRoom?.sessionId,
      message: chatMessage.trim(),
    });

    setChatMessage('');
  };

  const toggleReady = () => {
    if (!socket || !lobbyState.currentRoom) return;

    const currentPlayer = lobbyState.currentRoom.players.find((p) => p.userId === user?.id);
    const newReadyState = !currentPlayer?.isReady;

    socket.emit('set_ready', {
      sessionId: lobbyState.currentRoom.sessionId,
      ready: newReadyState,
    });
  };

  const startGame = () => {
    if (!socket || !lobbyState.currentRoom) return;

    socket.emit('start_game', lobbyState.currentRoom.sessionId);
  };

  const leaveRoom = () => {
    if (!socket || !lobbyState.currentRoom) return;

    socket.emit('leave_session', lobbyState.currentRoom.sessionId);
    setLobbyState((prev) => ({ ...prev, currentRoom: null }));
  };

  const isHost = lobbyState.currentRoom?.hostId === user?.id;
  const currentPlayer = lobbyState.currentRoom?.players.find((p) => p.userId === user?.id);
  const allPlayersReady =
    lobbyState.currentRoom?.players.every((p) => p.isReady) &&
    (lobbyState.currentRoom?.players.length || 0) >= 2;

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-white text-xl">Please log in to access the lobby</div>
      </div>
    );
  }

  if (!lobbyState.isConnected) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="text-white text-xl mb-4">Connecting to lobby...</div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400 mx-auto"></div>
          <div className="text-gray-400 text-sm mt-4">
            Check browser console for connection details
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {!lobbyState.currentRoom ? (
        // Lobby View
        <div className="container mx-auto px-4 py-8">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold mb-4 text-blue-400">Game Lobby</h1>
            <p className="text-gray-300">
              Welcome, {user.username}! Join a game session or create one.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Active Sessions */}
            <div className="lg:col-span-2">
              <div className="bg-gray-800 rounded-lg p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-semibold flex items-center">
                    <FaGamepad className="mr-2" />
                    Active Game Sessions
                  </h2>
                  <button
                    onClick={loadActiveSessions}
                    className="bg-blue-600 hover:bg-blue-700 px-3 py-1 rounded text-sm"
                  >
                    Refresh
                  </button>
                </div>

                {lobbyState.loadingSessions ? (
                  <div className="text-center py-8">
                    <div className="text-gray-400">Loading sessions...</div>
                  </div>
                ) : lobbyState.activeSessions.length > 0 ? (
                  <div className="space-y-4">
                    {lobbyState.activeSessions.map((session) => (
                      <div key={session.id} className="bg-gray-700 rounded-lg p-4">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <h3 className="text-lg font-semibold text-blue-400">{session.name}</h3>
                            <p className="text-sm text-gray-300">{session.game.name}</p>
                            <p className="text-xs text-gray-500">
                              Host: {session.host.username} • {session.players.length}/
                              {session.maxPlayers} players
                            </p>
                          </div>
                          <button
                            onClick={() => joinSession(session.id)}
                            className="bg-green-600 hover:bg-green-700 px-3 py-1 rounded text-sm"
                          >
                            Join
                          </button>
                        </div>

                        {session.game.description && (
                          <p className="text-sm text-gray-400 mb-2">{session.game.description}</p>
                        )}

                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <FaUsers className="text-gray-400 mr-1" />
                            <span className="text-sm text-gray-400">
                              {session.players.map((p) => p.user.username).join(', ')}
                            </span>
                          </div>
                          <span
                            className={`text-xs px-2 py-1 rounded ${
                              session.status === 'WAITING'
                                ? 'bg-green-600'
                                : session.status === 'STARTING'
                                  ? 'bg-yellow-600'
                                  : 'bg-gray-600'
                            }`}
                          >
                            {session.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="bg-gray-700 rounded-lg p-4 text-center">
                    <p className="text-gray-400">No active sessions</p>
                    <p className="text-sm text-gray-500">
                      Create a new game session to get started
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Lobby Chat */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4">Lobby Chat</h3>
              <div className="h-64 overflow-y-auto bg-gray-700 rounded p-3 mb-4">
                <div className="text-gray-400 text-sm">
                  Welcome to the lobby! Chat with other players here.
                </div>
              </div>
              <div className="flex">
                <input
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 bg-gray-700 rounded-l px-3 py-2 text-white placeholder-gray-400"
                />
                <button
                  onClick={sendMessage}
                  className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-r"
                >
                  <FaPaperPlane />
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        // Game Room View
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold text-blue-400">
                  {lobbyState.currentRoom.gameName}
                </h1>
                <p className="text-gray-300">Room ID: {lobbyState.currentRoom.sessionId}</p>
              </div>
              <button
                onClick={leaveRoom}
                className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded flex items-center"
              >
                <FaSignOutAlt className="mr-2" />
                Leave Room
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Players Panel */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4 flex items-center">
                <FaUsers className="mr-2" />
                Players ({lobbyState.currentRoom.players.length})
              </h3>
              <div className="space-y-3">
                {lobbyState.currentRoom.players.map((player) => (
                  <div
                    key={player.userId}
                    className="flex items-center justify-between bg-gray-700 rounded p-3"
                  >
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center mr-3">
                        {player.avatar ? (
                          <img
                            src={player.avatar}
                            alt={player.username}
                            className="w-8 h-8 rounded-full"
                          />
                        ) : (
                          <span className="text-sm font-bold">
                            {player.username[0].toUpperCase()}
                          </span>
                        )}
                      </div>
                      <div>
                        <div className="flex items-center">
                          <span className="font-medium">{player.username}</span>
                          {player.isHost && <FaCrown className="ml-2 text-yellow-500" />}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center">
                      {player.isReady ? (
                        <FaCheck className="text-green-500" />
                      ) : (
                        <FaTimes className="text-red-500" />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Ready/Start Controls */}
              <div className="mt-6">
                {isHost ? (
                  <button
                    onClick={startGame}
                    disabled={!allPlayersReady || lobbyState.currentRoom.status === 'starting'}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 disabled:cursor-not-allowed px-4 py-2 rounded flex items-center justify-center"
                  >
                    <FaPlay className="mr-2" />
                    {lobbyState.currentRoom.status === 'starting' ? 'Starting...' : 'Start Game'}
                  </button>
                ) : (
                  <button
                    onClick={toggleReady}
                    className={`w-full px-4 py-2 rounded flex items-center justify-center ${
                      currentPlayer?.isReady
                        ? 'bg-yellow-600 hover:bg-yellow-700'
                        : 'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    {currentPlayer?.isReady ? (
                      <>
                        <FaPause className="mr-2" />
                        Not Ready
                      </>
                    ) : (
                      <>
                        <FaCheck className="mr-2" />
                        Ready
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {/* VPN Manager Panel */}
            <div className="bg-gray-800 rounded-lg p-6">
              <VPNManager
                sessionId={lobbyState.currentRoom.sessionId}
                gameRequiresVPN={lobbyState.currentRoom.gameRequiresVPN}
                isHost={isHost}
                participants={lobbyState.currentRoom.players.map((p) => ({
                  userId: p.userId,
                  username: p.username,
                }))}
                serverEndpoint="your-server-ip.com" // Replace with actual server IP
              />
            </div>

            {/* Game Launcher Panel */}
            <div className="bg-gray-800 rounded-lg p-6">
              <GameLauncher
                sessionId={lobbyState.currentRoom.sessionId}
                gameId={lobbyState.currentRoom.gameId}
                gameName={lobbyState.currentRoom.gameName}
                vpnRequired={lobbyState.currentRoom.gameRequiresVPN}
                onLaunchStateChange={(isLaunching: boolean) => {
                  // Optional: Handle launch state changes if needed
                  console.log(`Game launcher state: ${isLaunching ? 'launching' : 'idle'}`);
                }}
              />
            </div>

            {/* Chat Panel */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h3 className="text-xl font-semibold mb-4">Room Chat</h3>
              <div className="h-96 overflow-y-auto bg-gray-700 rounded p-4 mb-4">
                {lobbyState.currentRoom.messages.map((message) => (
                  <div key={message.id} className="mb-3">
                    {message.type === 'system' ? (
                      <div className="text-yellow-400 text-sm italic">{message.message}</div>
                    ) : (
                      <div>
                        <div className="flex items-center mb-1">
                          <span className="font-medium text-blue-400">{message.username}</span>
                          <span className="text-gray-500 text-xs ml-2">
                            {new Date(message.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                        <div className="text-gray-200">{message.message}</div>
                      </div>
                    )}
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              <div className="flex">
                <input
                  type="text"
                  value={chatMessage}
                  onChange={(e) => setChatMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="Type a message..."
                  className="flex-1 bg-gray-700 rounded-l px-3 py-2 text-white placeholder-gray-400"
                />
                <button
                  onClick={sendMessage}
                  className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-r"
                >
                  <FaPaperPlane />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
