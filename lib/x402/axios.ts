/**
 * x402 Axios Wrapper
 *
 * Drop-in axios replacement that handles x402 payments automatically.
 * On 402: reads PAYMENT-REQUIRED → signs payment → retries with PAYMENT-SIGNATURE.
 *
 * The client can discover facilitator capabilities (sponsorship, etc.)
 * via the facilitatorUrl returned in the 402 response.
 *
 * Usage:
 *   const client = createX402Client(account, { network: 'starknet-sepolia' });
 *   const { data } = await client.get('/api/protected/weather');
 */

import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { Account } from 'starknet';
import type { PaymentRequirements, PaymentRequiredResponse, SupportedResponse } from './types';
import {
  PAYMENT_SIGNATURE_HEADER,
  PAYMENT_REQUIRED_HEADER,
  PAYMENT_RESPONSE_HEADER,
} from './types';
import { signPayment } from './client-payment';

export interface X402ClientConfig {
  network: 'starknet-sepolia' | 'starknet-mainnet';
  /** Called before signing — return false to reject payment */
  onPaymentRequired?: (requirements: PaymentRequirements, sponsored: boolean) => boolean | Promise<boolean>;
  /** Called after successful settlement */
  onPaymentSettled?: (transaction: string, network: string) => void;
}

export interface X402AxiosInstance extends AxiosInstance {
  lastSettlement?: {
    transaction: string;
    network: string;
    payer?: string;
    amount?: string;
  };
}

// Cache facilitator sponsorship info by URL
const sponsorshipCache = new Map<string, boolean>();

async function isSponsored(facilitatorUrl: string): Promise<boolean> {
  if (sponsorshipCache.has(facilitatorUrl)) return sponsorshipCache.get(facilitatorUrl)!;

  try {
    const res = await fetch(`${facilitatorUrl}/supported`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      const data = await res.json() as SupportedResponse;
      const sponsored = data.kinds?.some(k => (k.extra as any)?.sponsored === true) ?? false;
      sponsorshipCache.set(facilitatorUrl, sponsored);
      return sponsored;
    }
  } catch { /* unreachable */ }

  sponsorshipCache.set(facilitatorUrl, false);
  return false;
}

export function createX402Client(
  account: Account,
  config: X402ClientConfig,
  axiosConfig?: AxiosRequestConfig,
): X402AxiosInstance {
  const client = axios.create({
    ...axiosConfig,
    validateStatus: (status) => (status >= 200 && status < 300) || status === 402,
  }) as X402AxiosInstance;

  client.interceptors.response.use(async (response: AxiosResponse) => {
    if (response.status !== 402) {
      readSettlement(client, response, config);
      return response;
    }

    // Extract requirements from 402
    const parsed = extractPaymentRequired(response);
    if (!parsed) {
      return Promise.reject(new X402PaymentError('No payment requirements in 402 response', response));
    }

    const { requirements, facilitatorUrl } = parsed;

    // Check sponsorship from facilitator if URL is available
    const sponsored = facilitatorUrl ? await isSponsored(facilitatorUrl) : false;

    // Ask caller before paying
    if (config.onPaymentRequired) {
      const approved = await config.onPaymentRequired(requirements, sponsored);
      if (!approved) {
        return Promise.reject(new X402PaymentError('Payment rejected by callback', response));
      }
    }

    // Sign payment
    const { paymentHeader } = await signPayment(account, {
      from: account.address,
      to: requirements.payTo,
      token: requirements.asset,
      amount: requirements.amount,
      network: config.network,
    });

    // Retry with PAYMENT-SIGNATURE
    const retryConfig: InternalAxiosRequestConfig = {
      ...response.config,
      headers: response.config.headers,
      validateStatus: (status) => status >= 200 && status < 300,
    };
    retryConfig.headers.set(PAYMENT_SIGNATURE_HEADER, paymentHeader);

    const paidResponse = await axios.request(retryConfig);
    readSettlement(client, paidResponse, config);
    return paidResponse;
  });

  return client;
}

function readSettlement(client: X402AxiosInstance, response: AxiosResponse, config: X402ClientConfig): void {
  const header = response.headers[PAYMENT_RESPONSE_HEADER.toLowerCase()];
  if (!header) return;
  try {
    client.lastSettlement = JSON.parse(Buffer.from(header, 'base64').toString('utf8'));
    if (client.lastSettlement && config.onPaymentSettled) {
      config.onPaymentSettled(client.lastSettlement.transaction, client.lastSettlement.network);
    }
  } catch (err) {
    console.error('[x402] Failed to parse PAYMENT-RESPONSE header:', err);
  }
}

function extractPaymentRequired(response: AxiosResponse): { requirements: PaymentRequirements; facilitatorUrl?: string } | null {
  // Try PAYMENT-REQUIRED header
  const prHeader = response.headers[PAYMENT_REQUIRED_HEADER.toLowerCase()];
  if (prHeader) {
    try {
      const decoded: PaymentRequiredResponse = JSON.parse(Buffer.from(prHeader, 'base64').toString('utf8'));
      const req = decoded.accepts?.[0];
      if (req) return { requirements: req, facilitatorUrl: decoded.facilitatorUrl };
    } catch { /* fall through */ }
  }

  // Fallback: body
  const body = response.data as PaymentRequiredResponse | undefined;
  const req = body?.accepts?.[0];
  if (req) return { requirements: req, facilitatorUrl: body?.facilitatorUrl };

  return null;
}

export class X402PaymentError extends Error {
  constructor(message: string, public response: AxiosResponse) {
    super(message);
    this.name = 'X402PaymentError';
  }
}
