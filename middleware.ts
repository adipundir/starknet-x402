/**
 * Next.js Middleware Configuration
 * This file configures x402 payment protection for your API routes.
 */

import { paymentMiddleware } from './lib/x402/middleware';

// Recipient address (where payments are sent)
const recipientAddress = process.env.NEXT_PUBLIC_RECIPIENT_ADDRESS || 
                        '0x04ad015c7b45761cef82152303d133bbf2fd9b033e2ffa2af5ac76982d72b479';

// Token address (STRK on Sepolia)
const tokenAddress = process.env.NEXT_PUBLIC_TOKEN_ADDRESS || 
                     '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d';

// Route configuration
const routes = {
  '/api/protected/weather': {
    amount: '10000000000000000', // 0.01 STRK (18 decimals)
    token: tokenAddress,
  },
};

// Facilitator configuration
const facilitatorConfig = {
  verifyEndpoint: '/api/facilitator/verify',
  settleEndpoint: '/api/facilitator/settle',
};

export const middleware = paymentMiddleware(
  recipientAddress,
  routes,
  facilitatorConfig
);

// Configure which paths the middleware should run on
export const config = {
  matcher: ['/api/protected/:path*'],
};

