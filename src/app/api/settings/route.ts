import { NextRequest, NextResponse } from 'next/server';
import { HybridStore } from '@/lib/hybrid-store';

export async function GET() {
  try {
    const activeMonth = await HybridStore.getCurrentActiveMonth();
    return NextResponse.json(activeMonth);
  } catch (error) {
    console.error('Error fetching current active month:', error);
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { month, year } = await request.json();
    await HybridStore.setCurrentActiveMonth(month, year);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error setting active month:', error);
    return NextResponse.json({ error: 'Failed to set active month' }, { status: 500 });
  }
} 