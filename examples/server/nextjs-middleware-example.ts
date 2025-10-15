/**
 * Example: Next.js middleware with x402 payments
 * 
 * This is the simplest way to add payment protection to your Next.js API routes.
 * Just one line of code!
 * 
 * Installation:
 *   npm install @adipundir/starknet-x402 starknet next
 * 
 * Usage:
 *   1. Create this file as middleware.ts in your Next.js project root
 *   2. Configure your routes and amounts
 *   3. Deploy and start accepting payments!
 */

import { paymentMiddleware } from '@adipundir/starknet-x402';

// =====================================================
// Configuration
// =====================================================

// Your Starknet address where payments will be sent
const RECIPIENT_ADDRESS = process.env.NEXT_PUBLIC_RECIPIENT_ADDRESS || '0x04ad015c7b45761cef82152303d133bbf2fd9b033e2ffa2af5ac76982d72b479';

// STRK token address on Starknet Sepolia
const STRK_TOKEN = '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d';

// Define which routes require payment and how much
const routes = {
  // API endpoints
  '/api/weather': {
    amount: '10000000000000000', // 0.01 STRK
    token: STRK_TOKEN,
  },
  '/api/premium': {
    amount: '100000000000000000', // 0.1 STRK
    token: STRK_TOKEN,
  },
  '/api/ai-query': {
    amount: '50000000000000000', // 0.05 STRK
    token: STRK_TOKEN,
  },
  
  // You can protect any route
  '/api/data/*': {
    amount: '10000000000000000', // 0.01 STRK per endpoint
    token: STRK_TOKEN,
  },
};

// Facilitator configuration (optional)
const facilitatorConfig = {
  verifyEndpoint: process.env.FACILITATOR_VERIFY_URL || '/api/facilitator/verify',
  settleEndpoint: process.env.FACILITATOR_SETTLE_URL || '/api/facilitator/settle',
};

// =====================================================
// One line to protect all your routes! 🎉
// =====================================================

export default paymentMiddleware(RECIPIENT_ADDRESS, routes, facilitatorConfig);

// =====================================================
// Middleware configuration
// =====================================================

export const config = {
  // Apply middleware to all API routes
  matcher: ['/api/:path*'],
  
  // Or be more specific:
  // matcher: ['/api/weather', '/api/premium', '/api/ai-query'],
};

/**
 * That's it! Your API routes are now protected with x402 payments.
 * 
 * What happens automatically:
 * 1. Requests without payment get 402 Payment Required
 * 2. Requests with payment are verified (signature, balance, etc.)
 * 3. Payments are settled on-chain
 * 4. Valid requests proceed to your API route
 * 5. Response includes settlement details
 * 
 * Example API route (pages/api/weather.ts):
 * 
 * export default function handler(req, res) {
 *   res.json({
 *     temperature: 72,
 *     conditions: 'Sunny',
 *   });
 * }
 * 
 * The middleware handles all payment logic automatically!
 */

// =====================================================
// Advanced: Custom amount calculation
// =====================================================

/**
 * For dynamic pricing, you can use a function:
 * 
 * const routes = {
 *   '/api/ai-query': async (req) => {
 *     const { query } = await req.json();
 *     const tokenCount = estimateTokens(query);
 *     return {
 *       amount: String(tokenCount * 1000000000000000), // 0.001 STRK per token
 *       token: STRK_TOKEN,
 *     };
 *   },
 * };
 */

// =====================================================
// Advanced: Multiple tokens
// =====================================================

/**
 * Accept different tokens for different routes:
 * 
 * const ETH_TOKEN = '0x...';
 * const USDC_TOKEN = '0x...';
 * 
 * const routes = {
 *   '/api/eth-only': {
 *     amount: '1000000000000000', // 0.001 ETH
 *     token: ETH_TOKEN,
 *   },
 *   '/api/usdc-only': {
 *     amount: '10000', // 0.01 USDC (6 decimals)
 *     token: USDC_TOKEN,
 *   },
 * };
 */

// =====================================================
// Testing locally
// =====================================================

/**
 * 1. Start your Next.js dev server:
 *    npm run dev
 * 
 * 2. Test with curl (should get 402):
 *    curl http://localhost:3000/api/weather
 * 
 * 3. Test with payment:
 *    Use the client example to make a paid request
 * 
 * 4. Check the console for payment flow logs
 */

