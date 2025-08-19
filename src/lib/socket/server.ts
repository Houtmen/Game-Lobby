import { Server as SocketIOServer, Socket } from 'socket.io';
import { verifyAccessToken } from '@/lib/auth/jwt';
import { prisma } from '@/lib/prisma';

export interface SocketUser {
  id: string;
  username: string;
  email: string;
  subscriptionTier: string;
  avatar?: string;
}

export interface AuthenticatedSocket extends Socket {
  user?: SocketUser;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  userId: string;
  username: string;
  message: string;
  timestamp: Date;
  type: 'text' | 'system' | 'game_event';
}

export interface GameRoom {
  sessionId: string;
  gameId: string;
  gameName: string;
  hostId: string;
  players: RoomPlayer[];
  messages: ChatMessage[];
  status: 'waiting' | 'starting' | 'active' | 'finished';
}

export interface RoomPlayer {
  userId: string;
  username: string;
  avatar?: string;
  isHost: boolean;
  isReady: boolean;
  joinedAt: Date;
}

let io: SocketIOServer;
const rooms: Map<string, GameRoom> = new Map();
const userSessions: Map<string, string> = new Map(); // userId -> sessionId

export const initializeSocket = (socketServer: SocketIOServer) => {
  io = socketServer;

  // Authentication middleware
  io.use(async (socket: any, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication required'));
      }

      const payload = verifyAccessToken(token);
      if (!payload) {
        return next(new Error('Invalid token'));
      }

      // Get user from database
      const user = await prisma.user.findUnique({
        where: { id: payload.userId },
        select: {
          id: true,
          username: true,
          email: true,
          subscriptionTier: true,
          avatar: true,
          isOnline: true,
        },
      });

      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication failed'));
    }
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`User ${socket.user?.username} connected`);

    // Update user online status
    if (socket.user) {
      updateUserOnlineStatus(socket.user.id, true);
    }

    // Join user to their personal room
    socket.join(`user:${socket.user?.id}`);

    // Handle lobby events
    socket.on('join_lobby', () => {
      socket.join('lobby');
      socket.emit('lobby_joined');
    });

    socket.on('leave_lobby', () => {
      socket.leave('lobby');
    });

    // Enhanced session/room events
    socket.on('join_session', async (sessionId: string) => {
      if (!socket.user) return;

      try {
        // Get session from database
        const session = await prisma.gameSession.findUnique({
          where: { id: sessionId },
          include: {
            game: true,
            host: { select: { id: true, username: true, avatar: true } },
            players: {
              include: {
                user: { select: { id: true, username: true, avatar: true } },
              },
            },
          },
        });

        if (!session) {
          socket.emit('error', 'Session not found');
          return;
        }

        // Join socket room
        socket.join(`session:${sessionId}`);

        // Track user session
        userSessions.set(socket.user.id, sessionId);

        // Create or update room data
        if (!rooms.has(sessionId)) {
          rooms.set(sessionId, {
            sessionId,
            gameId: session.gameId,
            gameName: session.game.name,
            hostId: session.hostId,
            players: [],
            messages: [],
            status: session.status as any,
          });
        }

        const room = rooms.get(sessionId)!;

        // Add player if not already in room
        const existingPlayer = room.players.find((p) => p.userId === socket.user!.id);
        if (!existingPlayer) {
          room.players.push({
            userId: socket.user.id,
            username: socket.user.username,
            avatar: socket.user.avatar,
            isHost: socket.user.id === session.hostId,
            isReady: false,
            joinedAt: new Date(),
          });
        }

        // Send room state to user
        socket.emit('room_joined', room);

        // Notify other players
        socket.to(`session:${sessionId}`).emit('player_joined', {
          userId: socket.user.id,
          username: socket.user.username,
          avatar: socket.user.avatar,
        });

        // Send system message
        sendSystemMessage(sessionId, `${socket.user.username} joined the room`);
      } catch (error) {
        console.error('Error joining session:', error);
        socket.emit('error', 'Failed to join session');
      }
    });

    socket.on('leave_session', (sessionId: string) => {
      handleUserLeaveSession(socket, sessionId);
    });

    // Player ready state
    socket.on('set_ready', (data: { sessionId: string; ready: boolean }) => {
      if (!socket.user) return;

      const { sessionId, ready } = data;
      const room = rooms.get(sessionId);

      if (room) {
        const player = room.players.find((p) => p.userId === socket.user!.id);
        if (player) {
          player.isReady = ready;
          io.to(`session:${sessionId}`).emit('player_ready_changed', {
            userId: socket.user.id,
            ready,
          });

          // Check if all players are ready
          const allReady = room.players.every((p) => p.isReady);
          if (allReady && room.players.length >= 2) {
            sendSystemMessage(sessionId, 'All players ready! Game can start.');
            io.to(`session:${sessionId}`).emit('all_players_ready');
          }
        }
      }
    });

    // Start game
    socket.on('start_game', async (sessionId: string) => {
      if (!socket.user) return;

      const room = rooms.get(sessionId);
      if (!room || room.hostId !== socket.user.id) {
        socket.emit('error', 'Only the host can start the game');
        return;
      }

      try {
        // Update session status in database
        await prisma.gameSession.update({
          where: { id: sessionId },
          data: { status: 'STARTING' },
        });

        room.status = 'starting';
        io.to(`session:${sessionId}`).emit('game_starting', { sessionId });
        sendSystemMessage(sessionId, 'Game is starting! Launching...');
      } catch (error) {
        console.error('Error starting game:', error);
        socket.emit('error', 'Failed to start game');
      }
    });

    // Enhanced chat messages
    socket.on('send_message', async (data: { sessionId?: string; message: string }) => {
      if (!socket.user) return;

      const { sessionId, message } = data;

      if (!message.trim()) return;

      try {
        // Save message to database
        const chatMessage = await prisma.chatMessage.create({
          data: {
            sessionId: sessionId || null,
            authorId: socket.user.id,
            content: message.trim(),
            type: 'TEXT',
          },
        });

        const messageData: ChatMessage = {
          id: chatMessage.id,
          sessionId: sessionId || 'lobby',
          userId: socket.user.id,
          username: socket.user.username,
          message: message.trim(),
          timestamp: chatMessage.createdAt,
          type: 'text',
        };

        // Add to room messages if it's a session
        if (sessionId) {
          const room = rooms.get(sessionId);
          if (room) {
            room.messages.push(messageData);
            // Keep only last 100 messages in memory
            if (room.messages.length > 100) {
              room.messages = room.messages.slice(-100);
            }
          }
        }

        const roomName = sessionId ? `session:${sessionId}` : 'lobby';
        io.to(roomName).emit('new_message', messageData);
  } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', 'Failed to send message');
      }
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User ${socket.user?.username} disconnected`);
      if (socket.user) {
        updateUserOnlineStatus(socket.user.id, false);

        // Handle leaving any session they were in
        const sessionId = userSessions.get(socket.user.id);
        if (sessionId) {
          handleUserLeaveSession(socket, sessionId);
        }
      }
    });
  });

  return io;
};

// Helper functions
const sendSystemMessage = (sessionId: string, message: string) => {
  const systemMessage: ChatMessage = {
    id: `system-${Date.now()}`,
    sessionId,
    userId: 'system',
    username: 'System',
    message,
    timestamp: new Date(),
    type: 'system',
  };

  const room = rooms.get(sessionId);
  if (room) {
    room.messages.push(systemMessage);
    if (room.messages.length > 100) {
      room.messages = room.messages.slice(-100);
    }
  }

  io.to(`session:${sessionId}`).emit('new_message', systemMessage);
};

const handleUserLeaveSession = (socket: AuthenticatedSocket, sessionId: string) => {
  if (!socket.user) return;

  socket.leave(`session:${sessionId}`);
  userSessions.delete(socket.user.id);

  const room = rooms.get(sessionId);
  if (room) {
    // Remove player from room
    room.players = room.players.filter((p) => p.userId !== socket.user!.id);

    // Notify other players
    socket.to(`session:${sessionId}`).emit('player_left', {
      userId: socket.user.id,
      username: socket.user.username,
    });

    // Send system message
    sendSystemMessage(sessionId, `${socket.user.username} left the room`);

    // If host left, transfer to next player
    if (room.hostId === socket.user.id && room.players.length > 0) {
      const newHost = room.players[0];
      room.hostId = newHost.userId;
      newHost.isHost = true;

      io.to(`session:${sessionId}`).emit('host_changed', {
        newHostId: newHost.userId,
        newHostName: newHost.username,
      });

      sendSystemMessage(sessionId, `${newHost.username} is now the host`);
    }

    // If room is empty, remove it
    if (room.players.length === 0) {
      rooms.delete(sessionId);
    }
  }
};

const updateUserOnlineStatus = async (userId: string, isOnline: boolean) => {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        isOnline,
        lastSeen: new Date(),
      },
    });

    // Broadcast online status to friends
    io.to(`user:${userId}`).emit('user_status_changed', { userId, isOnline });
  } catch (error) {
    console.error('Error updating user status:', error);
  }
};

export const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized');
  }
  return io;
};

// Helper functions to emit events
export const emitToUser = (userId: string, event: string, data: any) => {
  io.to(`user:${userId}`).emit(event, data);
};

export const emitToSession = (sessionId: string, event: string, data: any) => {
  io.to(`session:${sessionId}`).emit(event, data);
};

export const emitToLobby = (event: string, data: any) => {
  io.to('lobby').emit(event, data);
};

// Game process monitoring functions
export const notifyGameLaunched = (sessionId: string, userId: string, gameData: any) => {
  const gameEventData = {
    sessionId,
    userId,
    event: 'game_launched',
    timestamp: new Date(),
    data: gameData,
  };

  // Notify all users in the session
  emitToSession(sessionId, 'game_process_update', gameEventData);

  // Notify the specific user
  emitToUser(userId, 'game_launched', gameEventData);
};

export const notifyGameTerminated = (sessionId: string, userId: string, gameData: any) => {
  const gameEventData = {
    sessionId,
    userId,
    event: 'game_terminated',
    timestamp: new Date(),
    data: gameData,
  };

  // Notify all users in the session
  emitToSession(sessionId, 'game_process_update', gameEventData);

  // Notify the specific user
  emitToUser(userId, 'game_terminated', gameEventData);
};

export const notifyGameStatusChange = (
  sessionId: string,
  userId: string,
  status: string,
  processData?: any
) => {
  const statusEventData = {
    sessionId,
    userId,
    status,
    timestamp: new Date(),
    processData,
  };

  // Notify all users in the session
  emitToSession(sessionId, 'game_status_changed', statusEventData);

  // Notify the specific user
  emitToUser(userId, 'game_status_update', statusEventData);
};

// Helper to broadcast game process updates to session participants
export const broadcastGameProcessUpdate = (sessionId: string, updates: any) => {
  emitToSession(sessionId, 'game_process_broadcast', {
    sessionId,
    timestamp: new Date(),
    updates,
  });
};
