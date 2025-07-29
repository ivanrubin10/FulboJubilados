import { NextRequest, NextResponse } from 'next/server';
import { HybridStore } from '@/lib/hybrid-store';
import { Game } from '@/types';

export async function GET() {
  try {
    const games = await HybridStore.getGames();
    return NextResponse.json(games);
  } catch (error) {
    console.error('Error fetching games:', error);
    return NextResponse.json({ error: 'Failed to fetch games' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const games: Game[] = await request.json();
    await HybridStore.saveGames(games);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving games:', error);
    return NextResponse.json({ error: 'Failed to save games' }, { status: 500 });
  }
} 