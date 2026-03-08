import { NextResponse } from 'next/server';
import { fetchWeatherForAllLocations } from '@/lib/weather';

export const revalidate = 21600; // 6 hours

export async function GET() {
  try {
    const data = await fetchWeatherForAllLocations();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Weather fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch weather data' }, { status: 500 });
  }
}
