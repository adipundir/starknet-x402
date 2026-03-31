/**
 * x402 Client Utilities — re-exports from canonical types.
 */

export {
  type VerifyResponse as VerificationResult,
  type SettleResponse as SettlementResult,
  type PaymentPayload,
  decodePaymentHeader,
  validatePaymentPayload,
  encodeSettlementResponseHeader as createSettlementResponseHeader,
} from '../../src/types/x402';
