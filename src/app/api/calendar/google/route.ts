import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth-helpers';
import { decryptCredentials } from '@/app/api/integrations/route';

/**
 * Google Calendar Integration
 * 
 * Uses TENANT-specific Google Calendar credentials stored in the Integration table.
 * Each business connects their own Google Calendar via OAuth.
 */

interface GoogleConfig {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

// Google OAuth config (system-wide for OAuth flow)
const GOOGLE_OAUTH_CONFIG = {
  clientId: process.env.GOOGLE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
};

// Get Google Calendar config for a specific account
async function getGoogleConfigForAccount(accountId: string): Promise<GoogleConfig | null> {
  const integration = await db.integration.findUnique({
    where: {
      accountId_type: {
        accountId,
        type: 'google_calendar'
      }
    }
  });

  if (!integration || integration.status !== 'connected') {
    return null;
  }

  const credentials = decryptCredentials(integration.credentials);

  if (!credentials.accessToken) {
    return null;
  }

  return {
    accessToken: credentials.accessToken as string,
    refreshToken: credentials.refreshToken as string,
    expiresAt: new Date(credentials.expiresAt as string),
  };
}

// Store access tokens in memory (per account)
const tokenCache = new Map<string, { accessToken: string; expiresAt: number }>();

/**
 * Get a valid access token for an account
 */
async function getAccessToken(accountId: string, config: GoogleConfig): Promise<string> {
  // Check if we have a valid cached token
  const cached = tokenCache.get(accountId);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.accessToken;
  }

