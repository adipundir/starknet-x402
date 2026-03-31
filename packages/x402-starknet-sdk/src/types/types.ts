/**
 * x402 v2 Protocol Types for Starknet SDK
 */

export const X402_VERSION = 2;

export const PAYMENT_SIGNATURE_HEADER = 'PAYMENT-SIGNATURE';
export const PAYMENT_RESPONSE_HEADER = 'PAYMENT-RESPONSE';
export const PAYMENT_REQUIRED_HEADER = 'PAYMENT-REQUIRED';

export const STARKNET_SCHEME = 'exact';
export const STARKNET_SEPOLIA = 'starknet-sepolia';
export const STARKNET_MAINNET = 'starknet-mainnet';

export const SCHEMES = { EXACT: 'exact' } as const;
export const NETWORKS = {
  STARKNET_MAINNET: 'starknet-mainnet',
  STARKNET_SEPOLIA: 'starknet-sepolia',
} as const;

export const TOKENS = {
  USDC_SEPOLIA: '0x0512feAc6339Ff7889822cb5aA2a86C848e9D392bB0E3E237C008674feeD8343',
  USDC_MAINNET: '0x033068F6539f8e6e6b131e6B2B814e6c34A5224bC66947c47DaB9dFeE93b35fb',
  STRK_SEPOLIA: '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
  ETH: '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
} as const;

export interface ResourceInfo {
  url: string;
  description?: string;
  mimeType?: string;
}

export interface RouteConfig {
  price: string;
  tokenAddress: string;
  network?: 'sepolia' | 'mainnet' | string;
  config?: {
    description?: string;
    mimeType?: string;
    maxTimeoutSeconds?: number;
  };
}

export interface FacilitatorConfig {
  url: string;
}

export interface PaymentRequirements {
  scheme: string;
  network: string;
  amount: string;
  payTo: string;
  asset: string;
  maxTimeoutSeconds: number;
  extra?: Record<string, unknown> | null;
}

export interface PaymentRequiredResponse {
  x402Version: number;
  accepts: PaymentRequirements[];
  resource?: ResourceInfo;
  facilitatorUrl?: string;
  error?: string;
  extensions?: Record<string, unknown>;
}

export interface StarknetExactPayload {
  from: string;
  to: string;
  amount: string;
  token: string;
  nonce: string;
  deadline: number;
  signature: { r: string; s: string };
  chainId?: string;
}

export interface PaymentPayload {
  x402Version: number;
  payload: StarknetExactPayload;
  accepted: PaymentRequirements;
  resource?: ResourceInfo;
  extensions?: Record<string, unknown>;
}

export interface VerifyRequest {
  x402Version: number;
  paymentHeader: string;
  paymentRequirements: PaymentRequirements;
}

export interface VerifyResponse {
  isValid: boolean;
  invalidReason: string | null;
  payer?: string;
}

export interface SettleRequest {
  x402Version: number;
  paymentHeader: string;
  paymentRequirements: PaymentRequirements;
}

export interface SettleResponse {
  success: boolean;
  transaction: string | null;
  network: string | null;
  errorReason: string | null;
  payer?: string;
  amount?: string;
}

export function getPaymentHeader(headers: { get(name: string): string | null }): string | null {
  return headers.get(PAYMENT_SIGNATURE_HEADER);
}

export function decodePaymentHeader(header: string): PaymentPayload | null {
  try { return JSON.parse(Buffer.from(header, 'base64').toString('utf-8')); }
  catch { return null; }
}

export function validatePaymentPayload(payload: PaymentPayload | null): payload is PaymentPayload {
  if (!payload) return false;
  return !!(
    payload.x402Version &&
    payload.accepted?.scheme &&
    payload.accepted?.network &&
    payload.payload?.from &&
    payload.payload?.to &&
    payload.payload?.token &&
    payload.payload?.amount &&
    payload.payload?.nonce &&
    payload.payload?.signature?.r &&
    payload.payload?.signature?.s
  );
}

export function encodeSettlementResponseHeader(transaction: string, network: string, payer?: string): string {
  return Buffer.from(JSON.stringify({ transaction, network, payer })).toString('base64');
}

export function buildSettleResponse(opts: {
  success: boolean;
  transaction?: string | null;
  network?: string | null;
  errorReason?: string | null;
  payer?: string;
  amount?: string;
}): SettleResponse {
  return {
    success: opts.success,
    transaction: opts.transaction ?? null,
    network: opts.network ?? null,
    errorReason: opts.errorReason ?? null,
    payer: opts.payer,
    amount: opts.amount,
  };
}
