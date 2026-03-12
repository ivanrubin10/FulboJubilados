import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { DatabaseService } from '@/lib/db/service';

const BOT_USERS = [
  {
    id: 'bot_frn',
    email: 'frn_bot@bot.local',
    name: 'frn_bot',
    nickname: 'frn_bot',
    isAdmin: false,
    isWhitelisted: false,
    isBot: true,
  },
  {
    id: 'bot_johnathan',
    email: 'bot_johnathan@bot.local',
    name: 'bot johnathan',
    nickname: 'bot johnathan',
    isAdmin: false,
    isWhitelisted: false,
    isBot: true,
  },
];

export async function POST() {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await DatabaseService.getUserById(userId);
    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const results: { name: string; status: string }[] = [];

    for (const bot of BOT_USERS) {
      const existing = await DatabaseService.getUserById(bot.id);
      if (existing) {
        results.push({ name: bot.name, status: 'already exists' });
      } else {
        await DatabaseService.addUser({ ...bot, createdAt: new Date() });
        results.push({ name: bot.name, status: 'created' });
      }
    }

    return NextResponse.json({ success: true, bots: results });
  } catch (error) {
    console.error('Error seeding bots:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
