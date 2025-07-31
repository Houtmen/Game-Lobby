import { NextRequest } from 'next/server';
import { verifyAccessToken, extractTokenFromHeader, JWTPayload } from './jwt';

export interface AuthenticatedRequest extends NextRequest {
  user?: JWTPayload;
}

export const authenticateUser = (request: NextRequest): JWTPayload | null => {
  const authHeader = request.headers.get('authorization');
  const token = extractTokenFromHeader(authHeader);
  
  if (!token) {
    return null;
  }
  
  return verifyAccessToken(token);
};

export const requireAuth = (handler: (req: AuthenticatedRequest) => Promise<Response>) => {
  return async (request: NextRequest): Promise<Response> => {
    const user = authenticateUser(request);
    
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { 
          status: 401,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
    
    // Add user to request object
    const authenticatedRequest = request as AuthenticatedRequest;
    authenticatedRequest.user = user;
    
    return handler(authenticatedRequest);
  };
};

export const optionalAuth = (handler: (req: AuthenticatedRequest) => Promise<Response>) => {
  return async (request: NextRequest): Promise<Response> => {
    const user = authenticateUser(request);
    
    // Add user to request object (can be null)
    const authenticatedRequest = request as AuthenticatedRequest;
    authenticatedRequest.user = user || undefined;
    
    return handler(authenticatedRequest);
  };
};
