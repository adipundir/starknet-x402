/**
 * x402 Starknet SDK (v2)
 * HTTP-native micropayments for Starknet
 */

// Types
export * from './types/types';

// Typed Data
export { buildPaymentTypedData, getChainId } from './types/typed-data';

// Client
export * from './client/client';
export * from './client/client-payment';
export { createX402Client, X402PaymentError, type X402ClientConfig, type X402AxiosInstance } from './client/axios';

// Middleware
export { paymentMiddleware } from './middleware/middleware';

// Facilitator
export * from './facilitator/facilitator';