  // Check if token needs refresh
  const fiveMinutes = 5 * 60 * 1000;
  if (config.expiresAt.getTime() - Date.now() < fiveMinutes) {
    // Refresh the token
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: GOOGLE_OAUTH_CONFIG.clientId,
        client_secret: GOOGLE_OAUTH_CONFIG.clientSecret,
        refresh_token: config.refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to refresh token: ${error.error_description || error.error}`);
    }

    const data = await response.json();
    const newAccessToken = data.access_token;
    const expiresIn = data.expires_in || 3600;

    // Update cached token
    tokenCache.set(accountId, {
      accessToken: newAccessToken,
      expiresAt: Date.now() + (expiresIn - 60) * 1000,
    });

    // Update database with new token
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    await db.integration.update({
      where: {
        accountId_type: {
          accountId,
          type: 'google_calendar'
        }
      },
      data: {
        credentials: JSON.stringify({
          accessToken: newAccessToken,
          refreshToken: config.refreshToken,
          expiresAt: expiresAt.toISOString(),
        }),
      }
    });

    return newAccessToken;
  }

  // Token is still valid
  tokenCache.set(accountId, {
    accessToken: config.accessToken,
    expiresAt: config.expiresAt.getTime() - 60000,
  });

  return config.accessToken;
}

/**
 * Create a calendar event
 */
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    
    if (!authUser || !authUser.accountId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const {
      summary,
      description,
      startTime,
      endTime,
      attendees,
      location,
      reminders,
    } = body;

    if (!summary || !startTime || !endTime) {
      return NextResponse.json(
        { error: 'Summary, startTime, and endTime are required' },
        { status: 400 }
      );
    }

    // Get Google Calendar config for this account
    const config = await getGoogleConfigForAccount(authUser.accountId);

    // If not configured, return simulated response
    if (!config) {
      console.log('[Google Calendar] Not configured for account, returning simulated response');
      return NextResponse.json({
        success: true,
        simulated: true,
        message: 'Event created (simulated - Google Calendar not connected)',
        data: {
          id: `sim_${Date.now()}`,
          summary,
          start: { dateTime: startTime },
          end: { dateTime: endTime },
          htmlLink: 'https://calendar.google.com',
          status: 'confirmed',
        }
      });
    }

    const accessToken = await getAccessToken(authUser.accountId, config);
    const calendarId = 'primary';

    // Create event
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          summary,
          description,
          start: {
            dateTime: startTime,
            timeZone: 'America/Sao_Paulo',
          },
          end: {
            dateTime: endTime,
            timeZone: 'America/Sao_Paulo',
          },
          attendees: attendees?.map((email: string) => ({ email })),
          location,
          reminders: reminders || {
            useDefault: false,
            overrides: [
              { method: 'popup', minutes: 120 },
              { method: 'popup', minutes: 1440 },
            ],
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      console.error('[Google Calendar] Error:', error);
      return NextResponse.json(
        { 
          error: error.error?.message || 'Failed to create event',
          details: error 
        },
        { status: 500 }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      data: {
        id: data.id,
        summary: data.summary,
        start: data.start,
        end: data.end,
        htmlLink: data.htmlLink,
        status: data.status,
      },
    });
  } catch (error) {
    console.error('[Google Calendar] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Get events or specific event
 */
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    
    if (!authUser || !authUser.accountId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('id');
    const timeMin = searchParams.get('timeMin');
    const timeMax = searchParams.get('timeMax');
    const maxResults = searchParams.get('maxResults') || '50';

    // Get Google Calendar config for this account
    const config = await getGoogleConfigForAccount(authUser.accountId);

    // If not configured, return simulated response
    if (!config) {
      return NextResponse.json({
        success: true,
        simulated: true,
        configured: false,
        message: 'Google Calendar não conectado. Acesse Configurações > Integrações.',
      });
    }

    const accessToken = await getAccessToken(authUser.accountId, config);
    const calendarId = 'primary';

    // Get specific event
    if (eventId) {
      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok) {
        const error = await response.json();
        return NextResponse.json(
          { error: error.error?.message || 'Failed to get event' },
          { status: 500 }
        );
      }

      const data = await response.json();

      return NextResponse.json({
        success: true,
        data: {
          id: data.id,
          summary: data.summary,
          description: data.description,
          start: data.start,
          end: data.end,
          status: data.status,
          attendees: data.attendees,
        },
      });
    }

    // List events
    const params = new URLSearchParams({
      maxResults: maxResults.toString(),
      singleEvents: 'true',
      orderBy: 'startTime',
    });

    if (timeMin) params.append('timeMin', timeMin);
    if (timeMax) params.append('timeMax', timeMax);
    if (!timeMin) params.append('timeMin', new Date().toISOString());

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events?${params}`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: error.error?.message || 'Failed to get events' },
        { status: 500 }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      data: data.items?.map((event: Record<string, unknown>) => ({
        id: event.id,
        summary: event.summary,
        start: event.start,
        end: event.end,
        status: event.status,
      })),
      total: data.items?.length,
    });
  } catch (error) {
    console.error('[Google Calendar] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Update an event
 */
export async function PUT(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    
    if (!authUser || !authUser.accountId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { eventId, ...eventData } = body;

    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      );
    }

    const config = await getGoogleConfigForAccount(authUser.accountId);

    if (!config) {
      return NextResponse.json({
        success: true,
        simulated: true,
        message: 'Event updated (simulated)',
      });
    }

    const accessToken = await getAccessToken(authUser.accountId, config);
    const calendarId = 'primary';

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return NextResponse.json(
        { error: error.error?.message || 'Failed to update event' },
        { status: 500 }
      );
    }

    const data = await response.json();

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error('[Google Calendar] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * Delete an event
 */
export async function DELETE(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    
    if (!authUser || !authUser.accountId) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const eventId = searchParams.get('id');

    if (!eventId) {
      return NextResponse.json(
        { error: 'Event ID is required' },
        { status: 400 }
      );
    }

    const config = await getGoogleConfigForAccount(authUser.accountId);

    if (!config) {
      return NextResponse.json({
        success: true,
        simulated: true,
        message: 'Event deleted (simulated)',
      });
    }

    const accessToken = await getAccessToken(authUser.accountId, config);
    const calendarId = 'primary';

    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );

    if (!response.ok && response.status !== 410) {
      const error = await response.json();
      return NextResponse.json(
        { error: error.error?.message || 'Failed to delete event' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Event deleted successfully',
    });
  } catch (error) {
    console.error('[Google Calendar] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
