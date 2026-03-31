/**
 * x402 v2 for Starknet
 */

// Types & constants
export {
  type ResourceInfo,
  type PaymentRequiredResponse,
  type PaymentRequirements,
  type PaymentPayload,
  type StarknetExactPayload,
  type VerifyRequest,
  type VerifyResponse,
  type SettleRequest,
  type SettleResponse,
  type SettlementResponseHeader,
  type SupportedResponse,
  type SupportedKind,
  type FacilitatorConfig,
  type FacilitatorUrlConfig,
  type RouteConfig,
  X402Error,
  VerificationError,
  SettlementError,
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
  getRequiredAmount,
  buildSettleResponse,
  getPaymentHeader,
  decodePaymentHeader,
  validatePaymentPayload,
  encodeSettlementResponseHeader,
  isValidStarknetAddress,
  parseU256,
} from './types/x402';

export { buildPaymentTypedData, getChainId } from './types/typed-data';

// Facilitator internals (used by API routes)
export { StarknetVerifier } from './facilitator/starknet-verifier';
export { StarknetSettler } from './facilitator/starknet-settler';
export { isNonceFresh, markNonceUsed, reserveNonce } from './facilitator/nonce-tracker';
