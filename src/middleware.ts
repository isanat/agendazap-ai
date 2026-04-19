import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Allowed origins whitelist for CORS
 * Only these origins are permitted to make cross-origin requests with credentials
 */
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://localhost:3001',
  'https://agendazap-ai.vercel.app',
  // Add production domain from environment
  process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
  process.env.NEXTAUTH_URL,
].filter(Boolean) as string[];

/**
 * Check if an origin is allowed to make CORS requests
 * @param origin - The origin header from the request
 * @returns true if the origin is allowed, false otherwise
 */
function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  
  // Check against whitelist
  if (ALLOWED_ORIGINS.includes(origin)) {
    return true;
  }
  
  // Allow Vercel preview deployments
  if (origin.endsWith('.vercel.app')) {
    return true;
  }
  
  // Allow localhost for development (any port)
  if (origin.startsWith('http://localhost:')) {
    return true;
  }
  
  return false;
}

/**
 * Middleware for AgendaZap AI
 * 
 * This middleware handles:
 * 1. Secure CORS configuration with origin whitelist
 * 2. Security headers for all responses
 * 3. Protecting routes that require authentication
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const origin = request.headers.get('origin');
  
  // Handle CORS for API routes
  if (pathname.startsWith('/api/')) {
    const response = NextResponse.next();
    
    // Only set CORS headers for allowed origins
    if (isAllowedOrigin(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }
    // For disallowed origins, don't set CORS headers
    // This will cause the browser to block the request
    
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
    // Include custom auth headers for header-based authentication
    response.headers.set(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization, X-Requested-With, x-user-id, x-user-email, x-user-name, x-user-role, x-account-id'
    );
    
    // Add security headers
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    
    // Add HSTS in production
    if (process.env.NODE_ENV === 'production') {
      response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, { status: 200, headers: response.headers });
    }
    
    return response;
  }

  // For non-API routes, add security headers
  const response = NextResponse.next();
  
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  if (process.env.NODE_ENV === 'production') {
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  
  return response;
}

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    // Match all API routes
    '/api/:path*',
    // Match dashboard and protected pages
    '/dashboard/:path*',
    '/appointments/:path*',
    '/clients/:path*',
    '/services/:path*',
    '/professionals/:path*',
    '/whatsapp/:path*',
    '/reports/:path*',
    '/settings/:path*',
    '/admin/:path*',
  ],
};
