/**
 * Example: Express server with x402 payment middleware
 * 
 * This example shows how to protect API endpoints with x402 payments
 * using Express.js and the Starknet x402 SDK.
 * 
 * Installation:
 *   npm install @adipundir/starknet-x402 starknet express
 * 
 * Usage:
 *   ts-node examples/server/express-server-example.ts
 */

import express from 'express';
import type { RouteConfig } from '@adipundir/starknet-x402';

// For Next.js projects, use the paymentMiddleware
// For Express, you need to implement a similar middleware wrapper

const app = express();
const PORT = 3000;

// =====================================================
// Example 1: Manual payment checking
// =====================================================

app.get('/api/data', async (req, res) => {
  const paymentHeader = req.headers['x-payment'];
  
  if (!paymentHeader) {
    // No payment provided - return 402 Payment Required
    return res.status(402).json({
      error: 'Payment Required',
      accepts: [
        {
          scheme: 'exact',
          network: 'starknet-sepolia',
          asset: '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d', // STRK
          maxAmountRequired: '10000000000000000', // 0.01 STRK
          payTo: process.env.NEXT_PUBLIC_RECIPIENT_ADDRESS || '0x...',
        },
      ],
    });
  }
  
  // Payment provided - verify and settle
  // (In production, call facilitator endpoints)
  
  res.json({
    message: 'Here is your protected data!',
    data: { temperature: 72, humidity: 45 },
  });
});

// =====================================================
// Example 2: Route configuration
// =====================================================

const routes: RouteConfig = {
  '/api/weather': {
    amount: '10000000000000000', // 0.01 STRK
    token: '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
  },
  '/api/premium': {
    amount: '100000000000000000', // 0.1 STRK
    token: '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
  },
  '/api/ai-query': {
    amount: '50000000000000000', // 0.05 STRK
    token: '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
  },
};

// =====================================================
// Example 3: Protected endpoints
// =====================================================

app.get('/api/weather', (req, res) => {
  res.json({
    location: 'San Francisco',
    temperature: 68,
    conditions: 'Sunny',
    humidity: 60,
  });
});

app.get('/api/premium', (req, res) => {
  res.json({
    premium: true,
    data: 'This is premium content',
    features: ['Advanced analytics', 'Priority support', 'Custom reports'],
  });
});

app.post('/api/ai-query', express.json(), (req, res) => {
  const { query } = req.body;
  res.json({
    query,
    response: 'AI-generated response based on your query',
    tokens: 250,
  });
});

// =====================================================
// Start server
// =====================================================

app.listen(PORT, () => {
  console.log(`\n╔════════════════════════════════════════════════════╗`);
  console.log(`║   x402 Express Server Example                      ║`);
  console.log(`╚════════════════════════════════════════════════════╝\n`);
  console.log(`🚀 Server running on http://localhost:${PORT}\n`);
  console.log('Protected endpoints:');
  console.log('  GET  /api/weather  - 0.01 STRK');
  console.log('  GET  /api/premium  - 0.1 STRK');
  console.log('  POST /api/ai-query - 0.05 STRK\n');
  console.log('Note: For full payment protection in Express,');
  console.log('you need to implement middleware that calls the');
  console.log('facilitator verify and settle endpoints.\n');
  console.log('For Next.js projects, use the built-in middleware:');
  console.log('  import { paymentMiddleware } from "@adipundir/starknet-x402"\n');
});

/**
 * For Next.js projects, use this pattern instead:
 * 
 * // middleware.ts
 * import { paymentMiddleware } from '@adipundir/starknet-x402';
 * 
 * const recipientAddress = '0x...';
 * const routes = {
 *   '/api/weather': { amount: '10000000000000000', token: '0x...' },
 *   '/api/premium': { amount: '100000000000000000', token: '0x...' },
 * };
 * 
 * export default paymentMiddleware(recipientAddress, routes);
 * 
 * export const config = {
 *   matcher: ['/api/:path*'],
 * };
 */

