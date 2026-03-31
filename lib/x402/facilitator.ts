/**
 * x402 v2 Facilitator Client
 */

import {
  type VerifyResponse,
  type SettleResponse,
  type PaymentRequirements,
  X402_VERSION,
  decodePaymentHeader,
  validatePaymentPayload,
  buildSettleResponse,
} from './types';

export async function verifyPayment(
  paymentHeader: string,
  paymentRequirements: PaymentRequirements,
  facilitatorUrl?: string,
): Promise<VerifyResponse> {
  const baseUrl = facilitatorUrl || process.env.FACILITATOR_URL;
  if (!baseUrl) throw new Error('facilitatorUrl is required');

  const payload = decodePaymentHeader(paymentHeader);
  if (!validatePaymentPayload(payload)) {
    return { isValid: false, invalidReason: 'Invalid payment payload structure' };
  }

  try {
    const response = await fetch(`${baseUrl}/api/facilitator/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ x402Version: X402_VERSION, paymentHeader, paymentRequirements }),
    });

    if (!response.ok) {
      return { isValid: false, invalidReason: `Facilitator returned HTTP ${response.status}` };
    }

    return await response.json() as VerifyResponse;
  } catch (error) {
    console.error('[Facilitator client] Verification failed:', error);
    return { isValid: false, invalidReason: 'Failed to connect to facilitator' };
  }
}

export async function settlePayment(
  paymentHeader: string,
  paymentRequirements: PaymentRequirements,
  facilitatorUrl?: string,
): Promise<SettleResponse> {
  const baseUrl = facilitatorUrl || process.env.FACILITATOR_URL;
  if (!baseUrl) throw new Error('facilitatorUrl is required');

  try {
    const response = await fetch(`${baseUrl}/api/facilitator/settle`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ x402Version: X402_VERSION, paymentHeader, paymentRequirements }),
    });

    if (!response.ok) {
      return buildSettleResponse({ success: false, errorReason: `Facilitator returned HTTP ${response.status}` });
    }

    return await response.json() as SettleResponse;
  } catch (error) {
    console.error('[Facilitator client] Settlement failed:', error);
    return buildSettleResponse({ success: false, errorReason: 'Failed to connect to facilitator' });
  }
}
