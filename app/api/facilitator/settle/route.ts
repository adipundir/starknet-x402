/**
 * Facilitator Settlement Endpoint (x402 v2 / SNIP-9)
 *
 * Submits the client's pre-signed OutsideExecution to AVNU paymaster.
 * The client's account executes token.transfer() directly.
 * No transfer_from, no approval needed.
 *
 * Flow: decode → verify → submit to AVNU → wait for confirmation.
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

function failSettle(errorReason: string, network: string | null, payer?: string): NextResponse<SettleResponse> {
  console.log(`[facilitator /settle] FAILED: ${errorReason}`);
  return NextResponse.json(buildSettleResponse({ success: false, errorReason, network, payer }));
}

export async function POST(request: NextRequest) {
  console.log('[facilitator /settle] Request received');

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
    console.log('[facilitator /settle] Decoding payload...');
    const payload = decodePaymentHeader(paymentHeader);
    if (!validatePaymentPayload(payload)) {
      return failSettle('Invalid payment header encoding', null);
    }

    const inner = payload.payload;
    const network = payload.accepted.network;
    console.log(`[facilitator /settle] Payer: ${inner.from.slice(0, 16)}... | Amount: ${inner.amount} | Network: ${network}`);

    // Network validation
    const supportedNetworks: string[] = [NETWORKS.STARKNET_SEPOLIA, NETWORKS.STARKNET_MAINNET];
    if (!supportedNetworks.includes(network)) {
      return failSettle(`Unsupported network: ${network}`, network, inner.from);
    }

    // Verify OutsideExecution data is present
    if (!inner.outsideExecution?.typedData || !inner.outsideExecution?.signature?.length) {
      return failSettle('Missing outsideExecution data', network, inner.from);
    }

    // Verify first
    console.log('[facilitator /settle] Calling /verify...');
    const verifyStart = Date.now();
    const verifyUrl = new URL('/api/facilitator/verify', request.url);
    const verifyRes = await fetch(verifyUrl.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ x402Version, paymentHeader, paymentRequirements }),
    });

    if (!verifyRes.ok) {
      return failSettle(`Verification endpoint returned HTTP ${verifyRes.status}`, network, inner.from);
    }

    const verification = await verifyRes.json() as { isValid: boolean; invalidReason?: string };
    console.log(`[facilitator /settle] Verification: ${verification.isValid ? 'VALID' : 'INVALID'} (${Date.now() - verifyStart}ms)`);
    if (!verification.isValid) {
      return failSettle(verification.invalidReason || 'Payment verification failed', network, inner.from);
    }

    // Configuration
    const paymasterUrl = process.env.PAYMASTER_URL;
    const paymasterApiKey = process.env.PAYMASTER_API_KEY;
    const nodeUrl = process.env.STARKNET_NODE_URL || process.env.NEXT_PUBLIC_STARKNET_NODE_URL;

    if (!paymasterUrl || !paymasterApiKey) {
      return failSettle('Facilitator not configured: PAYMASTER_URL and PAYMASTER_API_KEY required', network, inner.from);
    }

    if (!nodeUrl) {
      return failSettle('Facilitator not configured: STARKNET_NODE_URL required', network, inner.from);
    }

    // Submit to AVNU paymaster
    try {
      console.log('[facilitator /settle] Submitting to AVNU paymaster...');
      const settleStart = Date.now();

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

      const transaction_hash = (result as any).transaction_hash;
      if (!transaction_hash) {
        return failSettle('Paymaster did not return transaction_hash', network, inner.from);
      }

      console.log(`[facilitator /settle] AVNU submitted tx: ${transaction_hash.slice(0, 20)}... (${Date.now() - settleStart}ms)`);
      console.log('[facilitator /settle] Waiting for on-chain confirmation...');

      // Wait for on-chain confirmation
      const provider = new RpcProvider({ nodeUrl });
      await provider.waitForTransaction(transaction_hash, {
        successStates: ['ACCEPTED_ON_L2', 'ACCEPTED_ON_L1'],
      });

      console.log(`[facilitator /settle] CONFIRMED | Tx: ${transaction_hash} | Payer: ${inner.from.slice(0, 16)}... | Amount: ${inner.amount}`);

      return NextResponse.json(buildSettleResponse({
        success: true,
        transaction: transaction_hash,
        network,
        payer: inner.from,
        amount: inner.amount,
      }));
    } catch (execError) {
      const message = execError instanceof Error ? execError.message : 'Settlement execution failed';
      console.error('[facilitator /settle] Execution error:', message);
      return failSettle(message, network, inner.from);
    }
  } catch (error) {
    console.error('[facilitator /settle] Unexpected error:', error);
    return NextResponse.json(
      buildSettleResponse({ success: false, errorReason: 'unexpected_settle_error' }),
      { status: 500 },
    );
  }
}
