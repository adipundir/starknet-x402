/**
 * x402 Axios Wrapper (SNIP-9 Outside Execution)
 *
 * Drop-in axios replacement that handles x402 payments automatically.
 * On 402: reads PAYMENT-REQUIRED → builds OutsideExecution via AVNU →
 * client signs → retries with PAYMENT-SIGNATURE.
 *
 * No ERC-20 approval needed.
 */

import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from 'axios';
import { Account } from 'starknet';
import type { PaymentRequirements, PaymentRequiredResponse } from './types';
import {
  PAYMENT_SIGNATURE_HEADER,
  PAYMENT_REQUIRED_HEADER,
  PAYMENT_RESPONSE_HEADER,
} from './types';
import { signPayment } from './client-payment';

export interface X402ClientConfig {
  network: 'starknet-sepolia' | 'starknet-mainnet';
  paymasterUrl?: string;
  paymasterApiKey?: string;
  onPaymentRequired?: (requirements: PaymentRequirements) => boolean | Promise<boolean>;
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

    const requirements = extractPaymentRequired(response);
    if (!requirements) return Promise.reject(new X402PaymentError('No payment requirements in 402 response', response));

    if (config.onPaymentRequired) {
      const approved = await config.onPaymentRequired(requirements);
      if (!approved) return Promise.reject(new X402PaymentError('Payment rejected by callback', response));
    }

    // Sign payment via AVNU paymaster (SNIP-9 OutsideExecution)
    const { paymentHeader } = await signPayment(account, {
      from: account.address,
      to: requirements.payTo,
      token: requirements.asset,
      amount: requirements.amount,
      network: config.network,
      paymasterUrl: config.paymasterUrl,
      paymasterApiKey: config.paymasterApiKey,
    });

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

function extractPaymentRequired(response: AxiosResponse): PaymentRequirements | null {
  // Try PAYMENT-REQUIRED header first
  const header = response.headers[PAYMENT_REQUIRED_HEADER.toLowerCase()];
  if (header) {
    try {
      const decoded: PaymentRequiredResponse = JSON.parse(Buffer.from(header, 'base64').toString('utf8'));
      if (decoded.accepts?.[0]) return decoded.accepts[0];
    } catch { /* fall through to body */ }
  }
  // Fallback: read from response body
  const body = response.data as PaymentRequiredResponse | undefined;
  return body?.accepts?.[0] ?? null;
}

export class X402PaymentError extends Error {
  constructor(message: string, public response: AxiosResponse) {
    super(message);
    this.name = 'X402PaymentError';
  }
}
