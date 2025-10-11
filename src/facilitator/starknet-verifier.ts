/**
 * Starknet Payment Verifier
 * 
 * Handles verification of payment signatures and validity
 * without executing transactions on-chain.
 */

import {
  StarknetExactPayload,
  PaymentRequirements,
  VerifyResponse,
  FacilitatorConfig,
  VerificationError,
} from '../types/x402';
import { hash, ec, CallData, Account, RpcProvider } from 'starknet';

export class StarknetVerifier {
  private config: FacilitatorConfig;
  private provider: RpcProvider;

  constructor(config: FacilitatorConfig) {
    this.config = config;
    this.provider = new RpcProvider({ nodeUrl: config.rpcUrl });
  }

  /**
   * Verifies an exact payment signature and parameters
   */
  async verifyExactPayment(
    payload: StarknetExactPayload,
    requirements: PaymentRequirements
  ): Promise<VerifyResponse> {
    try {
      // 1. Verify basic fields
      if (!this.isValidStarknetAddress(payload.from)) {
        return {
          isValid: false,
          invalidReason: 'Invalid sender address',
        };
      }

      if (!this.isValidStarknetAddress(payload.to)) {
        return {
          isValid: false,
          invalidReason: 'Invalid recipient address',
        };
      }

      if (!this.isValidStarknetAddress(payload.token)) {
        return {
          isValid: false,
          invalidReason: 'Invalid token address',
        };
      }

      // 2. Verify recipient matches requirements
      if (payload.to.toLowerCase() !== requirements.payTo.toLowerCase()) {
        return {
          isValid: false,
          invalidReason: 'Recipient address does not match requirements',
        };
      }

      // 3. Verify token matches requirements
      if (payload.token.toLowerCase() !== requirements.asset.toLowerCase()) {
        return {
          isValid: false,
          invalidReason: 'Token address does not match requirements',
        };
      }

      // 4. Verify amount
      const amount = BigInt(payload.amount);
      const maxAmount = BigInt(requirements.maxAmountRequired);
      
      if (amount > maxAmount) {
        return {
          isValid: false,
          invalidReason: `Amount ${amount} exceeds maximum ${maxAmount}`,
        };
      }

      if (amount <= 0n) {
        return {
          isValid: false,
          invalidReason: 'Amount must be greater than zero',
        };
      }

      // 5. Verify deadline
      const now = Math.floor(Date.now() / 1000);
      if (payload.deadline <= now) {
        return {
          isValid: false,
          invalidReason: 'Payment deadline has expired',
        };
      }

      // Verify deadline is within acceptable timeout
      const timeUntilDeadline = payload.deadline - now;
      if (timeUntilDeadline > requirements.maxTimeoutSeconds) {
        return {
          isValid: false,
          invalidReason: 'Payment deadline exceeds maximum timeout',
        };
      }

      // 6. Verify signature
      const isSignatureValid = await this.verifySignature(payload);
      
      if (!isSignatureValid) {
        return {
          isValid: false,
          invalidReason: 'Invalid signature',
        };
      }

      // 7. Verify nonce (check if payment already executed)
      const isNonceValid = await this.verifyNonce(payload);
      
      if (!isNonceValid) {
        return {
          isValid: false,
          invalidReason: 'Invalid or already used nonce',
        };
      }

      // 8. Check sender has sufficient balance (optional but recommended)
      const hasSufficientBalance = await this.checkBalance(
        payload.from,
        payload.token,
        amount
      );

      if (!hasSufficientBalance) {
        return {
          isValid: false,
          invalidReason: 'Insufficient token balance',
        };
      }

      // All checks passed
      return {
        isValid: true,
        invalidReason: null,
      };
    } catch (error) {
      console.error('Error verifying payment:', error);
      return {
        isValid: false,
        invalidReason: error instanceof Error ? error.message : 'Verification error',
      };
    }
  }

