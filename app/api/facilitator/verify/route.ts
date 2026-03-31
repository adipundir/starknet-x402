/**
 * Facilitator Verification Endpoint (x402 v2 / SNIP-9)
 *
 * Validates that the signed OutsideExecution contains the correct
 * transfer call matching the payment requirements.
 */

import { NextRequest, NextResponse } from 'next/server';
import { RpcProvider, CallData, typedData, hash, num } from 'starknet';
import {
  type PaymentRequirements,
  type VerifyResponse,
  decodePaymentHeader,
  validatePaymentPayload,
  getRequiredAmount,
  isValidStarknetAddress,
  parseU256,
} from '../../../../src/types/x402';

function fail(reason: string, payer?: string): NextResponse<VerifyResponse> {
  console.log(`[facilitator /verify] INVALID: ${reason}`);
  return NextResponse.json({ isValid: false, invalidReason: reason, payer });
}

export async function POST(request: NextRequest) {
  console.log('[facilitator /verify] Request received');

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

    // 1. Decode payload
    console.log('[facilitator /verify] Step 1: Decoding payload...');
    const payload = decodePaymentHeader(paymentHeader);
    if (!validatePaymentPayload(payload)) {
      return fail('invalid_payload: malformed payment header');
    }

    const inner = payload.payload;
    const { scheme, network } = payload.accepted;
    console.log(`[facilitator /verify] Payer: ${inner.from.slice(0, 16)}... | Token: ${inner.token.slice(0, 12)}... | Amount: ${inner.amount}`);

    // 2. Scheme & network
    console.log('[facilitator /verify] Step 2: Checking scheme & network...');
    if (scheme !== paymentRequirements.scheme) {
      return fail(`invalid_scheme: expected ${paymentRequirements.scheme}, got ${scheme}`, inner.from);
    }
    if (network !== paymentRequirements.network) {
      return fail(`invalid_network: expected ${paymentRequirements.network}, got ${network}`, inner.from);
    }

    // 3. Addresses
    console.log('[facilitator /verify] Step 3: Validating addresses...');
    if (!isValidStarknetAddress(inner.from)) {
      return fail('invalid_payload: bad sender address', inner.from);
    }
    const norm = (addr: string) => num.toHex(addr).toLowerCase();

    if (norm(inner.to) !== norm(paymentRequirements.payTo)) {
      return fail('invalid_recipient_mismatch', inner.from);
    }
    if (norm(inner.token) !== norm(paymentRequirements.asset)) {
      return fail('invalid_token_mismatch', inner.from);
    }

    // 4. Amount
    console.log('[facilitator /verify] Step 4: Checking amount...');
    const paymentAmount = BigInt(inner.amount);
    const requiredAmount = getRequiredAmount(paymentRequirements);
    if (paymentAmount < requiredAmount) {
      return fail(`invalid_amount: sent ${paymentAmount}, need ${requiredAmount}`, inner.from);
    }

    // 5. OutsideExecution present
    console.log('[facilitator /verify] Step 5: Checking OutsideExecution...');
    if (!inner.outsideExecution?.typedData || !inner.outsideExecution?.signature?.length) {
      return fail('invalid_payload: missing outsideExecution', inner.from);
    }

    const td = inner.outsideExecution.typedData;

    // 6. Verify the OutsideExecution contains the correct transfer call
    console.log('[facilitator /verify] Step 6: Verifying transfer call in OutsideExecution...');
    const calls = td?.message?.Calls;
    if (!calls || calls.length === 0) {
      return fail('invalid_payload: no calls in OutsideExecution', inner.from);
    }

    const call = calls[0];
    const transferSelector = num.toHex(hash.getSelectorFromName('transfer'));
    const normalize = (addr: string) => num.toHex(addr).toLowerCase();

    if (normalize(call.To) !== normalize(inner.token)) {
      return fail('invalid_payload: call target does not match token', inner.from);
    }
    if (normalize(call.Selector) !== normalize(transferSelector)) {
      return fail('invalid_payload: call is not a transfer', inner.from);
    }

    const calldata = call.Calldata;
    if (!calldata || calldata.length < 2) {
      return fail('invalid_payload: missing transfer calldata', inner.from);
    }

    if (normalize(calldata[0]) !== normalize(inner.to)) {
      return fail('invalid_payload: transfer recipient mismatch in call', inner.from);
    }

    const callAmountLow = BigInt(calldata[1]);
    const callAmountHigh = calldata.length >= 3 ? BigInt(calldata[2]) : 0n;
    const callAmount = callAmountLow + (callAmountHigh << 128n);
    if (callAmount < requiredAmount) {
      return fail(`invalid_amount: transfer call amount ${callAmount} < required ${requiredAmount}`, inner.from);
    }

    // 7. Deadline (execute_before)
    console.log('[facilitator /verify] Step 7: Checking deadline...');
    const executeBefore = Number(td.message?.['Execute Before']);
    if (executeBefore && executeBefore <= Math.floor(Date.now() / 1000)) {
      return fail('invalid_deadline: OutsideExecution expired', inner.from);
    }

    // 8. Signature verification via is_valid_signature
    console.log('[facilitator /verify] Step 8: Verifying signature on-chain...');
    const nodeUrl = process.env.STARKNET_NODE_URL || process.env.NEXT_PUBLIC_STARKNET_NODE_URL;
    if (!nodeUrl) return fail('unexpected_verify_error: no RPC URL configured', inner.from);

    const provider = new RpcProvider({ nodeUrl });

    try {
      const messageHash = typedData.getMessageHash(td, inner.from);
      console.log(`[facilitator /verify] Message hash: ${messageHash.slice(0, 20)}...`);

      const sigResult = await provider.callContract({
        contractAddress: inner.from,
        entrypoint: 'is_valid_signature',
        calldata: CallData.compile({
          hash: messageHash,
          signature: inner.outsideExecution.signature,
        }),
      });

      const VALID = '0x56414c4944';
      const isValid = sigResult[0] === VALID || BigInt(sigResult[0]) === BigInt(VALID);
      console.log(`[facilitator /verify] Signature result: ${isValid ? 'VALID' : 'INVALID'} (raw: ${sigResult[0]})`);
      if (!isValid) {
        return fail('invalid_signature', inner.from);
      }
    } catch (sigError) {
      console.error('[facilitator /verify] Signature verification error:', sigError instanceof Error ? sigError.message : sigError);
      return fail('invalid_signature: on-chain verification failed', inner.from);
    }

    // 9. Balance check
    console.log('[facilitator /verify] Step 9: Checking balance...');
    try {
      const balanceResult = await provider.callContract({
        contractAddress: inner.token,
        entrypoint: 'balanceOf',
        calldata: [inner.from],
      });
      const balance = parseU256(balanceResult);
      console.log(`[facilitator /verify] Balance: ${balance} | Required: ${paymentAmount}`);
      if (balance < paymentAmount) {
        return fail(`insufficient_funds: balance ${balance}, need ${paymentAmount}`, inner.from);
      }
    } catch (balError) {
      console.error('[facilitator /verify] Balance check failed:', balError instanceof Error ? balError.message : balError);
      return fail('unexpected_verify_error: balance check failed', inner.from);
    }

    console.log(`[facilitator /verify] VALID | Payer: ${inner.from.slice(0, 16)}...`);
    return NextResponse.json({ isValid: true, invalidReason: null, payer: inner.from } satisfies VerifyResponse);
  } catch (error) {
    console.error('[facilitator /verify] Unexpected error:', error);
    return NextResponse.json(
      { isValid: false, invalidReason: 'unexpected_verify_error', payer: undefined } satisfies VerifyResponse,
      { status: 500 },
    );
  }
}
