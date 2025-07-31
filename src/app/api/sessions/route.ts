import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

// Type definitions
interface ApiResponse {
  success: boolean;
  data?: any;
  error?: string;
  message?: string;
}

interface PaginatedResponse<T> extends ApiResponse {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Input validation schemas
const createSessionSchema = z.object({
  gameId: z.string(),
  name: z.string().min(1).max(100),
  description: z.string().optional(),
  isPrivate: z.boolean().default(false),
  password: z.string().optional(),
  maxPlayers: z.number().min(2).max(16).default(4),
  gameSettings: z.record(z.any()).optional(),
});

// GET /api/sessions - Retrieve sessions with filtering and pagination
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status');
    const gameId = searchParams.get('gameId');
    const search = searchParams.get('search');

    const offset = (page - 1) * limit;

    // Build where clause
    const where: any = {};
    
    if (status) {
      where.status = status;
    }
    
    if (gameId) {
      where.gameId = gameId;
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Get sessions with pagination
    const [sessions, total] = await Promise.all([
      prisma.gameSession.findMany({
        where,
        include: {
          game: {
            select: {
              id: true,
              name: true,
              iconUrl: true,
              maxPlayers: true,
              networkPorts: true,
              requiresVPN: true,
              executablePath: true,
              launchParameters: true
            }
          },
          host: {
            select: {
              id: true,
              username: true,
              avatar: true
            }
          },
          players: {
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  avatar: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: offset,
        take: limit,
      }),
      prisma.gameSession.count({ where })
    ]);

    const response: PaginatedResponse<typeof sessions[0]> = {
      success: true,
      data: sessions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
      message: `Found ${total} sessions`,
    };

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching sessions:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' } satisfies ApiResponse,
      { status: 500 }
    );
  }
}

// POST /api/sessions - Create new session
export async function POST(request: NextRequest) {
  try {
    console.log('📝 Session creation request received');
    
    // Authenticate user
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' } satisfies ApiResponse,
        { status: 401 }
      );
    }

    // Verify JWT and get user
    const { verifyAccessToken } = await import('@/lib/auth/jwt');
    const userPayload = verifyAccessToken(token);
    
    if (!userPayload) {
      return NextResponse.json(
        { success: false, error: 'Invalid authentication token' } satisfies ApiResponse,
        { status: 401 }
      );
    }

    // Get user from database
    const user = await prisma.user.findUnique({
      where: { id: userPayload.userId }
    });

    console.log('👤 Authenticated user:', user ? `${user.username} (${user.id})` : 'Not found');

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' } satisfies ApiResponse,
        { status: 404 }
      );
    }
    
    const body = await request.json();
    console.log('📋 Request body:', body);
    
    const sessionData = createSessionSchema.parse(body);
    console.log('✅ Schema validation passed:', sessionData);

    // Verify the game exists
    console.log('🎮 Looking for game with ID:', sessionData.gameId);
    const game = await prisma.game.findUnique({
      where: { id: sessionData.gameId }
    });

    console.log('🎯 Game found:', game ? `${game.name} (${game.id})` : 'Not found');

    if (!game) {
      // List available games for debugging
      const availableGames = await prisma.game.findMany({
        select: { id: true, name: true }
      });
      console.log('📚 Available games:', availableGames);
      
      return NextResponse.json(
        { 
          success: false, 
          error: `Game not found. Available games: ${availableGames.map(g => g.name).join(', ')}`
        } satisfies ApiResponse,
        { status: 404 }
      );
    }

    // Create the session
    console.log('💾 Creating session in database...');
    const newSession = await prisma.gameSession.create({
      data: {
        name: sessionData.name,
        description: sessionData.description,
        gameId: sessionData.gameId,
        hostId: user.id,
        isPrivate: sessionData.isPrivate,
        password: sessionData.password,
        maxPlayers: sessionData.maxPlayers,
        status: 'WAITING',
        // Automatically add the host as a player
        players: {
          create: {
            userId: user.id,
            status: 'JOINED'
          }
        }
      },
      include: {
        game: {
          select: {
            id: true,
            name: true,
            iconUrl: true,
            maxPlayers: true
          }
        },
        host: {
          select: {
            id: true,
            username: true,
            avatar: true
          }
        },
        players: {
          include: {
            user: {
              select: {
                id: true,
                username: true,
                avatar: true
              }
            }
          }
        }
      }
    });

    return NextResponse.json(
      { 
        success: true, 
        data: newSession,
        message: 'Session created successfully'
      } satisfies ApiResponse,
      { status: 201 }
    );

  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Validation error:', error.errors);
      return NextResponse.json(
        { 
          success: false,
          error: `Validation failed: ${error.errors.map(e => e.message).join(', ')}`
        } satisfies ApiResponse,
        { status: 400 }
      );
    }

    console.error('❌ Error creating session:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create session' } satisfies ApiResponse,
      { status: 500 }
    );
  }
}

function generateInviteCode(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
