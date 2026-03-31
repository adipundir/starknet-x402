/**
 * Starknet Payment Settler
 *
 * Executes verified payments on the Starknet blockchain via transfer_from.
 */

import {
  StarknetExactPayload,
  PaymentRequirements,
  SettleResponse,
  FacilitatorConfig,
  SettlementError,
  buildSettleResponse,
} from '../types/x402';
import { reserveNonce } from './nonce-tracker';
import { Account, RpcProvider } from 'starknet';

export class StarknetSettler {
  private provider: RpcProvider;
  private account: Account;

  constructor(config: FacilitatorConfig) {
    this.provider = new RpcProvider({ nodeUrl: config.rpcUrl });

    if (!config.privateKey || !config.facilitatorAddress) {
      throw new SettlementError('Facilitator privateKey and facilitatorAddress are required');
    }

    this.account = new Account(
      this.provider,
      config.facilitatorAddress,
      config.privateKey,
    );
  }

  async settleExactPayment(
    payload: StarknetExactPayload,
    requirements: PaymentRequirements,
  ): Promise<SettleResponse> {
    const network = requirements.network;

    // Atomically reserve the nonce to prevent double-settlement
    if (!reserveNonce(payload.nonce)) {
      return buildSettleResponse({
        success: false,
        network,
        errorReason: 'invalid_transaction_state: nonce already settled',
        payer: payload.from,
      });
    }

    try {
      // Build transfer_from call on the ERC20 token
      const call = {
        contractAddress: payload.token,
        entrypoint: 'transfer_from',
        calldata: [
          payload.from,  // sender
          payload.to,    // recipient
          payload.amount, // amount low
          '0',           // amount high (u256)
        ],
      };

      // Standard execution with gas estimation
      const feeEstimate = await this.account.estimateInvokeFee(call);
      const suggestedMaxFee = BigInt(feeEstimate.suggestedMaxFee.toString());
      const maxFee = (suggestedMaxFee * 150n) / 100n;

      const { transaction_hash } = await this.account.execute(call, { maxFee });

      // Wait for on-chain confirmation
      await this.provider.waitForTransaction(transaction_hash, {
        successStates: ['ACCEPTED_ON_L2', 'ACCEPTED_ON_L1'],
      });

      return buildSettleResponse({
        success: true,
        transaction: transaction_hash,
        network,
        payer: payload.from,
        amount: payload.amount,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'unexpected_settle_error';
      console.error('[StarknetSettler] Settlement failed:', message);
      return buildSettleResponse({
        success: false,
        network,
        errorReason: message,
        payer: payload.from,
      });
    }
  }
}
