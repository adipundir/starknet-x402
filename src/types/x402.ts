/**
 * x402 v2 Protocol Type Definitions for Starknet
 *
 * Single source of truth for all x402 types. v2 only — no v1 compatibility.
 */

// =============================================================================
// Constants
// =============================================================================

export const X402_VERSION = 2;

export const PAYMENT_SIGNATURE_HEADER = 'PAYMENT-SIGNATURE';
export const PAYMENT_RESPONSE_HEADER = 'PAYMENT-RESPONSE';
export const PAYMENT_REQUIRED_HEADER = 'PAYMENT-REQUIRED';

export const SCHEMES = {
  EXACT: 'exact',
} as const;

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

export const STARKNET_SCHEME = SCHEMES.EXACT;
export const STARKNET_SEPOLIA = NETWORKS.STARKNET_SEPOLIA;
export const STARKNET_MAINNET = NETWORKS.STARKNET_MAINNET;

// =============================================================================
// Core Protocol Types
// =============================================================================

export interface ResourceInfo {
  url: string;
  description?: string;
  mimeType?: string;
}

/**
 * Payment Requirements — what the resource server accepts.
 * Resource metadata lives in PaymentRequiredResponse.resource, not here.
 */
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
  resource: ResourceInfo;
  error?: string;
  extensions?: Record<string, unknown>;
}

/**
 * Starknet exact-scheme payload using SNIP-9 Outside Execution.
 *
 * The client signs an OutsideExecution containing a token.transfer() call.
 * The facilitator submits it via execute_from_outside_v2 on the client's account.
 * No ERC-20 approval is needed.
 */
export interface StarknetExactPayload {
  /** Client's account address (the one executing the transfer) */
  from: string;
  /** Recipient address */
  to: string;
  /** Transfer amount in token's smallest unit */
  amount: string;
  /** Token contract address */
  token: string;
  /** OutsideExecution typed data (as returned by AVNU paymaster.buildTransaction) */
  outsideExecution: {
    typedData: any;
    /** Signature over the typed data [r, s] */
    signature: string[];
  };
}

/**
 * Payment Payload — sent in the PAYMENT-SIGNATURE header (base64-encoded).
 */
export interface PaymentPayload {
  x402Version: number;
  payload: StarknetExactPayload;
  accepted: PaymentRequirements;
  resource?: ResourceInfo;
  extensions?: Record<string, unknown>;
}

// =============================================================================
// Facilitator API Types
// =============================================================================

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
  extensions?: Record<string, unknown>;
}

export interface SettlementResponseHeader {
  transaction: string;
  network: string;
  payer?: string;
  amount?: string;
}

export interface SupportedKind {
  x402Version: number;
  scheme: string;
  network: string;
  extra?: Record<string, unknown>;
}

export interface SupportedResponse {
  kinds: SupportedKind[];
}

// =============================================================================
// Configuration Types
// =============================================================================

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

export interface FacilitatorUrlConfig {
  url: string;
}

export interface FacilitatorConfig {
  rpcUrl: string;
  paymasterUrl: string;
  paymasterApiKey: string;
  networks: string[];
  schemes: string[];
  port?: number;
}


// =============================================================================
// Error Types
// =============================================================================

export class X402Error extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'X402Error';
  }
}

export class VerificationError extends X402Error {
  constructor(message: string, details?: unknown) {
    super(message, 'VERIFICATION_ERROR', details);
    this.name = 'VerificationError';
  }
}

export class SettlementError extends X402Error {
  constructor(message: string, details?: unknown) {
    super(message, 'SETTLEMENT_ERROR', details);
    this.name = 'SettlementError';
  }
}

// =============================================================================
// Helpers
// =============================================================================

export function getRequiredAmount(req: PaymentRequirements): bigint {
  return BigInt(req.amount);
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

export function getPaymentHeader(headers: { get(name: string): string | null }): string | null {
  return headers.get(PAYMENT_SIGNATURE_HEADER);
}

export function decodePaymentHeader(header: string): PaymentPayload | null {
  try {
    return JSON.parse(Buffer.from(header, 'base64').toString('utf-8')) as PaymentPayload;
  } catch {
    return null;
  }
}

export function validatePaymentPayload(payload: PaymentPayload | null): payload is PaymentPayload {
  if (!payload) return false;
  return !!(
    payload.x402Version === X402_VERSION &&
    payload.accepted?.scheme &&
    payload.accepted?.network &&
    payload.payload?.from &&
    payload.payload?.to &&
    payload.payload?.token &&
    payload.payload?.amount &&
    payload.payload?.outsideExecution?.typedData &&
    payload.payload?.outsideExecution?.signature?.length >= 2
  );
}

export function encodeSettlementResponseHeader(
  transaction: string,
  network: string,
  payer?: string,
  amount?: string,
): string {
  const header: SettlementResponseHeader = { transaction, network, payer, amount };
  return Buffer.from(JSON.stringify(header)).toString('base64');
}

export function isValidStarknetAddress(address: string): boolean {
  if (!address || typeof address !== 'string') return false;
  const clean = address.startsWith('0x') ? address.slice(2) : address;
  if (!/^[0-9a-fA-F]+$/.test(clean)) return false;
  return clean.length > 0 && clean.length <= 64;
}

export function parseU256(result: string[]): bigint {
  if (!result || result.length < 2) return 0n;
  return BigInt(result[0]) + (BigInt(result[1]) << 128n);
}
