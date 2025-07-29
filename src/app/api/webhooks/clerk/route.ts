import { NextRequest, NextResponse } from 'next/server';
import { WebhookEvent } from '@clerk/nextjs/server';
import { headers } from 'next/headers';
import { Webhook } from 'svix';
import { DatabaseService } from '@/lib/db/service';
import type { User } from '@/types';

export async function POST(req: NextRequest) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    throw new Error('Please add CLERK_WEBHOOK_SECRET from Clerk Dashboard to .env or .env.local');
  }

  const headerPayload = await headers();
  const svix_id = headerPayload.get('svix-id');
  const svix_timestamp = headerPayload.get('svix-timestamp');
  const svix_signature = headerPayload.get('svix-signature');

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occurred -- no svix headers', {
      status: 400,
    });
  }

  const payload = await req.json();
  const body = JSON.stringify(payload);

  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error('Error verifying webhook:', err);
    return new Response('Error occurred', {
      status: 400,
    });
  }

  const { id } = evt.data;
  const eventType = evt.type;

  console.log(`Received webhook event: ${eventType} for user: ${id}`);

  try {
    switch (eventType) {
      case 'user.created': {
        const clerkUser = evt.data;
        
        const newUser: Omit<User, 'createdAt'> = {
          id: clerkUser.id,
          email: clerkUser.email_addresses[0]?.email_address || '',
          name: `${clerkUser.first_name || ''} ${clerkUser.last_name || ''}`.trim() || clerkUser.username || 'Unknown',
          nickname: clerkUser.username || undefined,
          imageUrl: clerkUser.image_url || undefined,
          isAdmin: false,
          isWhitelisted: false,
        };

        await DatabaseService.addUser(newUser);
        console.log(`User ${clerkUser.id} created successfully in database`);
        
        return NextResponse.json({ 
          success: true, 
          message: 'User created successfully' 
        });
      }

      case 'user.updated': {
        const clerkUser = evt.data;
        
        // Get existing user to preserve admin/whitelist status
        const existingUser = await DatabaseService.getUserById(clerkUser.id);
        if (!existingUser) {
          console.log(`User ${clerkUser.id} not found in database for update`);
          return NextResponse.json({ 
            success: true, 
            message: 'User not found in database' 
          });
        }

        const updatedUser: User = {
          ...existingUser,
          email: clerkUser.email_addresses[0]?.email_address || existingUser.email,
          name: `${clerkUser.first_name || ''} ${clerkUser.last_name || ''}`.trim() || clerkUser.username || existingUser.name,
          nickname: clerkUser.username || existingUser.nickname,
          imageUrl: clerkUser.image_url || existingUser.imageUrl,
          updatedAt: new Date(),
        };

        await DatabaseService.updateUser(updatedUser);
        console.log(`User ${clerkUser.id} updated successfully in database`);
        
        return NextResponse.json({ 
          success: true, 
          message: 'User updated successfully' 
        });
      }

      case 'user.deleted': {
        const clerkUser = evt.data;
        
        if (!clerkUser.id) {
          console.error('No user ID provided in delete event');
          return NextResponse.json(
            { error: 'No user ID provided' },
            { status: 400 }
          );
        }

        await DatabaseService.deleteUser(clerkUser.id);
        console.log(`User ${clerkUser.id} deleted successfully from database`);
        
        return NextResponse.json({ 
          success: true, 
          message: 'User deleted successfully' 
        });
      }

      default:
        console.log(`Unhandled webhook event: ${eventType}`);
        return NextResponse.json({ success: true });
    }
  } catch (error) {
    console.error(`Error handling webhook event ${eventType}:`, error);
    return NextResponse.json(
      { error: `Failed to handle ${eventType} event` },
      { status: 500 }
    );
  }
}