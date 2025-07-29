import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db/connection';
import { auth } from '@clerk/nextjs/server';
import { DatabaseService } from '@/lib/db/service';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const user = await DatabaseService.getUserById(userId);
    if (!user || !user.isAdmin) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    // Create the new tables using raw SQL
    await db.execute(`
      CREATE TABLE IF NOT EXISTS "games" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "date" timestamp NOT NULL,
        "status" text DEFAULT 'scheduled' NOT NULL CHECK ("status" IN ('scheduled', 'confirmed', 'completed', 'cancelled')),
        "participants" jsonb DEFAULT '[]' NOT NULL,
        "teams" jsonb,
        "result" jsonb,
        "reservation_info" jsonb,
        "admin_notification_sent" boolean DEFAULT false NOT NULL,
        "admin_notification_timeout" timestamp,
        "custom_time" text,
        "calendar_event_id" text,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `);

    // Add missing columns to existing games table (migration)
    try {
      await db.execute(`
        ALTER TABLE "games" 
        ADD COLUMN IF NOT EXISTS "admin_notification_sent" boolean DEFAULT false NOT NULL;
      `);
      
      await db.execute(`
        ALTER TABLE "games" 
        ADD COLUMN IF NOT EXISTS "admin_notification_timeout" timestamp;
      `);
      
      await db.execute(`
        ALTER TABLE "games" 
        ADD COLUMN IF NOT EXISTS "custom_time" text;
      `);
      
      await db.execute(`
        ALTER TABLE "games" 
        ADD COLUMN IF NOT EXISTS "calendar_event_id" text;
      `);
      
      console.log('✅ Successfully migrated games table with notification columns');
    } catch (migrationError) {
      console.log('Note: Migration might have failed, but table should still work:', migrationError);
    }

    await db.execute(`
      CREATE TABLE IF NOT EXISTS "admin_notifications" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "type" text NOT NULL CHECK ("type" IN ('match_ready', 'voting_reminder')),
        "game_id" uuid REFERENCES "games"("id") ON DELETE CASCADE,
        "month" integer,
        "year" integer,
        "message" text NOT NULL,
        "is_read" boolean DEFAULT false NOT NULL,
        "action_required" boolean DEFAULT true NOT NULL,
        "created_at" timestamp DEFAULT now() NOT NULL,
        "updated_at" timestamp DEFAULT now() NOT NULL
      );
    `);

    return NextResponse.json({ 
      success: true, 
      message: 'Database tables created successfully' 
    });
  } catch (error: unknown) {
    console.error('Error setting up database:', error);
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}