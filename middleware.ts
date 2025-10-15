/**
 * Next.js Middleware Configuration
 * This file configures x402 payment protection for your API routes.
 */

import { paymentMiddleware } from './lib/x402/middleware';

// Log configuration on startup
console.log('\n🔧 [Middleware] Configuration:');
console.log('   RECIPIENT_ADDRESS:', process.env.RECIPIENT_ADDRESS ? `✅ ${process.env.RECIPIENT_ADDRESS}` : `❌ ${process.env.RECIPIENT_ADDRESS}`);
console.log('   TOKEN_ADDRESS:', process.env.TOKEN_ADDRESS ? `✅ ${process.env.TOKEN_ADDRESS}` : `❌ ${process.env.TOKEN_ADDRESS}`);
console.log('   FACILITATOR_URL:', process.env.FACILITATOR_URL ? `✅ ${process.env.FACILITATOR_URL}` : `❌ ${process.env.FACILITATOR_URL}`);
console.log('   NEXT_PUBLIC_SITE_URL:', process.env.NEXT_PUBLIC_SITE_URL ? `✅ ${process.env.NEXT_PUBLIC_SITE_URL}` : `❌ ${process.env.NEXT_PUBLIC_SITE_URL}`);
console.log('   Price: 10000000000000000 Wei (0.01 STRK)');
console.log('   Protected route: /api/protected/weather');
console.log('');

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

