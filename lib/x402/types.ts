/**
 * x402 Protocol Type Definitions for Starknet
 * Based on official x402 specification
 */

// Protocol version
export const X402_VERSION = 1;

// Starknet schemes and networks
export const STARKNET_SCHEME = 'exact';
export const STARKNET_SEPOLIA = 'starknet-sepolia';
export const STARKNET_MAINNET = 'starknet-mainnet';

// Route Configuration
export interface RouteConfig {
  price: string;
  tokenAddress: string; // ERC20 token address (e.g., STRK, USDC, ETH)
  network?: 'sepolia' | 'mainnet' | string;
  config?: {
    description?: string;
    mimeType?: string;
    outputSchema?: object | null;
    maxTimeoutSeconds?: number;
  };
}

// Facilitator Configuration
export interface FacilitatorConfig {
  url: string;
}

// x402 Protocol Types
export interface PaymentRequirements {
  scheme: string;
  network: string;
  maxAmountRequired: string;
  resource: string;
  description: string;
  mimeType: string;
  outputSchema?: object | null;
  payTo: string;
  maxTimeoutSeconds: number;
  asset: string;
  extra: null;
}

export interface PaymentRequiredResponse {
  x402Version: number;
  accepts: PaymentRequirements[];
  error?: string;
}

export interface PaymentPayload {
  x402Version: number;
  scheme: string;
  network: string;
  payload: {
    from: string;
    to: string;
    token: string;
    amount: string;
    nonce: string;
    deadline: number;
    signature: {
      r: string;
      s: string;
    };
  };
}

export interface VerifyRequest {
  x402Version: number;
  paymentHeader: string;
  paymentRequirements: PaymentRequirements;
}

export interface VerifyResponse {
  isValid: boolean;
  invalidReason: string | null;
}

export interface SettleRequest {
  x402Version: number;
  paymentHeader: string;
  paymentRequirements: PaymentRequirements;
}

export interface SettleResponse {
  success: boolean;
  error: string | null;
  txHash: string | null;
  networkId: string | null;
}

