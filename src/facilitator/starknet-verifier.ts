/**
 * Starknet Payment Verifier
 *
 * Verifies payment signatures and on-chain conditions (balance, allowance)
 * without executing transactions.
 */

import {
  StarknetExactPayload,
  PaymentRequirements,
  VerifyResponse,
  FacilitatorConfig,
  getRequiredAmount,
  isValidStarknetAddress,
  parseU256,
} from '../types/x402';
import { buildPaymentTypedData } from '../types/typed-data';
import { isNonceFresh } from './nonce-tracker';
import { typedData, CallData, RpcProvider } from 'starknet';

export class StarknetVerifier {
  private provider: RpcProvider;
  private facilitatorAddress: string;

  constructor(config: FacilitatorConfig) {
    this.provider = new RpcProvider({ nodeUrl: config.rpcUrl });
    this.facilitatorAddress = config.facilitatorAddress;
  }

  async verifyExactPayment(
    payload: StarknetExactPayload,
    requirements: PaymentRequirements,
    network: string,
  ): Promise<VerifyResponse> {
    try {
      // 1. Validate addresses
      if (!isValidStarknetAddress(payload.from)) {
        return { isValid: false, invalidReason: 'invalid_payload: bad sender address', payer: payload.from };
      }
      if (!isValidStarknetAddress(payload.to)) {
        return { isValid: false, invalidReason: 'invalid_payload: bad recipient address', payer: payload.from };
      }
      if (!isValidStarknetAddress(payload.token)) {
        return { isValid: false, invalidReason: 'invalid_payload: bad token address', payer: payload.from };
      }

      // 2. Verify recipient matches
      if (payload.to.toLowerCase() !== requirements.payTo.toLowerCase()) {
        return { isValid: false, invalidReason: 'invalid_recipient_mismatch', payer: payload.from };
      }

      // 3. Verify token matches
      if (payload.token.toLowerCase() !== requirements.asset.toLowerCase()) {
        return { isValid: false, invalidReason: 'invalid_token_mismatch', payer: payload.from };
      }

      // 4. Verify amount >= required
      const paymentAmount = BigInt(payload.amount);
      const requiredAmount = getRequiredAmount(requirements);
      if (paymentAmount < requiredAmount) {
        return { isValid: false, invalidReason: `invalid_amount: sent ${paymentAmount}, need ${requiredAmount}`, payer: payload.from };
      }
      if (paymentAmount <= 0n) {
        return { isValid: false, invalidReason: 'invalid_amount: must be > 0', payer: payload.from };
      }

      // 5. Verify deadline
      const now = Math.floor(Date.now() / 1000);
      if (payload.deadline <= now) {
        return { isValid: false, invalidReason: 'invalid_deadline: expired', payer: payload.from };
      }
      if (payload.deadline - now > requirements.maxTimeoutSeconds) {
        return { isValid: false, invalidReason: 'invalid_deadline: exceeds maxTimeoutSeconds', payer: payload.from };
      }

      // 6. Verify nonce is fresh (replay protection)
      if (!isNonceFresh(payload.nonce)) {
        return { isValid: false, invalidReason: 'invalid_transaction_state: nonce already used', payer: payload.from };
      }

      // 7. Verify signature
      if (!payload.signature?.r || !payload.signature?.s) {
        return { isValid: false, invalidReason: 'invalid_signature: missing', payer: payload.from };
      }
      const sigValid = await this.verifySignature(payload, network);
      if (!sigValid) {
        return { isValid: false, invalidReason: 'invalid_signature', payer: payload.from };
      }

      // 8. Check on-chain balance
      const balance = await this.getBalance(payload.from, payload.token);
      if (balance < paymentAmount) {
        return { isValid: false, invalidReason: `insufficient_funds: balance ${balance}, need ${paymentAmount}`, payer: payload.from };
      }

      // 9. Check on-chain allowance to facilitator
      if (this.facilitatorAddress) {
        const allowance = await this.getAllowance(payload.from, payload.token, this.facilitatorAddress);
        if (allowance < paymentAmount) {
          return {
            isValid: false,
            invalidReason: `insufficient_funds: allowance ${allowance}, need ${paymentAmount}. Approve the facilitator first.`,
            payer: payload.from,
          };
        }
      }

      return { isValid: true, invalidReason: null, payer: payload.from };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unexpected_verify_error';
      return { isValid: false, invalidReason: message, payer: payload.from };
    }
  }

  /**
   * Verify signature by calling is_valid_signature on the account contract.
   * This is the standard Starknet account-abstraction approach — it works
   * with all account implementations (Argent, Braavos, OpenZeppelin, etc).
   */
  private async verifySignature(payload: StarknetExactPayload, network: string): Promise<boolean> {
    try {
      const td = buildPaymentTypedData(payload, network);
      const messageHash = typedData.getMessageHash(td, payload.from);

      const result = await this.provider.callContract({
        contractAddress: payload.from,
        entrypoint: 'is_valid_signature',
        calldata: CallData.compile({
          hash: messageHash,
          signature: [payload.signature.r, payload.signature.s],
        }),
      });

      // Account contract returns felt252 'VALID' (0x56414c4944) on success
      const VALID = '0x56414c4944';
      return result[0] === VALID || BigInt(result[0]) === BigInt(VALID);
    } catch (error) {
      console.error('[StarknetVerifier] Signature verification failed:', error instanceof Error ? error.message : error);
      return false;
    }
  }

  private async getBalance(owner: string, token: string): Promise<bigint> {
    try {
      const result = await this.provider.callContract({
        contractAddress: token,
        entrypoint: 'balanceOf',
        calldata: CallData.compile({ account: owner }),
      });
      return parseU256(result);
    } catch (error) {
      console.error('[StarknetVerifier] Balance check failed:', error instanceof Error ? error.message : error);
      return 0n;
    }
  }

  private async getAllowance(owner: string, token: string, spender: string): Promise<bigint> {
    try {
      const result = await this.provider.callContract({
        contractAddress: token,
        entrypoint: 'allowance',
        calldata: CallData.compile({ owner, spender }),
      });
      return parseU256(result);
    } catch (error) {
      console.error('[StarknetVerifier] Allowance check failed:', error instanceof Error ? error.message : error);
      return 0n;
    }
  }
}
