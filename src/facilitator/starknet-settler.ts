/**
 * Starknet Payment Settler (SNIP-9 Outside Execution)
 *
 * Submits the client's pre-signed OutsideExecution to AVNU paymaster
 * for on-chain execution. The client's account executes token.transfer()
 * directly — no transfer_from, no approval needed.
 */

import {
  StarknetExactPayload,
  PaymentRequirements,
  SettleResponse,
  FacilitatorConfig,
  SettlementError,
  buildSettleResponse,
} from '../types/x402';
import { PaymasterRpc, RpcProvider } from 'starknet';

export class StarknetSettler {
  private provider: RpcProvider;
  private paymasterUrl: string;
  private paymasterApiKey: string;

  constructor(config: FacilitatorConfig) {
    this.provider = new RpcProvider({ nodeUrl: config.rpcUrl });

    if (!config.paymasterUrl || !config.paymasterApiKey) {
      throw new SettlementError('paymasterUrl and paymasterApiKey are required for SNIP-9 settlement');
    }

    this.paymasterUrl = config.paymasterUrl;
    this.paymasterApiKey = config.paymasterApiKey;
  }

  async settleExactPayment(
    payload: StarknetExactPayload,
    requirements: PaymentRequirements,
  ): Promise<SettleResponse> {
    const network = requirements.network;

    if (!payload.outsideExecution?.typedData || !payload.outsideExecution?.signature?.length) {
      return buildSettleResponse({
        success: false,
        network,
        errorReason: 'Missing outsideExecution data',
        payer: payload.from,
      });
    }

    try {
      // Submit the pre-signed OutsideExecution to AVNU paymaster
      const paymaster = new PaymasterRpc({
        nodeUrl: this.paymasterUrl,
        headers: { 'x-paymaster-api-key': this.paymasterApiKey },
      });

      const result = await paymaster.executeTransaction(
        {
          type: 'invoke' as const,
          invoke: {
            userAddress: payload.from,
            typedData: payload.outsideExecution.typedData,
            signature: payload.outsideExecution.signature,
          },
        },
        {
          version: '0x1',
          feeMode: { mode: 'sponsored' as const },
        },
      );

      const { transaction_hash } = result as { transaction_hash: string };
      if (!transaction_hash) {
        return buildSettleResponse({
          success: false,
          network,
          errorReason: 'Paymaster did not return transaction_hash',
          payer: payload.from,
        });
      }

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
