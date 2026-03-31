/**
 * x402 v2 Payment Middleware for Starknet
 *
 * Payment info flows through headers:
 *   PAYMENT-REQUIRED, PAYMENT-SIGNATURE, PAYMENT-RESPONSE
 *
 * The middleware only contacts the facilitator when a payment is present.
 * Sponsorship discovery is the client's responsibility via /supported.
 */

import { NextRequest, NextResponse } from 'next/server';
import type {
  RouteConfig,
  PaymentRequiredResponse,
  PaymentRequirements,
  VerifyResponse,
  SettleResponse,
} from './types';
import {
  X402_VERSION,
  STARKNET_SCHEME,
  STARKNET_SEPOLIA,
  STARKNET_MAINNET,
  PAYMENT_RESPONSE_HEADER,
  PAYMENT_REQUIRED_HEADER,
  getPaymentHeader,
  decodePaymentHeader,
  validatePaymentPayload,
  encodeSettlementResponseHeader,
  type FacilitatorUrlConfig,
} from './types';

export function paymentMiddleware(
  recipientAddress: string,
  routes: Record<string, RouteConfig>,
  facilitatorConfig: FacilitatorUrlConfig,
) {
  return async function middleware(request: NextRequest) {
    const pathname = request.nextUrl.pathname;
    const routeConfig = routes[pathname];

    if (!routeConfig) return NextResponse.next();

    console.log(`[x402 middleware] ${request.method} ${pathname}`);

    if (!recipientAddress) {
      console.error('[x402 middleware] No recipient configured');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const simpleNetwork = routeConfig.network || 'sepolia';
    const network = simpleNetwork === 'mainnet'
      ? STARKNET_MAINNET
      : simpleNetwork === 'sepolia'
        ? STARKNET_SEPOLIA
        : `starknet-${simpleNetwork}`;

    const description = routeConfig.config?.description || 'Access to protected resource';
    const mimeType = routeConfig.config?.mimeType || 'application/json';

    const paymentRequirements: PaymentRequirements = {
      scheme: STARKNET_SCHEME,
      network,
      amount: routeConfig.price,
      payTo: recipientAddress,
      asset: routeConfig.tokenAddress,
      maxTimeoutSeconds: routeConfig.config?.maxTimeoutSeconds || 300,
    };

    const paymentHeader = getPaymentHeader(request.headers);

    // No payment → return 402 immediately (no facilitator call)
    if (!paymentHeader) {
      console.log('[x402 middleware] No PAYMENT-SIGNATURE header, returning 402');
      const response402: PaymentRequiredResponse = {
        x402Version: X402_VERSION,
        error: 'PAYMENT-SIGNATURE header is required',
        resource: { url: request.url, description, mimeType },
        accepts: [paymentRequirements],
      };

      const encoded = Buffer.from(JSON.stringify(response402)).toString('base64');
      const res = NextResponse.json(response402, { status: 402 });
      res.headers.set(PAYMENT_REQUIRED_HEADER, encoded);
      return res;
    }

    console.log(`[x402 middleware] PAYMENT-SIGNATURE header found (${paymentHeader.length} chars)`);

    // Payment present → validate, then call facilitator
    try {
      const paymentPayload = decodePaymentHeader(paymentHeader);
      if (!validatePaymentPayload(paymentPayload)) {
        console.error('[x402 middleware] Invalid payment payload structure');
        return NextResponse.json({ error: 'Invalid payment payload' }, { status: 400 });
      }

      console.log(`[x402 middleware] Payload decoded | from: ${paymentPayload.payload.from.slice(0, 12)}... | amount: ${paymentPayload.payload.amount}`);

      if (paymentPayload.accepted.scheme !== STARKNET_SCHEME) {
        console.error(`[x402 middleware] Unsupported scheme: ${paymentPayload.accepted.scheme}`);
        return NextResponse.json({ error: 'Unsupported payment scheme' }, { status: 400 });
      }

      const facilitatorUrl = facilitatorConfig.url;

      // Verify
      console.log('[x402 middleware] Calling facilitator /verify...');
      const verifyStart = Date.now();
      const verifyRes = await fetch(`${facilitatorUrl}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ x402Version: X402_VERSION, paymentHeader, paymentRequirements }),
      });

      if (!verifyRes.ok) {
        console.error(`[x402 middleware] Facilitator /verify returned HTTP ${verifyRes.status}`);
        return NextResponse.json(
          { error: 'Facilitator verification unavailable', message: `HTTP ${verifyRes.status}` },
          { status: 502 },
        );
      }

      const verification = await verifyRes.json() as VerifyResponse;
      console.log(`[x402 middleware] Verification: ${verification.isValid ? 'VALID' : 'INVALID'} (${Date.now() - verifyStart}ms)${verification.isValid ? '' : ' | reason: ' + verification.invalidReason}`);

      if (!verification.isValid) {
        return NextResponse.json(
          { error: 'Payment verification failed', message: verification.invalidReason },
          { status: 402 },
        );
      }

      // Settle
      console.log('[x402 middleware] Calling facilitator /settle...');
      const settleStart = Date.now();
      const settleRes = await fetch(`${facilitatorUrl}/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ x402Version: X402_VERSION, paymentHeader, paymentRequirements }),
      });

      if (!settleRes.ok) {
        console.error(`[x402 middleware] Facilitator /settle returned HTTP ${settleRes.status}`);
        return NextResponse.json(
          { error: 'Facilitator settlement unavailable', message: `HTTP ${settleRes.status}` },
          { status: 502 },
        );
      }

      const settlement = await settleRes.json() as SettleResponse;
      console.log(`[x402 middleware] Settlement: ${settlement.success ? 'SUCCESS' : 'FAILED'} (${Date.now() - settleStart}ms)${settlement.success ? ' | tx: ' + settlement.transaction?.slice(0, 16) + '...' : ' | reason: ' + settlement.errorReason}`);

      if (!settlement.success) {
        return NextResponse.json(
          { error: 'Payment settlement failed', message: settlement.errorReason },
          { status: 402 },
        );
      }

      // Payment settled → allow request through
      console.log(`[x402 middleware] Payment complete, passing request through`);
      const response = NextResponse.next();
      response.headers.set(
        PAYMENT_RESPONSE_HEADER,
        encodeSettlementResponseHeader(
          settlement.transaction || '',
          settlement.network || network,
          settlement.payer,
          settlement.amount,
        ),
      );

      return response;
    } catch (error) {
      console.error('[x402 middleware] Error:', error instanceof Error ? error.message : String(error));
      return NextResponse.json(
        { error: 'Payment processing failed', message: error instanceof Error ? error.message : String(error) },
        { status: 500 },
      );
    }
  };
}
