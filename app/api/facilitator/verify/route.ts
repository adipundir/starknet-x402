/**
 * Facilitator Verification Endpoint (x402 v2 / SNIP-9)
 */

import { NextRequest, NextResponse } from 'next/server';
import { RpcProvider } from 'starknet';
import type { PaymentRequirements, VerifyResponse } from '../../../../src/types/x402';
import { verifyPayment } from '../../../../src/facilitator/verify';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { x402Version, paymentHeader, paymentRequirements } = body as {
      x402Version: number;
      paymentHeader: string;
      paymentRequirements: PaymentRequirements;
    };

    if (!x402Version || !paymentHeader || !paymentRequirements) {
      return NextResponse.json(
        { isValid: false, invalidReason: 'missing required fields' } satisfies VerifyResponse,
      );
    }

    const nodeUrl = process.env.STARKNET_NODE_URL || process.env.NEXT_PUBLIC_STARKNET_NODE_URL;
    if (!nodeUrl) {
      return NextResponse.json(
        { isValid: false, invalidReason: 'STARKNET_NODE_URL not configured' } satisfies VerifyResponse,
        { status: 500 },
      );
    }

    const provider = new RpcProvider({ nodeUrl });
    const result = await verifyPayment(paymentHeader, paymentRequirements, provider);
    return NextResponse.json(result);
  } catch (error) {
    console.error('[facilitator /verify]', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { isValid: false, invalidReason: 'unexpected_verify_error' } satisfies VerifyResponse,
      { status: 500 },
    );
  }
}
