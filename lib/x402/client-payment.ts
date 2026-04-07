/**
 * x402 v2 Client Payment Creation for Starknet
 *
 * Uses SNIP-9 Outside Execution via AVNU paymaster.
 * The client signs an OutsideExecution containing token.transfer().
 * No ERC-20 approval is needed.
 */

import { Account, RpcProvider, PaymasterRpc, num, type Signature, type TypedData } from 'starknet';
import type { PaymentPayload, PaymentRequirements, SettlementResponseHeader } from './types';
import { X402_VERSION, PAYMENT_SIGNATURE_HEADER, PAYMENT_REQUIRED_HEADER } from './types';
import { buildTransferCall } from '../../src/types/typed-data';

export interface PaymentOptions {
  from: string;
  to: string;
  token: string;
  amount: string;
  network: 'starknet-sepolia' | 'starknet-mainnet';
  paymasterUrl?: string;
  paymasterApiKey?: string;
}

export interface SignedPayment {
  paymentPayload: PaymentPayload;
  paymentHeader: string;
}

const DEFAULT_PAYMASTER: Record<string, string> = {
  'starknet-sepolia': 'https://sepolia.paymaster.avnu.fi',
  'starknet-mainnet': 'https://starknet.paymaster.avnu.fi',
};

/**
 * Sign a payment using SNIP-9 Outside Execution.
 *
 * Flow:
 * 1. Build ERC-20 transfer call
 * 2. Send to AVNU paymaster.buildTransaction() → get OutsideExecution typed data
 * 3. Client signs the typed data
 * 4. Package into PaymentPayload
 */
export async function signPayment(
  account: Account,
  options: PaymentOptions,
): Promise<SignedPayment> {
  // 1. Build the transfer call
  const transferCall = buildTransferCall(options.token, options.to, options.amount);

  // 2. Get OutsideExecution typed data from AVNU paymaster
  const paymasterUrl = options.paymasterUrl || DEFAULT_PAYMASTER[options.network];
  if (!paymasterUrl) throw new Error(`No paymaster URL for network ${options.network}`);

  const headers: Record<string, string> = {};
  if (options.paymasterApiKey) {
    headers['x-paymaster-api-key'] = options.paymasterApiKey;
  }

  const paymaster = new PaymasterRpc({ nodeUrl: paymasterUrl, headers });

  const buildResult = await paymaster.buildTransaction(
    {
      type: 'invoke' as const,
      invoke: {
        userAddress: options.from,
        calls: [transferCall],
      },
    },
    {
      version: '0x1',
      feeMode: { mode: 'sponsored' as const },
    },
  );

  if (!('typed_data' in buildResult)) {
    throw new Error('Paymaster did not return typed_data');
  }

  const { typed_data: typedData } = buildResult as { typed_data: TypedData };

  // 3. Client signs the OutsideExecution typed data
  const signature: Signature = await account.signMessage(typedData);
  let sigR: string, sigS: string;
  if (Array.isArray(signature)) {
    sigR = num.toHex(signature[0]);
    sigS = num.toHex(signature[1]);
  } else {
    sigR = num.toHex(signature.r);
    sigS = num.toHex(signature.s);
  }

  // 4. Package into PaymentPayload
  const paymentPayload: PaymentPayload = {
    x402Version: X402_VERSION,
    accepted: {
      scheme: 'exact',
      network: options.network,
      amount: options.amount,
      asset: options.token,
      payTo: options.to,
      maxTimeoutSeconds: 300,
    },
    payload: {
      from: options.from,
      to: options.to,
      token: options.token,
      amount: options.amount,
      outsideExecution: {
        typedData,
        signature: [sigR, sigS],
      },
    },
  };

  const paymentHeader = Buffer.from(JSON.stringify(paymentPayload)).toString('base64');
  return { paymentPayload, paymentHeader };
}

/**
 * Sign a payment using a raw private key.
 */
export async function signPaymentWithPrivateKey(
  privateKey: string,
  provider: RpcProvider,
  options: PaymentOptions,
): Promise<SignedPayment> {
  return signPayment(new Account(provider, options.from, privateKey), options);
}

/**
 * Decode a PAYMENT-RESPONSE header.
 */
export function decodeSettlementResponse(header: string): SettlementResponseHeader | null {
  try {
    return JSON.parse(Buffer.from(header, 'base64').toString('utf8'));
  } catch (e) {
    console.warn('Failed to decode settlement response header:', e);
    return null;
  }
}

/**
 * Make an HTTP request with the PAYMENT-SIGNATURE header.
 */
export async function requestWithPayment(
  url: string,
  paymentHeader: string,
  options?: RequestInit,
): Promise<Response> {
  return fetch(url, {
    ...options,
    headers: {
      ...options?.headers,
      [PAYMENT_SIGNATURE_HEADER]: paymentHeader,
    },
  });
}

/**
 * Complete flow: request → get 402 → sign via AVNU → pay → get resource.
 */
export async function payAndRequest(
  url: string,
  account: Account,
  paymentOptions: Pick<PaymentOptions, 'network' | 'paymasterUrl' | 'paymasterApiKey'>,
  fetchOptions?: RequestInit,
): Promise<Response> {
  const initialResponse = await fetch(url, fetchOptions);
  if (initialResponse.status !== 402) return initialResponse;

  // Read requirements from PAYMENT-REQUIRED header
  const prHeader = initialResponse.headers.get(PAYMENT_REQUIRED_HEADER);
  let requirements: PaymentRequirements;

  if (prHeader) {
    const decoded = JSON.parse(Buffer.from(prHeader, 'base64').toString('utf8'));
    requirements = decoded.accepts[0];
  } else {
    const body = await initialResponse.json() as { accepts: PaymentRequirements[] };
    requirements = body.accepts[0];
  }

  if (!requirements) throw new Error('No payment requirements provided');

  const payment = await signPayment(account, {
    from: account.address,
    to: requirements.payTo,
    token: requirements.asset,
    amount: requirements.amount,
    network: paymentOptions.network,
    paymasterUrl: paymentOptions.paymasterUrl,
    paymasterApiKey: paymentOptions.paymasterApiKey,
  });

  return requestWithPayment(url, payment.paymentHeader, fetchOptions);
}
