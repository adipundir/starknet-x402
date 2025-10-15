/**
 * x402 for Starknet - Main Export File
 * 
 * Import this package to use x402 payment protocol on Starknet
 */

// ============================================================================
// Type Exports
// ============================================================================

export {
  // Core types
  PaymentRequiredResponse,
  PaymentRequirements,
  PaymentPayload,
  StarknetExactPayload,
  
  // Facilitator types
  VerifyRequest,
  VerifyResponse,
  SettleRequest,
  SettleResponse,
  SupportedResponse,
  SupportedKind,
  
  // Configuration types
  FacilitatorConfig,
  PaymentMiddlewareConfig,
  
  // Error types
  X402Error,
  VerificationError,
  SettlementError,
  
  // Constants
  X402_VERSION,
  X_PAYMENT_HEADER,
  X_PAYMENT_RESPONSE_HEADER,
  SCHEMES,
  NETWORKS,
} from './types/x402';

// ============================================================================
// Facilitator Exports
// ============================================================================

export {
  FacilitatorServer,
  createFacilitatorServer,
} from './facilitator/server';

export { StarknetVerifier } from './facilitator/starknet-verifier';
export { StarknetSettler, PAYMENT_PROCESSOR_ABI } from './facilitator/starknet-settler';

// ============================================================================
// Middleware Exports
// ============================================================================

export {
  paymentMiddleware,
  localPaymentMiddleware,
} from './middleware/payment-middleware';

// ============================================================================
// Client Exports
// ============================================================================

export {
  PaymentClient,
  createPaymentClient,
  payForResource,
  PaymentClientConfig,
  PaymentResult,
} from './client/payment-client';

// ============================================================================
// Default Export
// ============================================================================

export default {
  // Facilitator
  createFacilitatorServer,
  
  // Middleware
  paymentMiddleware,
  localPaymentMiddleware,
  
  // Client
  createPaymentClient,
  payForResource,
};




