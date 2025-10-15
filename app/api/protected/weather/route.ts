/**
 * Protected Weather API Endpoint
 * Payment gatekeeping handled by middleware
 */

import { NextResponse } from 'next/server';

export async function GET() {
  // San Francisco weather data
  const weatherData = {
    location: {
      city: 'San Francisco',
      state: 'California',
      country: 'USA',
      coordinates: {
        lat: 37.7749,
        lon: -122.4194,
      },
    },
    current: {
      temperature: 62,
      feels_like: 60,
      humidity: 72,
      pressure: 1013,
      wind_speed: 12,
      wind_direction: 'W',
      conditions: 'Partly Cloudy',
      visibility: 10,
      uv_index: 5,
    },
    forecast: [
      { day: 'Today', high: 65, low: 55, conditions: 'Partly Cloudy', precipitation: 10 },
      { day: 'Tomorrow', high: 67, low: 56, conditions: 'Sunny', precipitation: 0 },
      { day: 'Wednesday', high: 64, low: 54, conditions: 'Foggy', precipitation: 5 },
    ],
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json({
    success: true,
    message: 'Weather data access granted',
    data: weatherData,
  });
}


