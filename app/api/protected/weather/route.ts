/**
 * Protected Weather API Endpoint
 * Demonstrates the x402 payment protocol with San Francisco weather data
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // Check for X-PAYMENT header
  const paymentHeader = request.headers.get('X-PAYMENT');

  if (!paymentHeader) {
    // Return 402 Payment Required
    return NextResponse.json(
      {
        x402Version: 1,
        accepts: [
          {
            scheme: 'exact',
            network: 'starknet-sepolia',
            maxAmountRequired: '10000000000000000', // 0.01 ETH
            resource: path,
            description: 'San Francisco weather data access',
            mimeType: 'application/json',
            payTo: process.env.RESOURCE_SERVER_ADDRESS || '0xdemo',
            maxTimeoutSeconds: 300,
            asset: process.env.TOKEN_ADDRESS || '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
            extra: null,
          },
        ],
      },
      { status: 402 }
    );
  }

  // Payment provided - simulate successful payment
  // In production, verify with facilitator

  const mockTxHash = '0x' + Array.from({ length: 64 }, () =>
    Math.floor(Math.random() * 16).toString(16)
  ).join('');

  const settlementResponse = {
    txHash: mockTxHash,
    network: 'starknet-sepolia',
    timestamp: Date.now(),
  };

  const headers = new Headers();
  headers.set('X-PAYMENT-RESPONSE', Buffer.from(JSON.stringify(settlementResponse)).toString('base64'));
  headers.set('Content-Type', 'application/json');

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

  return NextResponse.json(
    {
      success: true,
      message: 'Weather data access granted',
      data: weatherData,
    },
    { headers }
  );
}