  /**
   * Verifies a Starknet signature
   */
  private async verifySignature(payload: StarknetExactPayload): Promise<boolean> {
    try {
      // Compute the message hash
      const messageHash = this.computePaymentHash(payload);

      // Get the public key from the account contract
      const publicKey = await this.getAccountPublicKey(payload.from);

      if (!publicKey) {
        return false;
      }

      // Verify the signature using Starknet's EC signature verification
      const signature = [payload.signature.r, payload.signature.s];
      
      // Use starknet.js to verify the signature
      const isValid = ec.starkCurve.verify(
        signature,
        messageHash,
        publicKey
      );

      return isValid;
    } catch (error) {
      console.error('Signature verification error:', error);
      return false;
    }
  }

  /**
   * Computes the hash of the payment data
   */
  private computePaymentHash(payload: StarknetExactPayload): string {
    // Create a structured hash of the payment data
    // This follows the EIP-712 style but adapted for Starknet
    
    const data = [
      payload.from,
      payload.to,
      payload.token,
      payload.amount,
      payload.nonce,
      payload.deadline.toString(),
    ];

    // Use Pedersen hash (Starknet's native hash function)
    const messageHash = hash.computeHashOnElements(data);
    return messageHash;
  }

  /**
   * Gets the public key from a Starknet account
   */
  private async getAccountPublicKey(address: string): Promise<string | null> {
    try {
      // Call the get_public_key function on the account contract
      // Note: Not all account contracts expose this, may need to use other methods
      
      const result = await this.provider.callContract({
        contractAddress: address,
        entrypoint: 'get_public_key',
        calldata: [],
      });

      if (result && result.length > 0) {
        return result[0];
      }

      return null;
    } catch (error) {
      console.error('Error getting public key:', error);
      return null;
    }
  }

  /**
   * Verifies the nonce is correct and not already used
   */
  private async verifyNonce(payload: StarknetExactPayload): Promise<boolean> {
    try {
      // In a production system, you would:
      // 1. Query the PaymentProcessor contract for the current nonce
      // 2. Check if this payment hash has already been executed
      
      // For now, we'll do a basic check
      const nonce = BigInt(payload.nonce);
      
      // Nonce should be non-negative
      if (nonce < 0n) {
        return false;
      }

      // TODO: Query the PaymentProcessor contract to verify nonce
      // const currentNonce = await this.getOnChainNonce(payload.from);
      // return nonce === currentNonce;

      return true; // Simplified for now
    } catch (error) {
      console.error('Nonce verification error:', error);
      return false;
    }
  }

  /**
   * Checks if the sender has sufficient token balance
   */
  private async checkBalance(
    address: string,
    tokenAddress: string,
    amount: bigint
  ): Promise<boolean> {
    try {
      // Query the ERC20 token contract for balance
      const result = await this.provider.callContract({
        contractAddress: tokenAddress,
        entrypoint: 'balanceOf',
        calldata: CallData.compile({ account: address }),
      });

      if (result && result.length >= 2) {
        // Balance is returned as u256 (low, high)
        const balanceLow = BigInt(result[0]);
        const balanceHigh = BigInt(result[1]);
        const balance = balanceLow + (balanceHigh << 128n);

        return balance >= amount;
      }

      return false;
    } catch (error) {
      console.error('Balance check error:', error);
      return false;
    }
  }

  /**
   * Validates a Starknet address format
   */
  private isValidStarknetAddress(address: string): boolean {
    // Starknet addresses are 32-byte felt values
    // They should start with '0x' and be 66 characters or less
    if (!address || typeof address !== 'string') {
      return false;
    }

    // Remove 0x prefix if present
    const cleanAddress = address.startsWith('0x') ? address.slice(2) : address;

    // Check if it's a valid hexadecimal string
    if (!/^[0-9a-fA-F]+$/.test(cleanAddress)) {
      return false;
    }

    // Check length (64 hex chars = 32 bytes)
    if (cleanAddress.length > 64) {
      return false;
    }

    return true;
  }
}

