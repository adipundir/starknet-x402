/**
 * x402 Facilitator Client
 * Functions for interacting with facilitator endpoints
 * These will eventually be part of the official SDK
 */

import { VerificationResult, SettlementResult, validatePaymentPayload, decodePaymentHeader } from './client';

/**
 * Verify payment with facilitator
 */
export async function verifyPayment(
  paymentHeader: string,
  paymentRequirements: any,
  facilitatorUrl?: string
): Promise<VerificationResult> {
  // Use local facilitator by default, or external if configured
  const baseUrl = facilitatorUrl || process.env.FACILITATOR_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
  
  // First validate the payload structure
  const payload = decodePaymentHeader(paymentHeader);
  if (!validatePaymentPayload(payload)) {
    return {
      isValid: false,
      invalidReason: 'Invalid payment payload structure',
    };
  }

  try {
    const response = await fetch(`${baseUrl}/api/facilitator/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        x402Version: 1,
        paymentHeader,
        paymentRequirements,
      }),
    });

    const result = (await response.json()) as VerificationResult;
    return result;
  } catch (error) {
    console.error('Verification failed:', error);
    return {
      isValid: false,
      invalidReason: 'Failed to connect to facilitator',
    };
  }
}

/**
 * Settle payment via facilitator
 */
export async function settlePayment(
  paymentHeader: string,
  paymentRequirements: any,
  facilitatorUrl?: string
): Promise<SettlementResult> {
  // Use local facilitator by default, or external if configured
  const baseUrl = facilitatorUrl || process.env.FACILITATOR_URL || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

  try {
    const response = await fetch(`${baseUrl}/api/facilitator/settle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        x402Version: 1,
        paymentHeader,
        paymentRequirements,
      }),
    });

    const result = (await response.json()) as SettlementResult;
    return result;
  } catch (error) {
    console.error('Settlement failed:', error);
    return {
      success: false,
      error: 'Failed to settle payment',
      txHash: null,
      networkId: null,
    };
  }
}


