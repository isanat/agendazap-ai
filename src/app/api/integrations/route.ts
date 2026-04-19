import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getAuthUser } from '@/lib/auth-helpers';
import { randomBytes, createCipheriv, createDecipheriv, createHash } from 'crypto';

// Encryption key from environment or generate a default (in production, always use env var)
const ENCRYPTION_KEY = process.env.INTEGRATION_ENCRYPTION_KEY || 'agendazap-default-encryption-key-32b!';
const ALGORITHM = 'aes-256-cbc';

// Encrypt credentials
export function encryptCredentials(credentials: Record<string, unknown>): string {
  const key = createHash('sha256').update(ENCRYPTION_KEY).digest();
  const iv = randomBytes(16);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  
  let encrypted = cipher.update(JSON.stringify(credentials), 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return iv.toString('hex') + ':' + encrypted;
}

// Decrypt credentials
export function decryptCredentials(encrypted: string): Record<string, unknown> {
  try {
    const key = createHash('sha256').update(ENCRYPTION_KEY).digest();
    const [ivHex, encryptedData] = encrypted.split(':');
    const iv = Buffer.from(ivHex, 'hex');
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    
    let decrypted = decipher.update(encryptedData, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  } catch {
    return {};
  }
}

/**
 * Get all integrations for the account
 */
export async function GET(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    
    if (!authUser) {
      console.log('[integrations] Auth failed - no user found');
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Check if user has an accountId (superadmin doesn't have one)
    if (!authUser.accountId) {
      console.log('[integrations] User has no accountId:', authUser.email, 'role:', authUser.role);
      return NextResponse.json({ integrations: [] });
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    
    const integrations = await db.integration.findMany({
      where: {
        accountId: authUser.accountId,
        ...(type ? { type } : {})
      }
    });

    if (type) {
      const integration = integrations.find(i => i.type === type);
      return NextResponse.json({
        integration: integration || null,
      });
    }
    
    return NextResponse.json({
      integrations,
    });
  } catch (error) {
    console.error('Error getting integrations:', error);
    return NextResponse.json(
      { error: 'Failed to get integrations' },
      { status: 500 }
    );
  }
}

/**
 * Create or update an integration
 */
export async function POST(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    
    if (!authUser) {
      console.log('[integrations POST] Auth failed - no user found');
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Check if user has an accountId (superadmin doesn't have one)
    if (!authUser.accountId) {
      console.log('[integrations POST] User has no accountId:', authUser.email);
      return NextResponse.json({ 
        error: 'Superadmin não pode criar integrações. Acesse com uma conta de empresa.',
        needsAccount: true,
      }, { status: 400 });
    }

    const body = await request.json();
    const { type, credentials, config, status } = body;
    
    if (!type) {
      return NextResponse.json(
        { error: 'Type is required' },
        { status: 400 }
      );
    }
    
    // Validate integration type
    const validTypes = ['whatsapp', 'mercadopago', 'nfe'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: 'Invalid integration type' },
        { status: 400 }
      );
    }
    
    // Encrypt credentials if provided
    const encryptedCredentials = credentials ? encryptCredentials(credentials) : '';
    
    const integration = await db.integration.upsert({
      where: {
        accountId_type: {
          accountId: authUser.accountId,
          type,
        },
      },
      create: {
        accountId: authUser.accountId,
        type,
        status: status || 'pending',
        credentials: encryptedCredentials,
        config: config ? JSON.stringify(config) : null,
      },
      update: {
        ...(credentials ? { credentials: encryptedCredentials } : {}),
        ...(config ? { config: JSON.stringify(config) } : {}),
        ...(status ? { status } : {}),
      },
    });
    
    return NextResponse.json({
      success: true,
      integration,
    });
  } catch (error) {
    console.error('Error saving integration:', error);
    return NextResponse.json(
      { error: 'Failed to save integration' },
      { status: 500 }
    );
  }
}

/**
 * Delete/disconnect an integration
 */
export async function DELETE(request: NextRequest) {
  try {
    const authUser = await getAuthUser(request);
    
    if (!authUser) {
      console.log('[integrations DELETE] Auth failed - no user found');
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    // Check if user has an accountId (superadmin doesn't have one)
    if (!authUser.accountId) {
      console.log('[integrations DELETE] User has no accountId:', authUser.email);
      return NextResponse.json({ 
        error: 'Superadmin não pode excluir integrações.',
        needsAccount: true,
      }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Integration ID is required' },
        { status: 400 }
      );
    }
    
    // Verificar se a integração pertence à conta do usuário
    const integration = await db.integration.findFirst({
      where: {
        id,
        accountId: authUser.accountId,
      }
    });

    if (!integration) {
      return NextResponse.json(
        { error: 'Integration not found' },
        { status: 404 }
      );
    }
    
    await db.integration.delete({
      where: { id }
    });
    
    return NextResponse.json({
      success: true,
      message: 'Integration disconnected successfully',
    });
  } catch (error) {
    console.error('Error deleting integration:', error);
    return NextResponse.json(
      { error: 'Failed to delete integration' },
      { status: 500 }
    );
  }
}
