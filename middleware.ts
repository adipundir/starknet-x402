/**
 * Next.js Middleware Configuration
 * 
 * This file configures x402 payment protection for your API routes.
 * When publishing as npm package, users will create their own middleware.ts
 * and import paymentMiddleware from your package.
 */

import { paymentMiddleware } from './lib/x402/middleware';

/**
 * Configure protected routes and their payment requirements
 * 
 * Available tokens on Starknet Sepolia:
 * - STRK: 0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d (18 decimals)
 * - ETH:  0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7 (18 decimals)
 * - USDC: 0x053b40a647cedfca6ca84f542a0fe36736031905a9639a7f19a3c1e66bfd5080 (6 decimals)
 * 
 * See STARKNET_TOKENS.md for full list and mainnet addresses.
 */
export const middleware = paymentMiddleware(
  process.env.PAYMENT_RECIPIENT_ADDRESS!,
  {
    '/api/protected/weather': {
      price: '10000000000000000', // 0.01 STRK (18 decimals)
      tokenAddress: process.env.TOKEN_ADDRESS!,
      network: 'sepolia',
      config: {
        description: 'Access to San Francisco weather data API',
        mimeType: 'application/json',
        maxTimeoutSeconds: 300,
      },
    },
  },
  {
    // Facilitator URL - defaults to local facilitator
    url: process.env.FACILITATOR_URL || 'http://localhost:3000/api/facilitator',
  }
);

// Configure which paths the middleware should run on
export const config = {
  matcher: ['/api/protected/:path*'],
};

