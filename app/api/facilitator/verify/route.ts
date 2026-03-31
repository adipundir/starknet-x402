/**
 * Facilitator Verification Endpoint (x402 v2)
 *
 * Validates payment payloads without executing on-chain.
 * Checks: decode → structure → field matching → deadline →
 * nonce → signature → balance → allowance.
 */

import { NextRequest, NextResponse } from 'next/server';
import { RpcProvider, CallData, typedData } from 'starknet';
import {
  type PaymentRequirements,
  type VerifyResponse,
  decodePaymentHeader,
  validatePaymentPayload,
  getRequiredAmount,
  isValidStarknetAddress,
  parseU256,
} from '../../../../src/types/x402';
import { buildPaymentTypedData } from '../../../../src/types/typed-data';
import { isNonceFresh } from '../../../../src/facilitator/nonce-tracker';

function fail(reason: string, payer?: string): NextResponse<VerifyResponse> {
  return NextResponse.json({ isValid: false, invalidReason: reason, payer });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { x402Version, paymentHeader, paymentRequirements } = body as {
      x402Version: number;
      paymentHeader: string;
      paymentRequirements: PaymentRequirements;
    };

    if (!x402Version || !paymentHeader || !paymentRequirements) {
      return fail('invalid_payment_requirements: missing required fields');
    }

    // 1. Decode
    const payload = decodePaymentHeader(paymentHeader);
    if (!validatePaymentPayload(payload)) {
      return fail('invalid_payload: malformed payment header');
    }

    const inner = payload.payload;
    const { scheme, network } = payload.accepted;

    // 2. Scheme & network
    if (scheme !== paymentRequirements.scheme) {
      return fail(`invalid_scheme: expected ${paymentRequirements.scheme}, got ${scheme}`, inner.from);
    }
    if (network !== paymentRequirements.network) {
      return fail(`invalid_network: expected ${paymentRequirements.network}, got ${network}`, inner.from);
    }

    // 3. Addresses
    if (!isValidStarknetAddress(inner.from)) {
      return fail('invalid_payload: bad sender address', inner.from);
    }
    if (inner.to.toLowerCase() !== paymentRequirements.payTo.toLowerCase()) {
      return fail('invalid_recipient_mismatch', inner.from);
    }
    if (inner.token.toLowerCase() !== paymentRequirements.asset.toLowerCase()) {
      return fail('invalid_token_mismatch', inner.from);
    }

    // 4. Amount
    const paymentAmount = BigInt(inner.amount);
    const requiredAmount = getRequiredAmount(paymentRequirements);
    if (paymentAmount < requiredAmount) {
      return fail(`invalid_amount: sent ${paymentAmount}, need ${requiredAmount}`, inner.from);
    }

    // 5. Deadline
    const now = Math.floor(Date.now() / 1000);
    if (inner.deadline <= now) {
      return fail('invalid_deadline: expired', inner.from);
    }

    // 6. Nonce freshness
    if (!isNonceFresh(inner.nonce)) {
      return fail('invalid_transaction_state: nonce already used', inner.from);
    }

    // 7. Signature presence
    if (!inner.signature?.r || !inner.signature?.s) {
      return fail('invalid_signature: missing', inner.from);
    }

    // 8. Cryptographic signature verification via is_valid_signature
    const nodeUrl = process.env.STARKNET_NODE_URL
      || process.env.NEXT_PUBLIC_STARKNET_NODE_URL;
    if (!nodeUrl) return fail('unexpected_verify_error: no RPC URL configured', inner.from);

    const provider = new RpcProvider({ nodeUrl });

    try {
      const td = buildPaymentTypedData(inner, network);
      const messageHash = typedData.getMessageHash(td, inner.from);

      const sigResult = await provider.callContract({
        contractAddress: inner.from,
        entrypoint: 'is_valid_signature',
        calldata: CallData.compile({
          hash: messageHash,
          signature: [inner.signature.r, inner.signature.s],
        }),
      });

      const VALID = '0x56414c4944';
      const isValid = sigResult[0] === VALID || BigInt(sigResult[0]) === BigInt(VALID);
      if (!isValid) {
        return fail('invalid_signature: verification failed', inner.from);
      }
    } catch (sigError) {
      console.error('[Facilitator /verify] Signature verification error:', sigError instanceof Error ? sigError.message : sigError);
      return fail('invalid_signature: on-chain verification failed', inner.from);
    }

    // 9. On-chain balance & allowance
    const facilitatorAddress = process.env.NEXT_PUBLIC_FACILITATOR_ADDRESS;
    if (!facilitatorAddress) {
      console.warn('[Facilitator /verify] No FACILITATOR_ADDRESS — skipping balance/allowance checks');
    } else {
      try {
        const balanceResult = await provider.callContract({
          contractAddress: inner.token,
          entrypoint: 'balanceOf',
          calldata: [inner.from],
        });
        const balance = parseU256(balanceResult);
        if (balance < paymentAmount) {
          return fail(`insufficient_funds: balance ${balance}, need ${paymentAmount}`, inner.from);
        }

        const allowanceResult = await provider.callContract({
          contractAddress: inner.token,
          entrypoint: 'allowance',
          calldata: [inner.from, facilitatorAddress],
        });
        const allowance = parseU256(allowanceResult);
        if (allowance < paymentAmount) {
          return fail(`insufficient_funds: allowance ${allowance}, need ${paymentAmount}. Approve the facilitator first.`, inner.from);
        }
      } catch (onChainError) {
        console.error('[Facilitator /verify] On-chain check failed:', onChainError instanceof Error ? onChainError.message : onChainError);
        return fail('unexpected_verify_error: on-chain checks failed', inner.from);
      }
    }

    return NextResponse.json({ isValid: true, invalidReason: null, payer: inner.from } satisfies VerifyResponse);
  } catch (error) {
    console.error('[Facilitator /verify] Unexpected error:', error);
    return NextResponse.json(
      { isValid: false, invalidReason: 'unexpected_verify_error', payer: undefined } satisfies VerifyResponse,
      { status: 500 },
    );
  }
}
