/**
 * Next.js Middleware Configuration
 * Configures x402 payment protection for API routes.
 */

import { paymentMiddleware } from './lib/x402/middleware';

export const middleware = paymentMiddleware(
  process.env.RECIPIENT_ADDRESS!,
  {
    '/api/protected/weather': {
      price: '10000', // 0.01 USDC (6 decimals)
      tokenAddress: process.env.TOKEN_ADDRESS!,
    },
  },
  {
    url: process.env.FACILITATOR_URL!,
  }
);

export const config = {
  matcher: ['/api/protected/:path*'],
};
