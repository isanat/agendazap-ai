import { NextResponse } from 'next/server';

/**
 * POST /api/auth/logout
 * Clear the user session
 */
export async function POST() {
  try {
    // In a real app with NextAuth, you would call signOut() here
    // For now, we just return success since the client handles localStorage clearing
    
    const response = NextResponse.json({ 
      success: true, 
      message: 'Logged out successfully' 
    });
    
    // Clear any auth cookies by setting them to expire in the past
    response.cookies.set('next-auth.session-token', '', {
      expires: new Date(0),
      path: '/',
    });
    
    response.cookies.set('next-auth.csrf-token', '', {
      expires: new Date(0),
      path: '/',
    });
    
    response.cookies.set('next-auth.callback-url', '', {
      expires: new Date(0),
      path: '/',
    });
    
    return response;
  } catch (error) {
    console.error('[Logout API] Error:', error);
    return NextResponse.json(
      { error: 'Failed to logout' },
      { status: 500 }
    );
  }
}
