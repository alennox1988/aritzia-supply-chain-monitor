import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

// Called by Vercel Cron 4x/day (or any free cron service hitting this endpoint)
export async function GET(request: NextRequest) {
  const secret = request.headers.get('x-cron-secret');
  const expectedSecret = process.env.CRON_SECRET;

  // Optional secret validation — skip if CRON_SECRET is not set
  if (expectedSecret && secret !== expectedSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    revalidatePath('/');
    revalidatePath('/api/weather');
    return NextResponse.json({ ok: true, revalidated: new Date().toISOString() });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
