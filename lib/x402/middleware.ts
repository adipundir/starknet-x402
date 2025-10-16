/**
 * x402 Payment Middleware for Starknet
 * Following official Coinbase x402 protocol specification
 * https://github.com/coinbase/x402
 */

import { NextRequest, NextResponse } from 'next/server';
import type {
  RouteConfig,
  FacilitatorConfig,
  PaymentRequiredResponse,
  PaymentRequirements,
  PaymentPayload,
  VerifyRequest,
  VerifyResponse,
  SettleRequest,
  SettleResponse,
} from './types';
import {
  X402_VERSION,
  STARKNET_SCHEME,
  STARKNET_SEPOLIA,
  STARKNET_MAINNET,
} from './types';

export function paymentMiddleware(
  recipientAddress: string,
  routes: Record<string, RouteConfig>,
  facilitatorConfig: FacilitatorConfig
) {
  return async function middleware(request: NextRequest) {
    const pathname = request.nextUrl.pathname;
    const routeConfig = routes[pathname];
    
    if (!routeConfig) {
      return NextResponse.next();
    }

    const paymentHeader = request.headers.get('X-PAYMENT');
    const simpleNetwork = routeConfig.network || 'sepolia';
    const network = simpleNetwork === 'mainnet' ? STARKNET_MAINNET : simpleNetwork === 'sepolia' ? STARKNET_SEPOLIA : `starknet-${simpleNetwork}`;
    const facilitatorUrl = facilitatorConfig.url;
    const tokenAddress = routeConfig.tokenAddress;

    if (!recipientAddress) {
      console.error('[x402] No recipient configured');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }

    // Build payment requirements per x402 spec
    const paymentRequirements: PaymentRequirements = {
      scheme: STARKNET_SCHEME,
      network: network,
      maxAmountRequired: routeConfig.price,
      resource: request.url,
      description:
        routeConfig.config?.description || 'Access to protected resource',
      mimeType: routeConfig.config?.mimeType || 'application/json',
      outputSchema: routeConfig.config?.outputSchema || null,
      payTo: recipientAddress,
      maxTimeoutSeconds: routeConfig.config?.maxTimeoutSeconds || 300,
      asset: tokenAddress,
      extra: null,
    };

    // If no payment provided, return 402 with payment requirements
    if (!paymentHeader) {
      const response402: PaymentRequiredResponse = {
        x402Version: X402_VERSION,
        accepts: [paymentRequirements],
      };
      return NextResponse.json(response402, { status: 402 });
    }

    try {
      const paymentPayloadJson = Buffer.from(paymentHeader, 'base64').toString('utf-8');
      const paymentPayload: PaymentPayload = JSON.parse(paymentPayloadJson);

      if (paymentPayload.x402Version !== X402_VERSION) {
        return NextResponse.json(
          { error: `Unsupported x402 version` },
          { status: 400 }
        );
      }

      if (paymentPayload.scheme !== STARKNET_SCHEME) {
        return NextResponse.json(
          { error: `Unsupported payment scheme` },
          { status: 400 }
        );
      }

      console.log('[x402] Verifying payment...');

      const verifyRequest: VerifyRequest = {
        x402Version: X402_VERSION,
        paymentHeader: paymentHeader,
        paymentRequirements: paymentRequirements,
      };

      const verifyStartTime = Date.now();
      const verifyResponse = await fetch(`${facilitatorUrl}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(verifyRequest),
      });

      const verification: VerifyResponse = await verifyResponse.json();
      const verificationTime = Date.now() - verifyStartTime;

      if (!verification.isValid) {
        console.error('[x402] Verification failed:', verification.invalidReason);
        return NextResponse.json(
          {
            error: 'Payment verification failed',
            message: verification.invalidReason,
          },
          { status: 403 }
        );
      }

      console.log('[x402] Settling payment...');

      const settleRequest: SettleRequest = {
        x402Version: X402_VERSION,
        paymentHeader: paymentHeader,
        paymentRequirements: paymentRequirements,
      };

      const settleStartTime = Date.now();
      const settleResponse = await fetch(`${facilitatorUrl}/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settleRequest),
      });

      const settlement: SettleResponse = await settleResponse.json();
      const settlementTime = Date.now() - settleStartTime;

      if (!settlement.success) {
        console.error('[x402] Settlement failed:', settlement.error);
        return NextResponse.json(
          {
            error: 'Payment settlement failed',
            message: settlement.error,
          },
          { status: 402 }
        );
      }

      console.log('[x402] ✅ Payment complete | Tx:', settlement.txHash?.slice(0, 10) + '...');

      const response = NextResponse.next();

      // Step 5: Add X-PAYMENT-RESPONSE header per x402 spec
      const paymentResponse = {
        txHash: settlement.txHash,
        network: settlement.networkId,
        timestamp: Date.now(),
      };
      response.headers.set(
        'X-Payment-Response',
        Buffer.from(JSON.stringify(paymentResponse)).toString('base64')
      );

      // Add timing headers for client debugging
      response.headers.set('X-Verification-Time', verificationTime.toString());
      response.headers.set('X-Settlement-Time', settlementTime.toString());

      return response;
    } catch (error) {
      console.error('[x402] Error:', error instanceof Error ? error.message : String(error));
      return NextResponse.json(
        {
          error: 'Payment processing failed',
          message: error instanceof Error ? error.message : String(error),
        },
        { status: 500 }
      );
    }
  };
}

