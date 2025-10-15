/**
 * x402 Payment Client for Starknet
 * 
 * Provides utilities for clients to make x402 payments
 */

import axios, { AxiosRequestConfig } from 'axios';
import {
  PaymentPayload,
  PaymentRequiredResponse,
  StarknetExactPayload,
  X402_VERSION,
  X_PAYMENT_HEADER,
  X_PAYMENT_RESPONSE_HEADER,
  SCHEMES,
} from '../types/x402';
import { Account, hash, ec, CallData, RpcProvider } from 'starknet';

export interface PaymentClientConfig {
  /** Starknet account for signing payments */
  account: Account;
  
  /** RPC provider for Starknet */
  provider: RpcProvider;
  
  /** Network identifier */
  network: string;
  
  /** Optional: Auto-approve payments below this amount (in wei) */
  autoApproveThreshold?: bigint;
}

export interface PaymentResult {
  success: boolean;
  response?: any;
  error?: string;
  txHash?: string;
}

/**
 * x402 Payment Client
 * Handles making payments for resources
 */
export class PaymentClient {
  private config: PaymentClientConfig;

  constructor(config: PaymentClientConfig) {
    this.config = config;
  }

  /**
   * Makes a paid request to a resource server
   * 
   * @example
   * ```typescript
   * const result = await client.pay('https://api.example.com/data', {
   *   method: 'GET'
   * });
   * ```
   */
  async pay(url: string, options?: AxiosRequestConfig): Promise<PaymentResult> {
    try {
      // First, try the request without payment to get requirements
      const initialResponse = await axios({
        ...options,
        url,
        validateStatus: (status) => status === 402 || (status >= 200 && status < 300),
      });

      // If successful without payment, return immediately
      if (initialResponse.status === 200) {
        return {
          success: true,
          response: initialResponse.data,
        };
      }

      // If 402, process payment
      if (initialResponse.status === 402) {
        const paymentRequired = initialResponse.data as PaymentRequiredResponse;

        if (!paymentRequired.accepts || paymentRequired.accepts.length === 0) {
          return {
            success: false,
            error: paymentRequired.error || 'No payment options available',
          };
        }

        // Select the first acceptable payment requirement
        // In production, you might want to let the user choose
        const requirement = paymentRequired.accepts[0];

        // Create payment
        const payment = await this.createPayment(requirement);

        if (!payment) {
          return {
            success: false,
            error: 'Failed to create payment',
          };
        }

        // Make the request again with payment
        const paidResponse = await axios({
          ...options,
          url,
          headers: {
            ...options?.headers,
            [X_PAYMENT_HEADER]: payment,
          },
        });

        // Extract settlement info from response headers
        const settlementHeader = paidResponse.headers[X_PAYMENT_RESPONSE_HEADER.toLowerCase()];
        let txHash: string | undefined;

        if (settlementHeader) {
          try {
            const decoded = Buffer.from(settlementHeader, 'base64').toString('utf-8');
            const settlement = JSON.parse(decoded);
            txHash = settlement.txHash;
          } catch (error) {
            console.warn('Failed to decode settlement response:', error);
          }
        }

        return {
          success: true,
          response: paidResponse.data,
          txHash,
        };
      }

      return {
        success: false,
        error: `Unexpected status code: ${initialResponse.status}`,
      };
    } catch (error) {
      console.error('Payment error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Payment failed',
      };
    }
  }

  /**
   * Creates a payment payload for a given requirement
   */
  private async createPayment(
    requirement: any
  ): Promise<string | null> {
    try {
      if (requirement.scheme === SCHEMES.EXACT) {
        return await this.createExactPayment(requirement);
      }

      console.error(`Unsupported payment scheme: ${requirement.scheme}`);
      return null;
    } catch (error) {
      console.error('Failed to create payment:', error);
      return null;
    }
  }

  /**
   * Creates an exact payment payload
   */
  private async createExactPayment(requirement: any): Promise<string> {
    const accountAddress = this.config.account.address;
    
    // Get the current nonce for this account
    const nonce = await this.getNonce(accountAddress);

    // Set deadline (5 minutes from now)
    const deadline = Math.floor(Date.now() / 1000) + 300;

    // Create the payment data
    const paymentData: StarknetExactPayload = {
      from: accountAddress,
      to: requirement.payTo,
      token: requirement.asset,
      amount: requirement.maxAmountRequired,
      nonce: nonce.toString(),
      deadline,
      signature: { r: '0x0', s: '0x0' }, // Placeholder
    };

    // Sign the payment
    const signature = await this.signPayment(paymentData);
    paymentData.signature = signature;

    // Create the payment payload
    const payload: PaymentPayload = {
      x402Version: X402_VERSION,
      scheme: requirement.scheme,
      network: this.config.network,
      payload: paymentData,
    };

    // Encode as base64
    const encoded = Buffer.from(JSON.stringify(payload)).toString('base64');
    return encoded;
  }

  /**
   * Signs a payment using the account's private key
   */
  private async signPayment(
    paymentData: StarknetExactPayload
  ): Promise<{ r: string; s: string }> {
    // Compute the message hash
    const messageHash = this.computePaymentHash(paymentData);

    // Sign using the account
    const signature = await this.config.account.signMessage({
      domain: {
        name: 'x402',
        version: '1',
      },
      types: {
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
      message: {
        from: paymentData.from,
        to: paymentData.to,
        token: paymentData.token,
        amount: paymentData.amount,
        nonce: paymentData.nonce,
        deadline: paymentData.deadline.toString(),
      },
    });

    return {
      r: signature[0],
      s: signature[1],
    };
  }

  /**
   * Computes the hash of payment data
   */
  private computePaymentHash(paymentData: StarknetExactPayload): string {
    const data = [
      paymentData.from,
      paymentData.to,
      paymentData.token,
      paymentData.amount,
      paymentData.nonce,
      paymentData.deadline.toString(),
    ];

    return hash.computeHashOnElements(data);
  }

  /**
   * Gets the current nonce for an account
   */
  private async getNonce(accountAddress: string): Promise<bigint> {
    try {
      // In production, query the PaymentProcessor contract for the nonce
      // For now, return 0
      return BigInt(0);
    } catch (error) {
      console.error('Failed to get nonce:', error);
      return BigInt(0);
    }
  }

  /**
   * Checks if auto-approval is enabled for an amount
   */
  private shouldAutoApprove(amount: string): boolean {
    if (!this.config.autoApproveThreshold) {
      return false;
    }

    const amountBigInt = BigInt(amount);
    return amountBigInt <= this.config.autoApproveThreshold;
  }
}

/**
 * Creates a payment client instance
 */
export function createPaymentClient(
  config: PaymentClientConfig
): PaymentClient {
  return new PaymentClient(config);
}

/**
 * Convenience function to make a single paid request
 */
export async function payForResource(
  url: string,
  account: Account,
  provider: RpcProvider,
  network: string = 'starknet-sepolia',
  options?: AxiosRequestConfig
): Promise<PaymentResult> {
  const client = createPaymentClient({
    account,
    provider,
    network,
  });

  return await client.pay(url, options);
}




