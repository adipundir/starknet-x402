/**
 * Next.js Middleware Configuration
 * This file configures x402 payment protection for your API routes.
 */

import { paymentMiddleware } from './lib/x402/middleware';

// x402 middleware ready
console.log('🔧 x402 middleware initialized');

export const middleware = paymentMiddleware(
  // Recipient address (where payments are sent) 
  process.env.RECIPIENT_ADDRESS!,
  
  // Route configuration
  {
    '/api/protected/weather': {
      price: '10000000000000000', // 0.01 STRK (18 decimals)
      tokenAddress: process.env.TOKEN_ADDRESS!, 
    },
  },
  
  // Facilitator configuration
  {
    url: process.env.FACILITATOR_URL!,
  }
);

// Configure which paths the middleware should run on
export const config = {
  matcher: ['/api/protected/:path*'],
};

