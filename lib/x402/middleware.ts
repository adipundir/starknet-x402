/**
 * x402 v2 Payment Middleware for Starknet
 *
 * Payment info flows through headers:
 *   PAYMENT-REQUIRED, PAYMENT-SIGNATURE, PAYMENT-RESPONSE
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

    if (!recipientAddress) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const simpleNetwork = routeConfig.network || 'sepolia';
    const network = simpleNetwork === 'mainnet'
      ? STARKNET_MAINNET
      : simpleNetwork === 'sepolia'
        ? STARKNET_SEPOLIA
        : `starknet-${simpleNetwork}`;

    const paymentRequirements: PaymentRequirements = {
      scheme: STARKNET_SCHEME,
      network,
      amount: routeConfig.price,
      payTo: recipientAddress,
      asset: routeConfig.tokenAddress,
      maxTimeoutSeconds: routeConfig.config?.maxTimeoutSeconds || 300,
    };

    const paymentHeader = getPaymentHeader(request.headers);

    // No payment → return 402
    if (!paymentHeader) {
      const response402: PaymentRequiredResponse = {
        x402Version: X402_VERSION,
        error: 'PAYMENT-SIGNATURE header is required',
        resource: {
          url: request.url,
          description: routeConfig.config?.description,
          mimeType: routeConfig.config?.mimeType,
        },
        accepts: [paymentRequirements],
      };

      const res = NextResponse.json(response402, { status: 402 });
      res.headers.set(PAYMENT_REQUIRED_HEADER, Buffer.from(JSON.stringify(response402)).toString('base64'));
      return res;
    }

    // Payment present → validate, verify, settle
    try {
      const paymentPayload = decodePaymentHeader(paymentHeader);
      if (!validatePaymentPayload(paymentPayload)) {
        return NextResponse.json({ error: 'Invalid payment payload' }, { status: 400 });
      }

      if (paymentPayload.accepted.scheme !== STARKNET_SCHEME) {
        return NextResponse.json({ error: 'Unsupported payment scheme' }, { status: 400 });
      }

      const facilitatorUrl = facilitatorConfig.url;

      // Verify
      const verifyRes = await fetch(`${facilitatorUrl}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ x402Version: X402_VERSION, paymentHeader, paymentRequirements }),
      });

      if (!verifyRes.ok) {
        return NextResponse.json(
          { error: 'Facilitator verification unavailable', message: `HTTP ${verifyRes.status}` },
          { status: 502 },
        );
      }

      const verification = await verifyRes.json() as VerifyResponse;
      if (!verification.isValid) {
        return NextResponse.json(
          { error: 'Payment verification failed', message: verification.invalidReason },
          { status: 402 },
        );
      }

      // Settle
      const settleRes = await fetch(`${facilitatorUrl}/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ x402Version: X402_VERSION, paymentHeader, paymentRequirements }),
      });

      if (!settleRes.ok) {
        return NextResponse.json(
          { error: 'Facilitator settlement unavailable', message: `HTTP ${settleRes.status}` },
          { status: 502 },
        );
      }

      const settlement = await settleRes.json() as SettleResponse;
      if (!settlement.success) {
        return NextResponse.json(
          { error: 'Payment settlement failed', message: settlement.errorReason },
          { status: 402 },
        );
      }

      // Payment settled → pass through
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
      console.error('[x402 middleware]', error instanceof Error ? error.message : String(error));
      return NextResponse.json(
        { error: 'Payment processing failed', message: error instanceof Error ? error.message : String(error) },
        { status: 500 },
      );
    }
  };
}
