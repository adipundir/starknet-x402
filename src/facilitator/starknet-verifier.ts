/**
 * Starknet Payment Verifier (SNIP-9 Outside Execution)
 *
 * Verifies that the signed OutsideExecution contains the correct
 * transfer call matching the payment requirements.
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
import { CallData, RpcProvider, hash, num } from 'starknet';

export class StarknetVerifier {
  private provider: RpcProvider;

  constructor(config: FacilitatorConfig) {
    this.provider = new RpcProvider({ nodeUrl: config.rpcUrl });
  }

  async verifyExactPayment(
    payload: StarknetExactPayload,
    requirements: PaymentRequirements,
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

      // 2. Verify recipient matches (normalize to handle leading zero differences)
      const norm = (addr: string) => num.toHex(addr).toLowerCase();

      if (norm(payload.to) !== norm(requirements.payTo)) {
        return { isValid: false, invalidReason: 'invalid_recipient_mismatch', payer: payload.from };
      }

      // 3. Verify token matches
      if (norm(payload.token) !== norm(requirements.asset)) {
        return { isValid: false, invalidReason: 'invalid_token_mismatch', payer: payload.from };
      }

      // 4. Verify amount >= required
      const paymentAmount = BigInt(payload.amount);
      const requiredAmount = getRequiredAmount(requirements);
      if (paymentAmount < requiredAmount) {
        return { isValid: false, invalidReason: `invalid_amount: sent ${paymentAmount}, need ${requiredAmount}`, payer: payload.from };
      }

      // 5. Verify OutsideExecution is present
      if (!payload.outsideExecution?.typedData || !payload.outsideExecution?.signature?.length) {
        return { isValid: false, invalidReason: 'invalid_payload: missing outsideExecution', payer: payload.from };
      }

      // 6. Verify the OutsideExecution typed data contains the correct transfer call
      const td = payload.outsideExecution.typedData;
      const calls = td?.message?.Calls;
      if (!calls || calls.length === 0) {
        return { isValid: false, invalidReason: 'invalid_payload: no calls in OutsideExecution', payer: payload.from };
      }

      // The first call should be token.transfer(recipient, amount)
      const call = calls[0];
      const transferSelector = num.toHex(hash.getSelectorFromName('transfer'));

      const normalize = (addr: string) => num.toHex(addr).toLowerCase();

      if (normalize(call.To) !== normalize(payload.token)) {
        return { isValid: false, invalidReason: 'invalid_payload: call target does not match token', payer: payload.from };
      }
      if (normalize(call.Selector) !== normalize(transferSelector)) {
        return { isValid: false, invalidReason: 'invalid_payload: call is not a transfer', payer: payload.from };
      }

      // Verify calldata: [recipient, amount_low, amount_high]
      const calldata = call.Calldata;
      if (!calldata || calldata.length < 2) {
        return { isValid: false, invalidReason: 'invalid_payload: missing transfer calldata', payer: payload.from };
      }

      if (normalize(calldata[0]) !== normalize(payload.to)) {
        return { isValid: false, invalidReason: 'invalid_payload: transfer recipient does not match', payer: payload.from };
      }

      const callAmountLow = BigInt(calldata[1]);
      const callAmountHigh = calldata.length >= 3 ? BigInt(calldata[2]) : 0n;
      const callAmount = callAmountLow + (callAmountHigh << 128n);
      if (callAmount < requiredAmount) {
        return { isValid: false, invalidReason: `invalid_amount: transfer amount ${callAmount} < required ${requiredAmount}`, payer: payload.from };
      }

      // 7. Verify execute_before hasn't passed (deadline)
      const executeBefore = Number(td.message?.['Execute Before']);
      if (executeBefore && executeBefore <= Math.floor(Date.now() / 1000)) {
        return { isValid: false, invalidReason: 'invalid_deadline: OutsideExecution expired', payer: payload.from };
      }

      // 8. Verify signature by calling is_valid_signature on the client's account
      //    Note: The account will also verify this during execute_from_outside_v2,
      //    but we check early to fail fast and save gas.
      try {
        const { typedData } = await import('starknet');
        const messageHash = typedData.getMessageHash(td, payload.from);

        const sigResult = await this.provider.callContract({
          contractAddress: payload.from,
          entrypoint: 'is_valid_signature',
          calldata: CallData.compile({
            hash: messageHash,
            signature: payload.outsideExecution.signature,
          }),
        });

        const VALID = '0x56414c4944';
        const isValid = sigResult[0] === VALID || BigInt(sigResult[0]) === BigInt(VALID);
        if (!isValid) {
          return { isValid: false, invalidReason: 'invalid_signature', payer: payload.from };
        }
      } catch (sigError) {
        console.error('[StarknetVerifier] Signature verification failed:', sigError instanceof Error ? sigError.message : sigError);
        return { isValid: false, invalidReason: 'invalid_signature: on-chain verification failed', payer: payload.from };
      }

      // 9. Check client has sufficient token balance
      try {
        const balanceResult = await this.provider.callContract({
          contractAddress: payload.token,
          entrypoint: 'balanceOf',
          calldata: [payload.from],
        });
        const balance = parseU256(balanceResult);
        if (balance < paymentAmount) {
          return { isValid: false, invalidReason: `insufficient_funds: balance ${balance}, need ${paymentAmount}`, payer: payload.from };
        }
      } catch (balError) {
        console.error('[StarknetVerifier] Balance check failed:', balError instanceof Error ? balError.message : balError);
        return { isValid: false, invalidReason: 'unexpected_verify_error: balance check failed', payer: payload.from };
      }

      // No allowance check needed — SNIP-9 Outside Execution doesn't use transfer_from

      return { isValid: true, invalidReason: null, payer: payload.from };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unexpected_verify_error';
      return { isValid: false, invalidReason: message, payer: payload.from };
    }
  }
}
