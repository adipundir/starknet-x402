/**
 * Re-export all types from the canonical source.
 */

export {
  // Constants
  X402_VERSION,
  PAYMENT_SIGNATURE_HEADER,
  PAYMENT_RESPONSE_HEADER,
  PAYMENT_REQUIRED_HEADER,
  SCHEMES,
  NETWORKS,
  TOKENS,
  STARKNET_SCHEME,
  STARKNET_SEPOLIA,
  STARKNET_MAINNET,

  // Core types
  type ResourceInfo,
  type PaymentRequirements,
  type PaymentRequiredResponse,
  type StarknetExactPayload,
  type PaymentPayload,

  // Facilitator API types
  type VerifyRequest,
  type VerifyResponse,
  type SettleRequest,
  type SettleResponse,
  type SettlementResponseHeader,
  type SupportedKind,
  type SupportedResponse,

  // Config types
  type RouteConfig,
  type FacilitatorUrlConfig,
  type FacilitatorConfig,

  // Error types
  X402Error,
  VerificationError,
  SettlementError,

  // Helpers
  getRequiredAmount,
  buildSettleResponse,
  getPaymentHeader,
  decodePaymentHeader,
  validatePaymentPayload,
  encodeSettlementResponseHeader,
  isValidStarknetAddress,
  parseU256,
} from '../../src/types/x402';
