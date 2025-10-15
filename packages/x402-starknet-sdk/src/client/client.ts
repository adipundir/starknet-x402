/**
 * x402 Client Utilities
 * These functions will eventually be part of the official SDK
 */

import type { PaymentPayload } from '../types/types';

export interface VerificationResult {
  isValid: boolean;
  invalidReason: string | null;
}

export interface SettlementResult {
  success: boolean;
  error: string | null;
  txHash: string | null;
  networkId: string | null;
}

/**
 * Decode and parse X-PAYMENT header
 */
export function decodePaymentHeader(paymentHeader: string): PaymentPayload | null {
  try {
    const decoded = Buffer.from(paymentHeader, 'base64').toString('utf8');
    const payload = JSON.parse(decoded);
    return payload;
  } catch (error) {
    console.error('Failed to decode payment header:', error);
    return null;
  }
}

/**
 * Validate payment payload structure
 */
export function validatePaymentPayload(payload: PaymentPayload | null): boolean {
  if (!payload) return false;
  
  return !!(
    payload.x402Version &&
    payload.scheme &&
    payload.network &&
    payload.payload?.from &&
    payload.payload?.to &&
    payload.payload?.token &&
    payload.payload?.amount &&
    payload.payload?.signature
  );
}

/**
 * Create settlement response header
 */
export function createSettlementResponseHeader(
  txHash: string,
  networkId: string
): string {
  const response = {
    txHash,
    network: networkId,
    timestamp: Date.now(),
  };
  
  return Buffer.from(JSON.stringify(response)).toString('base64');
}


