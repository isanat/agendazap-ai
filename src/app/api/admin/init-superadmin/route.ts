import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hash } from 'bcryptjs';

/**
 * Initialize SuperAdmin - Run this once to set up the system
 * This endpoint creates the superadmin if it doesn't exist
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[init-superadmin] Checking for existing superadmin...');

    // Check if any superadmin exists
    const existingSuperAdmin = await db.user.findFirst({
      where: { role: 'superadmin' }
    });

    if (existingSuperAdmin) {
      console.log('[init-superadmin] SuperAdmin exists:', {
        id: existingSuperAdmin.id,
        email: existingSuperAdmin.email,
        role: existingSuperAdmin.role,
        isActive: existingSuperAdmin.isActive,
        hasBcryptPassword: existingSuperAdmin.password.startsWith('$2')
      });

      // Check if password needs migration to bcrypt
      if (!existingSuperAdmin.password.startsWith('$2')) {
        console.log('[init-superadmin] Migrating password to bcrypt...');
        const hashedPassword = await hash('@!Isa46936698', 12);
        await db.user.update({
          where: { id: existingSuperAdmin.id },
          data: { password: hashedPassword }
        });
        console.log('[init-superadmin] Password migrated!');
      }

      return NextResponse.json({
        success: true,
        message: 'SuperAdmin already exists',
        superadmin: {
          id: existingSuperAdmin.id,
          email: existingSuperAdmin.email,
          name: existingSuperAdmin.name,
          role: existingSuperAdmin.role,
          isActive: existingSuperAdmin.isActive
        },
        action: 'none'
      });
    }

    // Create new superadmin
    console.log('[init-superadmin] Creating new superadmin...');

    const superAdminEmail = 'netlinkassist@gmail.com';
    const superAdminPassword = '@!Isa46936698';
    const superAdminName = 'Super Admin AgendaZap';

    const hashedPassword = await hash(superAdminPassword, 12);

    const superAdmin = await db.user.create({
      data: {
        email: superAdminEmail,
        password: hashedPassword,
        name: superAdminName,
        role: 'superadmin',
        isActive: true,
      }
    });

    console.log('[init-superadmin] SuperAdmin created:', superAdmin.id);

    // Create system configuration if needed
    let systemConfig = await db.systemConfiguration.findFirst();

    if (!systemConfig) {
      systemConfig = await db.systemConfiguration.create({
        data: {
          systemName: 'AgendaZap',
          platformFeePercent: 5,
          platformFeeFixed: 0.50,
        }
      });
      console.log('[init-superadmin] System configuration created');
    }

    return NextResponse.json({
      success: true,
      message: 'SuperAdmin created successfully',
      superadmin: {
        id: superAdmin.id,
        email: superAdmin.email,
        name: superAdmin.name,
        role: superAdmin.role,
        isActive: superAdmin.isActive
      },
      credentials: {
        email: superAdminEmail,
        password: superAdminPassword
      },
      action: 'created'
    });

  } catch (error) {
    console.error('[init-superadmin] Error:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to initialize superadmin',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

/**
 * GET - Check superadmin status
 */
export async function GET() {
  try {
    const superAdmin = await db.user.findFirst({
      where: { role: 'superadmin' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      }
    });

    return NextResponse.json({
      exists: !!superAdmin,
      superadmin: superAdmin
    });
  } catch (error) {
    console.error('[init-superadmin] Error:', error);
    return NextResponse.json({
      error: 'Failed to check superadmin status',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
