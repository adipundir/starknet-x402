/**
 * x402 Client Payment Creation for Starknet
 * Implements the exact scheme payload generation and signing
 */

import { Account, RpcProvider, typedData, ec, num } from 'starknet';
import type { PaymentPayload } from './types';

export interface PaymentOptions {
  from: string;
  to: string;
  token: string;
  amount: string;
  network: 'starknet-sepolia' | 'starknet-mainnet';
  deadline?: number; // Unix timestamp, defaults to now + 5 minutes
}

export interface SignedPayment {
  paymentPayload: PaymentPayload;
  paymentHeader: string; // Base64-encoded JSON
}

/**
 * Generate a unique nonce for payment
 */
export function generateNonce(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Get chain ID for network
 */
function getChainId(network: string): string {
  return network === 'starknet-mainnet' 
    ? '0x534e5f4d41494e' // SN_MAIN
    : '0x534e5f5345504f4c4941'; // SN_SEPOLIA
}

/**
 * Create typed data message for signing
 */
export function createPaymentMessage(options: PaymentOptions & { nonce: string; deadline: number }) {
  const chainId = getChainId(options.network);

  return {
    types: {
      StarkNetDomain: [
        { name: 'name', type: 'felt' },
        { name: 'version', type: 'felt' },
        { name: 'chainId', type: 'felt' },
      ],
      Payment: [
        { name: 'from', type: 'felt' },
        { name: 'to', type: 'felt' },
        { name: 'token', type: 'felt' },
        { name: 'amount', type: 'felt' },
        { name: 'nonce', type: 'felt' },
        { name: 'deadline', type: 'felt' },
      ],
    },
    primaryType: 'Payment',
    domain: {
      name: 'x402 Payment',
      version: '1',
      chainId: chainId,
    },
    message: {
      from: options.from,
      to: options.to,
      token: options.token,
      amount: options.amount,
      nonce: options.nonce,
      deadline: options.deadline,
    },
  };
}

/**
 * Sign a payment using Starknet account
 * @param account - Starknet Account instance
 * @param options - Payment options
 * @returns Signed payment with payload and base64-encoded header
 */
export async function signPayment(
  account: Account,
  options: PaymentOptions
): Promise<SignedPayment> {
  // Generate nonce and deadline
  const nonce = generateNonce();
  const deadline = options.deadline || Math.floor(Date.now() / 1000) + 300; // 5 minutes

  // Create typed data message
  const message = createPaymentMessage({ ...options, nonce, deadline });

  // Get message hash
  const messageHash = typedData.getMessageHash(message, account.address);

  // Sign the message
  const signature = await account.signMessage(message);

  // Create payment payload
  const paymentPayload: PaymentPayload = {
    x402Version: 1,
    scheme: 'exact',
    network: options.network,
    payload: {
      from: options.from,
      to: options.to,
      token: options.token,
      amount: options.amount,
      nonce: nonce,
      deadline: deadline,
      signature: {
        r: signature[0],
        s: signature[1],
      },
    },
  };

  // Base64-encode the payment payload
  const paymentHeader = Buffer.from(JSON.stringify(paymentPayload)).toString('base64');

  return {
    paymentPayload,
    paymentHeader,
  };
}

/**
 * Create a payment using private key (for demo/testing)
 * @param privateKey - Private key hex string
 * @param provider - Starknet RPC provider
 * @param options - Payment options
 * @returns Signed payment with payload and base64-encoded header
 */
export async function signPaymentWithPrivateKey(
  privateKey: string,
  provider: RpcProvider,
  options: PaymentOptions
): Promise<SignedPayment> {
  // Create account from private key
  const account = new Account(provider, options.from, privateKey);

  // Sign payment
  return signPayment(account, options);
}

/**
 * Create a mock signed payment (for testing/demo without real wallet)
 * WARNING: This creates an invalid signature - for testing only!
 */
export function createMockPayment(options: PaymentOptions): SignedPayment {
  const nonce = generateNonce();
  const deadline = options.deadline || Math.floor(Date.now() / 1000) + 300;

  const paymentPayload: PaymentPayload = {
    x402Version: 1,
    scheme: 'exact',
    network: options.network,
    payload: {
      from: options.from,
      to: options.to,
      token: options.token,
      amount: options.amount,
      nonce: nonce,
      deadline: deadline,
      signature: {
        r: '0x' + '1'.repeat(63) + '0',
        s: '0x' + '2'.repeat(63) + '0',
      },
    },
  };

  const paymentHeader = Buffer.from(JSON.stringify(paymentPayload)).toString('base64');

  return {
    paymentPayload,
    paymentHeader,
  };
}

/**
 * Decode X-PAYMENT-RESPONSE header
 */
export function decodeSettlementResponse(header: string) {
  try {
    const decoded = Buffer.from(header, 'base64').toString('utf8');
    return JSON.parse(decoded);
  } catch (error) {
    console.error('Failed to decode settlement response:', error);
    return null;
  }
}

/**
 * Make an HTTP request with payment
 */
export async function requestWithPayment(
  url: string,
  paymentHeader: string,
  options?: RequestInit
): Promise<Response> {
  return fetch(url, {
    ...options,
    headers: {
      ...options?.headers,
      'X-PAYMENT': paymentHeader,
    },
  });
}

/**
 * Complete payment flow: request, get 402, pay, get resource
 */
export async function payAndRequest(
  url: string,
  account: Account,
  options?: RequestInit
): Promise<Response> {
  // Step 1: Request without payment
  const initialResponse = await fetch(url, options);

  // If not 402, return response
  if (initialResponse.status !== 402) {
    return initialResponse;
  }

  // Parse payment requirements
  const paymentRequired = await initialResponse.json();
  const requirements = paymentRequired.accepts[0];

  if (!requirements) {
    throw new Error('No payment requirements provided');
  }

  // Step 2: Create and sign payment
  const payment = await signPayment(account, {
    from: account.address,
    to: requirements.payTo,
    token: requirements.asset,
    amount: requirements.maxAmountRequired,
    network: requirements.network,
  });

  // Step 3: Request with payment
  return requestWithPayment(url, payment.paymentHeader, options);
}


