/**
 * x402 v2 Client Payment Creation for Starknet
 */

import { Account, RpcProvider } from 'starknet';
import type { PaymentPayload, PaymentRequirements } from '../types/types';
import { X402_VERSION, PAYMENT_SIGNATURE_HEADER, PAYMENT_REQUIRED_HEADER } from '../types/types';
import { buildPaymentTypedData } from '../types/typed-data';

function toHexString(val: unknown): string {
  if (typeof val === 'string') return val;
  if (typeof val === 'bigint') return '0x' + val.toString(16);
  return String(val);
}

export interface PaymentOptions {
  from: string;
  to: string;
  token: string;
  amount: string;
  network: 'starknet-sepolia' | 'starknet-mainnet';
  deadline?: number;
}

export interface SignedPayment {
  paymentPayload: PaymentPayload;
  paymentHeader: string;
}

export function generateNonce(): string {
  const bytes = new Uint8Array(31);
  crypto.getRandomValues(bytes);
  return '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function signPayment(
  account: Account,
  options: PaymentOptions,
): Promise<SignedPayment> {
  const nonce = generateNonce();
  const deadline = options.deadline || Math.floor(Date.now() / 1000) + 300;

  const innerPayload = { from: options.from, to: options.to, token: options.token, amount: options.amount, nonce, deadline };
  const message = buildPaymentTypedData(innerPayload, options.network);
  const signature = await account.signMessage(message);

  const paymentPayload: PaymentPayload = {
    x402Version: X402_VERSION,
    accepted: { scheme: 'exact', network: options.network, amount: options.amount, asset: options.token, payTo: options.to, maxTimeoutSeconds: 300 },
    payload: { ...innerPayload, signature: { r: toHexString((signature as any).r ?? (signature as any)[0]), s: toHexString((signature as any).s ?? (signature as any)[1]) } },
  };

  return { paymentPayload, paymentHeader: Buffer.from(JSON.stringify(paymentPayload)).toString('base64') };
}

export async function signPaymentWithPrivateKey(privateKey: string, provider: RpcProvider, options: PaymentOptions): Promise<SignedPayment> {
  return signPayment(new Account(provider, options.from, privateKey), options);
}

export function decodeSettlementResponse(header: string) {
  try { return JSON.parse(Buffer.from(header, 'base64').toString('utf8')); }
  catch { return null; }
}

export async function requestWithPayment(url: string, paymentHeader: string, options?: RequestInit): Promise<Response> {
  return fetch(url, { ...options, headers: { ...options?.headers, [PAYMENT_SIGNATURE_HEADER]: paymentHeader } });
}

export async function payAndRequest(url: string, account: Account, options?: RequestInit): Promise<Response> {
  const initialResponse = await fetch(url, options);
  if (initialResponse.status !== 402) return initialResponse;

  const prHeader = initialResponse.headers.get(PAYMENT_REQUIRED_HEADER);
  let requirements: PaymentRequirements;

  if (prHeader) {
    const decoded = JSON.parse(Buffer.from(prHeader, 'base64').toString('utf8'));
    requirements = decoded.accepts[0];
  } else {
    const body = await initialResponse.json() as { accepts: PaymentRequirements[] };
    requirements = body.accepts[0];
  }

  if (!requirements) throw new Error('No payment requirements provided');

  const payment = await signPayment(account, {
    from: account.address,
    to: requirements.payTo,
    token: requirements.asset,
    amount: requirements.amount,
    network: requirements.network as 'starknet-sepolia' | 'starknet-mainnet',
  });

  return requestWithPayment(url, payment.paymentHeader, options);
}
