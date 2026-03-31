/**
 * Facilitator Verification Logic (x402 v2 / SNIP-9)
 *
 * Shared between the verify and settle endpoints.
 * Validates that the signed OutsideExecution contains the correct
 * transfer call matching the payment requirements.
 */

import { RpcProvider, CallData, typedData, hash, num } from 'starknet';
import {
  type PaymentRequirements,
  type PaymentPayload,
  type VerifyResponse,
  decodePaymentHeader,
  validatePaymentPayload,
  getRequiredAmount,
  isValidStarknetAddress,
  parseU256,
} from '../types/x402';

const VALID_SIG = '0x56414c4944'; // 'VALID' as felt

function norm(addr: string): string {
  return num.toHex(addr).toLowerCase();
}

function invalid(reason: string, payer?: string): VerifyResponse {
  return { isValid: false, invalidReason: reason, payer };
}

export function decodeAndValidate(paymentHeader: string): { payload: PaymentPayload } | { error: VerifyResponse } {
  const payload = decodePaymentHeader(paymentHeader);
  if (!validatePaymentPayload(payload)) {
    return { error: invalid('invalid_payload: malformed payment header') };
  }
  return { payload };
}

export async function verifyPayment(
  paymentHeader: string,
  paymentRequirements: PaymentRequirements,
  provider: RpcProvider,
): Promise<VerifyResponse> {
  const decoded = decodeAndValidate(paymentHeader);
  if ('error' in decoded) return decoded.error;
  const { payload } = decoded;

  const inner = payload.payload;
  const { scheme, network } = payload.accepted;

  // Scheme & network
  if (scheme !== paymentRequirements.scheme) {
    return invalid(`invalid_scheme: expected ${paymentRequirements.scheme}, got ${scheme}`, inner.from);
  }
  if (network !== paymentRequirements.network) {
    return invalid(`invalid_network: expected ${paymentRequirements.network}, got ${network}`, inner.from);
  }

  // Addresses
  if (!isValidStarknetAddress(inner.from)) {
    return invalid('invalid_payload: bad sender address', inner.from);
  }
  if (norm(inner.to) !== norm(paymentRequirements.payTo)) {
    return invalid('invalid_recipient_mismatch', inner.from);
  }
  if (norm(inner.token) !== norm(paymentRequirements.asset)) {
    return invalid('invalid_token_mismatch', inner.from);
  }

  // Amount
  const paymentAmount = BigInt(inner.amount);
  const requiredAmount = getRequiredAmount(paymentRequirements);
  if (paymentAmount < requiredAmount) {
    return invalid(`invalid_amount: sent ${paymentAmount}, need ${requiredAmount}`, inner.from);
  }

  // OutsideExecution present
  if (!inner.outsideExecution?.typedData || !inner.outsideExecution?.signature?.length) {
    return invalid('invalid_payload: missing outsideExecution', inner.from);
  }

  const td = inner.outsideExecution.typedData;

  // Exactly 1 call — reject payloads that smuggle extra calls
  const calls = td?.message?.Calls;
  if (!calls || calls.length === 0) {
    return invalid('invalid_payload: no calls in OutsideExecution', inner.from);
  }
  if (calls.length > 1) {
    return invalid('invalid_payload: OutsideExecution must contain exactly 1 call', inner.from);
  }

  // Verify the call is token.transfer(recipient, amount)
  const call = calls[0];
  const transferSelector = num.toHex(hash.getSelectorFromName('transfer'));

  if (norm(call.To) !== norm(inner.token)) {
    return invalid('invalid_payload: call target does not match token', inner.from);
  }
  if (norm(call.Selector) !== norm(transferSelector)) {
    return invalid('invalid_payload: call is not a transfer', inner.from);
  }

  const calldata = call.Calldata;
  if (!calldata || calldata.length < 2) {
    return invalid('invalid_payload: missing transfer calldata', inner.from);
  }
  if (norm(calldata[0]) !== norm(inner.to)) {
    return invalid('invalid_payload: transfer recipient mismatch in call', inner.from);
  }

  const callAmountLow = BigInt(calldata[1]);
  const callAmountHigh = calldata.length >= 3 ? BigInt(calldata[2]) : 0n;
  const callAmount = callAmountLow + (callAmountHigh << 128n);
  if (callAmount < requiredAmount) {
    return invalid(`invalid_amount: transfer call amount ${callAmount} < required ${requiredAmount}`, inner.from);
  }

  // Deadline
  const executeBefore = Number(td.message?.['Execute Before']);
  if (executeBefore && executeBefore <= Math.floor(Date.now() / 1000)) {
    return invalid('invalid_deadline: OutsideExecution expired', inner.from);
  }

  // Signature verification via is_valid_signature
  try {
    const messageHash = typedData.getMessageHash(td, inner.from);
    const sigResult = await provider.callContract({
      contractAddress: inner.from,
      entrypoint: 'is_valid_signature',
      calldata: CallData.compile({
        hash: messageHash,
        signature: inner.outsideExecution.signature,
      }),
    });

    const isValid = sigResult[0] === VALID_SIG || BigInt(sigResult[0]) === BigInt(VALID_SIG);
    if (!isValid) {
      return invalid('invalid_signature', inner.from);
    }
  } catch {
    return invalid('invalid_signature: on-chain verification failed', inner.from);
  }

  // Balance check
  try {
    const balanceResult = await provider.callContract({
      contractAddress: inner.token,
      entrypoint: 'balanceOf',
      calldata: [inner.from],
    });
    const balance = parseU256(balanceResult);
    if (balance < paymentAmount) {
      return invalid(`insufficient_funds: balance ${balance}, need ${paymentAmount}`, inner.from);
    }
  } catch {
    return invalid('unexpected_verify_error: balance check failed', inner.from);
  }

  return { isValid: true, invalidReason: null, payer: inner.from };
}
