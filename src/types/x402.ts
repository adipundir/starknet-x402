/**
 * x402 Protocol Type Definitions for Starknet
 * 
 * This file contains all type definitions for the x402 payment protocol
 * adapted for Starknet blockchain integration.
 */

// ============================================================================
// Core Protocol Types
// ============================================================================

/**
 * Payment Required Response returned by resource server when payment is needed
 */
export interface PaymentRequiredResponse {
  /** Version of the x402 payment protocol */
  x402Version: number;
  
  /** List of payment requirements that the resource server accepts */
  accepts: PaymentRequirements[];
  
  /** Optional error message from the resource server */
  error?: string;
}

/**
 * Payment Requirements specifying how to pay for a resource
 */
export interface PaymentRequirements {
  /** Scheme of the payment protocol (e.g., 'exact', 'upto') */
  scheme: string;
  
  /** Network identifier (e.g., 'starknet-mainnet', 'starknet-sepolia') */
  network: string;
  
  /** Maximum amount required in atomic units (wei for ETH, smallest unit for token) */
  maxAmountRequired: string;
  
  /** URL of resource to pay for */
  resource: string;
  
  /** Human-readable description of the resource */
  description: string;
  
  /** MIME type of the resource response */
  mimeType: string;
  
  /** Optional JSON schema of the resource response */
  outputSchema?: object | null;
  
  /** Starknet address to receive payment */
  payTo: string;
  
  /** Maximum time in seconds for the resource server to respond */
  maxTimeoutSeconds: number;
  
  /** Token contract address (for ERC20-like tokens on Starknet) */
  asset: string;
  
  /** Extra scheme-specific information */
  extra?: Record<string, any> | null;
}

/**
 * Payment Payload sent in X-PAYMENT header
 */
export interface PaymentPayload {
  /** Version of the x402 payment protocol */
  x402Version: number;
  
  /** Scheme being used for payment */
  scheme: string;
  
  /** Network identifier */
  network: string;
  
  /** Scheme-dependent payload data */
  payload: any;
}

// ============================================================================
// Starknet-Specific Types
// ============================================================================

/**
 * Starknet Exact Scheme Payload
 * For transferring an exact amount using Starknet signatures
 */
export interface StarknetExactPayload {
  /** Sender's Starknet address */
  from: string;
  
  /** Recipient's Starknet address */
  to: string;
  
  /** Amount to transfer in atomic units */
  amount: string;
  
  /** Token contract address */
  token: string;
  
  /** Nonce for replay protection */
  nonce: string;
  
  /** Expiration timestamp (unix timestamp in seconds) */
  deadline: number;
  
  /** Starknet signature components */
  signature: {
    r: string;
    s: string;
  };
  
  /** Optional chain ID for additional security */
  chainId?: string;
}

// ============================================================================
// Facilitator API Types
// ============================================================================

/**
 * Request to verify a payment
 */
export interface VerifyRequest {
  /** Protocol version */
  x402Version: number;
  
  /** Base64 encoded payment header */
  paymentHeader: string;
  
  /** Payment requirements to verify against */
  paymentRequirements: PaymentRequirements;
}

/**
 * Response from payment verification
 */
export interface VerifyResponse {
  /** Whether the payment is valid */
  isValid: boolean;
  
  /** Reason for invalidity, if applicable */
  invalidReason: string | null;
}

/**
 * Request to settle a payment
 */
export interface SettleRequest {
  /** Protocol version */
  x402Version: number;
  
  /** Base64 encoded payment header */
  paymentHeader: string;
  
  /** Payment requirements to settle */
  paymentRequirements: PaymentRequirements;
}

/**
 * Response from payment settlement
 */
export interface SettleResponse {
  /** Whether the payment was successful */
  success: boolean;
  
  /** Error message if settlement failed */
  error: string | null;
  
  /** Transaction hash of the settled payment */
  txHash: string | null;
  
  /** Network ID where payment was settled */
  networkId: string | null;
}

/**
 * Supported scheme and network combination
 */
export interface SupportedKind {
  /** Payment scheme */
  scheme: string;
  
  /** Network identifier */
  network: string;
}

/**
 * Response listing supported payment kinds
 */
export interface SupportedResponse {
  /** Array of supported (scheme, network) pairs */
  kinds: SupportedKind[];
}

// ============================================================================
// Configuration Types
// ============================================================================

/**
 * Facilitator server configuration
 */
export interface FacilitatorConfig {
  /** Port to run the server on */
  port: number;
  
  /** Starknet RPC URL */
  rpcUrl: string;
  
  /** Private key for facilitator account (for settlement) */
  privateKey: string;
  
  /** Supported networks */
  networks: string[];
  
  /** Supported schemes */
  schemes: string[];
  
  /** Optional: Maximum gas price in wei */
  maxGasPrice?: string;
}

/**
 * Payment middleware configuration
 */
export interface PaymentMiddlewareConfig {
  /** Facilitator server URL */
  facilitatorUrl: string;
  
  /** Address to receive payments */
  payToAddress: string;
  
  /** Token contract address */
  tokenAddress: string;
  
  /** Network identifier */
  network: string;
  
  /** Endpoint pricing map */
  pricing: Record<string, string>;
  
  /** Optional timeout in seconds */
  timeoutSeconds?: number;
  
  /** Optional scheme (defaults to 'exact') */
  scheme?: string;
}

// ============================================================================
// Error Types
// ============================================================================

export class X402Error extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'X402Error';
  }
}

export class VerificationError extends X402Error {
  constructor(message: string, details?: any) {
    super(message, 'VERIFICATION_ERROR', details);
    this.name = 'VerificationError';
  }
}

export class SettlementError extends X402Error {
  constructor(message: string, details?: any) {
    super(message, 'SETTLEMENT_ERROR', details);
    this.name = 'SettlementError';
  }
}

// ============================================================================
// Constants
// ============================================================================

export const X402_VERSION = 1;
export const X_PAYMENT_HEADER = 'X-PAYMENT';
export const X_PAYMENT_RESPONSE_HEADER = 'X-PAYMENT-RESPONSE';

export const SCHEMES = {
  EXACT: 'exact',
  UPTO: 'upto', // Future implementation
} as const;

export const NETWORKS = {
  STARKNET_MAINNET: 'starknet-mainnet',
  STARKNET_SEPOLIA: 'starknet-sepolia',
} as const;

