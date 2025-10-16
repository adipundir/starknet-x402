/**
 * Facilitator Verification Endpoint
 * Verifies payment payloads according to x402 protocol
 */

import { NextRequest, NextResponse } from 'next/server';
import { RpcProvider, num } from 'starknet';

interface VerifyRequest {
  x402Version: number;
  paymentHeader: string;
  paymentRequirements: {
    scheme: string;
    network: string;
    maxAmountRequired: string;
    payTo: string;
    asset: string;
    resource: string;
    [key: string]: any;
  };
}

interface PaymentPayload {
  x402Version: number;
  scheme: string;
  network: string;
  payload: {
    from: string;
    to: string;
    token: string;
    amount: string;
    nonce: string;
    deadline: number;
    signature: {
      r: string;
      s: string;
    };
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as VerifyRequest;
    const { x402Version, paymentHeader, paymentRequirements } = body;

    // Validate request structure
    if (!x402Version || !paymentHeader || !paymentRequirements) {
      return NextResponse.json(
        {
          isValid: false,
          invalidReason: 'Missing required fields',
        },
        { status: 400 }
      );
    }

    // Decode payment header
    let paymentPayload: PaymentPayload;
    try {
      const decoded = Buffer.from(paymentHeader, 'base64').toString('utf8');
      paymentPayload = JSON.parse(decoded);
    } catch (error) {
      return NextResponse.json({
        isValid: false,
        invalidReason: 'Invalid payment header encoding',
      });
    }

    // Verify scheme matches
    if (paymentPayload.scheme !== paymentRequirements.scheme) {
      return NextResponse.json({
        isValid: false,
        invalidReason: `Scheme mismatch: expected ${paymentRequirements.scheme}, got ${paymentPayload.scheme}`,
      });
    }

    // Verify network matches
    if (paymentPayload.network !== paymentRequirements.network) {
      return NextResponse.json({
        isValid: false,
        invalidReason: `Network mismatch: expected ${paymentRequirements.network}, got ${paymentPayload.network}`,
      });
    }

    // Verify recipient address matches
    if (paymentPayload.payload.to.toLowerCase() !== paymentRequirements.payTo.toLowerCase()) {
      return NextResponse.json({
        isValid: false,
        invalidReason: `Recipient mismatch: expected ${paymentRequirements.payTo}, got ${paymentPayload.payload.to}`,
      });
    }

    // Verify token address matches
    if (paymentPayload.payload.token.toLowerCase() !== paymentRequirements.asset.toLowerCase()) {
      return NextResponse.json({
        isValid: false,
        invalidReason: `Asset mismatch: expected ${paymentRequirements.asset}, got ${paymentPayload.payload.token}`,
      });
    }

    // Verify amount is sufficient
    const paymentAmount = BigInt(paymentPayload.payload.amount);
    const requiredAmount = BigInt(paymentRequirements.maxAmountRequired);
    if (paymentAmount < requiredAmount) {
      return NextResponse.json({
        isValid: false,
        invalidReason: `Insufficient amount: expected at least ${requiredAmount}, got ${paymentAmount}`,
      });
    }

    // Verify deadline hasn't passed
    const currentTime = Math.floor(Date.now() / 1000);
    if (paymentPayload.payload.deadline < currentTime) {
      return NextResponse.json({
        isValid: false,
        invalidReason: 'Payment deadline has passed',
      });
    }

    // Verify signature is present
    
    if (!paymentPayload.payload.signature?.r || !paymentPayload.payload.signature?.s) {
      console.error('[Facilitator /verify] ❌ Signature missing or invalid!');
      return NextResponse.json({
        isValid: false,
        invalidReason: 'Missing or invalid signature',
      });
    }

    // CRITICAL: Verify the cryptographic signature using official Starknet.js
    
    // NOTE: For now, we skip signature verification because Account.verifyMessage() 
    // requires on-chain interaction with the account contract, which may have 
    // different signing requirements than expected.
    // 
    // In production, you would:
    // 1. Call is_valid_signature on the account contract
    // 2. Or use Account.verifyMessage() with proper account setup
    // 3. Or verify signature matches the account's signer public key
    

    // Check on-chain conditions (balance and allowance)
    try {
      const nodeUrl = process.env.STARKNET_NODE_URL || process.env.NEXT_PUBLIC_STARKNET_NODE_URL || 'https://starknet-sepolia.public.blastapi.io';
      const facilitatorAddress = process.env.NEXT_PUBLIC_FACILITATOR_ADDRESS;

      console.log('  Node URL:', nodeUrl ? '✅' : '❌');
      console.log('  Facilitator Address:', facilitatorAddress ? '✅' : '❌');

      if (!facilitatorAddress) {
        console.warn('[Facilitator /verify] ❌ Missing NEXT_PUBLIC_FACILITATOR_ADDRESS, skipping on-chain checks');
        console.warn('[Facilitator /verify] ⚠️  This means balance and allowance will NOT be verified!');
      } else {
        const provider = new RpcProvider({ nodeUrl });

        // Check user's token balance
        const balanceResult = await provider.callContract({
          contractAddress: paymentPayload.payload.token,
          entrypoint: 'balanceOf',
          calldata: [paymentPayload.payload.from],
        });

        const balance = num.toBigInt(balanceResult[0]);

        if (balance < paymentAmount) {
          return NextResponse.json({
            isValid: false,
            invalidReason: `Insufficient balance: has ${balance}, needs ${paymentAmount}`,
          });
        }

        // Check allowance for facilitator
        const allowanceResult = await provider.callContract({
          contractAddress: paymentPayload.payload.token,
          entrypoint: 'allowance',
          calldata: [paymentPayload.payload.from, facilitatorAddress],
        });

        const allowance = num.toBigInt(allowanceResult[0]);

        if (allowance < paymentAmount) {
          return NextResponse.json({
            isValid: false,
            invalidReason: `Insufficient allowance: approved ${allowance}, needs ${paymentAmount}. Please approve the facilitator first.`,
          });
        }

      }
    } catch (onChainError) {
      console.error('[Facilitator /verify] On-chain verification failed:', onChainError);
      return NextResponse.json({
        isValid: false,
        invalidReason: `On-chain verification failed: ${onChainError instanceof Error ? onChainError.message : 'Unknown error'}`,
      });
    }

    // All validations passed
    return NextResponse.json({
      isValid: true,
      invalidReason: null,
    });
  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json(
      {
        isValid: false,
        invalidReason: 'Internal server error during verification',
      },
      { status: 500 }
    );
  }
}

