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

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`[x402 Middleware] Request to: ${pathname}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

    // Check if this route is protected
    const routeConfig = routes[pathname];
    if (!routeConfig) {
      console.log(`[x402 Middleware] Route not protected, passing through`);
      return NextResponse.next();
    }

    console.log(`[x402 Middleware] ✅ Route is protected`);

    const paymentHeader = request.headers.get('X-PAYMENT');

    // Map simple network names to full Starknet network identifiers
    const simpleNetwork = routeConfig.network || 'sepolia';
    const network =
      simpleNetwork === 'mainnet'
        ? STARKNET_MAINNET
        : simpleNetwork === 'sepolia'
        ? STARKNET_SEPOLIA
        : `starknet-${simpleNetwork}`;

    const facilitatorUrl = facilitatorConfig.url;

    // Get token address from route config (required)
    const tokenAddress = routeConfig.tokenAddress;

    console.log(`[x402 Middleware] Configuration:`, {
      recipient: recipientAddress,
      price: routeConfig.price,
      network,
      token: tokenAddress,
      facilitator: facilitatorUrl,
      hasPayment: !!paymentHeader,
    });

    // Validate configuration
    if (!recipientAddress) {
      console.error(`[x402 Middleware] ❌ No recipient address configured`);
      return NextResponse.json(
        { error: 'Server configuration error: Payment recipient not configured' },
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

    // If no payment provided, return 402 with payment requirements per x402 spec
    if (!paymentHeader) {
      console.log(`[x402 Middleware] 💳 No payment header found, returning 402`);

      const response402: PaymentRequiredResponse = {
        x402Version: X402_VERSION,
        accepts: [paymentRequirements],
      };

      console.log(`[x402 Middleware] 402 Response (x402 spec):`, response402);
      return NextResponse.json(response402, { status: 402 });
    }

    console.log(
      `[x402 Middleware] 💰 Payment header found (${paymentHeader.length} chars)`
    );
    console.log(
      `[x402 Middleware] Payment preview: ${paymentHeader.substring(0, 50)}...`
    );

    try {
      // Parse the X-PAYMENT header (base64 encoded PaymentPayload)
      const paymentPayloadJson = Buffer.from(paymentHeader, 'base64').toString(
        'utf-8'
      );
      const paymentPayload: PaymentPayload = JSON.parse(paymentPayloadJson);

      console.log(`[x402 Middleware] Parsed payment payload:`, {
        x402Version: paymentPayload.x402Version,
        scheme: paymentPayload.payload,
        network: paymentPayload.network,
        from: paymentPayload.payload.from,
        to: paymentPayload.payload.to,
        amount: paymentPayload.payload.amount,
        token: paymentPayload.payload.token,
        hasSignature: !!paymentPayload.payload.signature,
        signatureR: paymentPayload.payload.signature?.r ? '✅' : '❌',
        signatureS: paymentPayload.payload.signature?.s ? '✅' : '❌',
      });

      // Validate payment payload format
      if (paymentPayload.x402Version !== X402_VERSION) {
        console.error(
          `[x402 Middleware] ❌ Unsupported x402 version: ${paymentPayload.x402Version}`
        );
        return NextResponse.json(
          { error: `Unsupported x402 version: ${paymentPayload.x402Version}` },
          { status: 400 }
        );
      }

      if (paymentPayload.scheme !== STARKNET_SCHEME) {
        console.error(
          `[x402 Middleware] ❌ Unsupported scheme: ${paymentPayload.scheme}`
        );
        return NextResponse.json(
          { error: `Unsupported payment scheme: ${paymentPayload.scheme}` },
          { status: 400 }
        );
      }

      // Step 1: Verify payment (fast, no blockchain submission)
      console.log(`\n🔍 [x402 Middleware] STEP 1: Verifying payment`);
      console.log(`[x402 Middleware] Calling: ${facilitatorUrl}/verify`);

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
      console.log(`[x402 Middleware] Verification result:`, verification);
      console.log(`[x402 Middleware] ⏱️  Verification took ${verificationTime}ms`);

      // Check if payment is valid
      if (!verification.isValid) {
        console.error(`❌ [x402 Middleware] Verification FAILED`);
        console.error(`[x402 Middleware] Reason:`, verification.invalidReason);
        return NextResponse.json(
          {
            error: 'Payment verification failed',
            message: verification.invalidReason,
          },
          { status: 403 }
        );
      }

      console.log(`✅ [x402 Middleware] Verification SUCCESS`);

      // Step 2: Settle payment BEFORE providing resource
      console.log(`\n💰 [x402 Middleware] STEP 2: Settling payment on Starknet`);
      console.log(`[x402 Middleware] Calling: ${facilitatorUrl}/settle`);

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
      console.log(`[x402 Middleware] Settlement result:`, settlement);
      console.log(`[x402 Middleware] ⏱️  Settlement took ${settlementTime}ms`);

      // Step 3: Only continue if payment settled successfully
      if (!settlement.success) {
        console.error(`\n❌ [x402 Middleware] Settlement FAILED`);
        console.error(`[x402 Middleware] Error:`, settlement.error);
        console.error(`[x402 Middleware] Returning HTTP 402 Payment Required`);
        
        const errorResponse = NextResponse.json(
          {
            error: 'Payment settlement failed',
            message: settlement.error,
            details: 'The payment signature was valid but the on-chain settlement transaction failed',
          },
          { status: 402 } // Payment required - settlement failed
        );
        
        console.error(`[x402 Middleware] Response status:`, errorResponse.status);
        return errorResponse;
      }

      console.log(`✅ [x402 Middleware] Settlement SUCCESS`);
      console.log(`[x402 Middleware] Transaction hash:`, settlement.txHash);
      console.log(
        `[x402 Middleware] Explorer: https://sepolia.voyager.online/tx/${settlement.txHash}`
      );

      // Step 4: Payment settled! Allow request to proceed
      console.log(`\n✅ [x402 Middleware] Payment complete, allowing request\n`);
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

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
      console.error(
        `[x402 Middleware] Error processing payment for ${pathname}:`,
        error
      );
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

