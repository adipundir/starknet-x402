/**
 * x402 v2 Client Utilities
 */

import type { PaymentPayload, VerifyResponse, SettleResponse } from '../types/types';
import { decodePaymentHeader, validatePaymentPayload, encodeSettlementResponseHeader } from '../types/types';

export type VerificationResult = VerifyResponse;
export type SettlementResult = SettleResponse;

export { decodePaymentHeader, validatePaymentPayload };

export function createSettlementResponseHeader(transaction: string, network: string, payer?: string, amount?: string): string {
  return encodeSettlementResponseHeader(transaction, network, payer, amount);
}
