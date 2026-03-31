/**
 * x402 Axios Wrapper (SNIP-9 Outside Execution)
 *
 * Usage:
 *   import { x402axios } from 'starknet-x402';
 *
 *   const result = await x402axios.get('https://api.example.com/data', {
 *     account,
 *     network: 'starknet-sepolia',
 *   });
 *   console.log(result.data);
 */

import axios, { type AxiosRequestConfig, type AxiosResponse } from 'axios';
import { Account } from 'starknet';
import type { PaymentRequirements, PaymentRequiredResponse } from './types';
import {
  PAYMENT_SIGNATURE_HEADER,
  PAYMENT_REQUIRED_HEADER,
  PAYMENT_RESPONSE_HEADER,
} from './types';
import { signPayment } from './client-payment';

export interface X402RequestConfig extends AxiosRequestConfig {
  account: Account;
  network: 'starknet-sepolia' | 'starknet-mainnet';
  paymasterUrl?: string;
  paymasterApiKey?: string;
}

export interface X402Response<T = any> extends AxiosResponse<T> {
  settlement?: {
    transaction: string;
    network: string;
    payer?: string;
    amount?: string;
  };
}

async function request<T = any>(method: string, url: string, config: X402RequestConfig): Promise<X402Response<T>> {
  const { account, network, paymasterUrl, paymasterApiKey, ...axiosConfig } = config;

  // First request
  const res = await axios({
    ...axiosConfig,
    method,
    url,
    validateStatus: (status) => (status >= 200 && status < 300) || status === 402,
  });

  // Not 402 — return as-is
  if (res.status !== 402) {
    return { ...res, settlement: parseSettlement(res) };
  }

  // Extract payment requirements
  const requirements = extractPaymentRequired(res);
  if (!requirements) {
    throw new X402PaymentError('No payment requirements in 402 response', res);
  }

  // Sign via AVNU paymaster
  const { paymentHeader } = await signPayment(account, {
    from: account.address,
    to: requirements.payTo,
    token: requirements.asset,
    amount: requirements.amount,
    network,
    paymasterUrl,
    paymasterApiKey,
  });

  // Retry with payment
  const paidRes = await axios({
    ...axiosConfig,
    method,
    url,
    headers: { ...axiosConfig.headers, [PAYMENT_SIGNATURE_HEADER]: paymentHeader },
  });

  return { ...paidRes, settlement: parseSettlement(paidRes) };
}

function parseSettlement(res: AxiosResponse): X402Response['settlement'] {
  const header = res.headers[PAYMENT_RESPONSE_HEADER.toLowerCase()];
  if (!header) return undefined;
  try {
    return JSON.parse(Buffer.from(header, 'base64').toString('utf8'));
  } catch {
    return undefined;
  }
}

function extractPaymentRequired(res: AxiosResponse): PaymentRequirements | null {
  const header = res.headers[PAYMENT_REQUIRED_HEADER.toLowerCase()];
  if (header) {
    try {
      const decoded: PaymentRequiredResponse = JSON.parse(Buffer.from(header, 'base64').toString('utf8'));
      if (decoded.accepts?.[0]) return decoded.accepts[0];
    } catch { /* fall through */ }
  }
  const body = res.data as PaymentRequiredResponse | undefined;
  return body?.accepts?.[0] ?? null;
}

export class X402PaymentError extends Error {
  constructor(message: string, public response: AxiosResponse) {
    super(message);
    this.name = 'X402PaymentError';
  }
}

/**
 * x402 axios — drop-in replacement that handles payments automatically.
 *
 *   const result = await x402axios.get(url, { account, network: 'starknet-sepolia' });
 *   console.log(result.data);
 *   console.log(result.settlement?.transaction);
 */
export const x402axios = {
  get: <T = any>(url: string, config: X402RequestConfig) => request<T>('GET', url, config),
  post: <T = any>(url: string, config: X402RequestConfig) => request<T>('POST', url, config),
  put: <T = any>(url: string, config: X402RequestConfig) => request<T>('PUT', url, config),
  delete: <T = any>(url: string, config: X402RequestConfig) => request<T>('DELETE', url, config),
  patch: <T = any>(url: string, config: X402RequestConfig) => request<T>('PATCH', url, config),
};
