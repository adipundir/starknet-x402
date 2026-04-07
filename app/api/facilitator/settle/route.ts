/**
 * Facilitator Settlement Endpoint (x402 v2 / SNIP-9)
 *
 * Assumes the middleware has already called /verify.
 * Flow: decode → submit to AVNU → confirm.
 */

import { NextRequest, NextResponse } from 'next/server';
import { RpcProvider, PaymasterRpc } from 'starknet';
import {
  type PaymentRequirements,
  type SettleResponse,
  decodePaymentHeader,
  validatePaymentPayload,
  buildSettleResponse,
  NETWORKS,
} from '../../../../src/types/x402';

const SUPPORTED_NETWORKS: Set<string> = new Set([NETWORKS.STARKNET_SEPOLIA, NETWORKS.STARKNET_MAINNET]);

function fail(errorReason: string, network: string | null, payer?: string): NextResponse<SettleResponse> {
  return NextResponse.json(buildSettleResponse({ success: false, errorReason, network, payer }));
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { x402Version, paymentHeader, paymentRequirements } = body as {
      x402Version: number;
      paymentHeader: string;
      paymentRequirements: PaymentRequirements;
    };

    if (!x402Version || !paymentHeader || !paymentRequirements) {
      return NextResponse.json(
        buildSettleResponse({ success: false, errorReason: 'Missing required fields' }),
        { status: 400 },
      );
    }

    // Decode
    const payload = decodePaymentHeader(paymentHeader);
    if (!validatePaymentPayload(payload)) {
      return fail('Invalid payment header encoding', null);
    }

    const inner = payload.payload;
    const network = payload.accepted.network;

    if (!SUPPORTED_NETWORKS.has(network)) {
      return fail(`Unsupported network: ${network}`, network, inner.from);
    }

    if (!inner.outsideExecution?.typedData || !inner.outsideExecution?.signature?.length) {
      return fail('Missing outsideExecution data', network, inner.from);
    }

    // Config
    const paymasterUrl = process.env.PAYMASTER_URL;
    const paymasterApiKey = process.env.PAYMASTER_API_KEY;
    const nodeUrl = process.env.STARKNET_NODE_URL || process.env.NEXT_PUBLIC_STARKNET_NODE_URL;

    if (!paymasterUrl || !paymasterApiKey) {
      return fail('PAYMASTER_URL and PAYMASTER_API_KEY required', network, inner.from);
    }
    if (!nodeUrl) {
      return fail('STARKNET_NODE_URL required', network, inner.from);
    }

    try {
      console.log(`[facilitator /settle] Submitting to AVNU paymaster for payer=${inner.from} amount=${inner.amount} network=${network}`);
      const submitStart = Date.now();
      const paymaster = new PaymasterRpc({
        nodeUrl: paymasterUrl,
        headers: { 'x-paymaster-api-key': paymasterApiKey },
      });

      const result = await paymaster.executeTransaction(
        {
          type: 'invoke' as const,
          invoke: {
            userAddress: inner.from,
            typedData: inner.outsideExecution.typedData,
            signature: inner.outsideExecution.signature,
          },
        },
        {
          version: '0x1',
          feeMode: { mode: 'sponsored' as const },
        },
      );

      const { transaction_hash } = result as { transaction_hash: string };
      console.log(`[facilitator /settle] Paymaster responded in ${Date.now() - submitStart}ms, tx_hash=${transaction_hash ?? 'none'}`);

      if (!transaction_hash) {
        return fail('Paymaster did not return transaction_hash', network, inner.from);
      }

      console.log(`[facilitator /settle] Waiting for on-chain confirmation...`);
      const confirmStart = Date.now();
      const provider = new RpcProvider({ nodeUrl });
      await provider.waitForTransaction(transaction_hash, {
        successStates: ['ACCEPTED_ON_L2', 'ACCEPTED_ON_L1'],
      });
      console.log(`[facilitator /settle] CONFIRMED on-chain in ${Date.now() - confirmStart}ms, tx=${transaction_hash}`);

      return NextResponse.json(buildSettleResponse({
        success: true,
        transaction: transaction_hash,
        network,
        payer: inner.from,
        amount: inner.amount,
      }));
    } catch (execError) {
      const message = execError instanceof Error ? execError.message : 'Settlement execution failed';
      console.error('[facilitator /settle]', message);
      return fail(message, network, inner.from);
    }
  } catch (error) {
    console.error('[facilitator /settle]', error instanceof Error ? error.message : error);
    return NextResponse.json(
      buildSettleResponse({ success: false, errorReason: 'unexpected_settle_error' }),
      { status: 500 },
    );
  }
}
