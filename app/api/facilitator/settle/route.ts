/**
 * Facilitator Settlement Endpoint (x402 v2)
 *
 * Settles verified payments on Starknet via transfer_from.
 * Supports AVNU paymaster for gas sponsoring when configured.
 * Flow: decode → verify → reserve nonce → execute → confirm.
 */

import { NextRequest, NextResponse } from 'next/server';
import { Account, RpcProvider, PaymasterRpc } from 'starknet';
import {
  type PaymentRequirements,
  type SettleResponse,
  decodePaymentHeader,
  validatePaymentPayload,
  buildSettleResponse,
  NETWORKS,
} from '../../../../src/types/x402';
import { reserveNonce } from '../../../../src/facilitator/nonce-tracker';

function failSettle(errorReason: string, network: string | null, payer?: string): NextResponse<SettleResponse> {
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
      return failSettle('Invalid payment header encoding', null);
    }

    const inner = payload.payload;
    const network = payload.accepted.network;

    // Network validation
    const supportedNetworks: string[] = [NETWORKS.STARKNET_SEPOLIA, NETWORKS.STARKNET_MAINNET];
    if (!supportedNetworks.includes(network)) {
      return failSettle(`Unsupported network: ${network}`, network, inner.from);
    }

    // Step 1: Verify first
    const verifyUrl = new URL('/api/facilitator/verify', request.url);
    const verifyRes = await fetch(verifyUrl.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ x402Version, paymentHeader, paymentRequirements }),
    });
    const verification = await verifyRes.json() as { isValid: boolean; invalidReason?: string };

    if (!verification.isValid) {
      return failSettle(verification.invalidReason || 'Payment verification failed', network, inner.from);
    }

    // Step 2: Reserve nonce (idempotency / double-spend guard)
    if (!reserveNonce(inner.nonce)) {
      return failSettle('invalid_transaction_state: nonce already settled', network, inner.from);
    }

    // Step 3: Configuration
    const nodeUrl = process.env.STARKNET_NODE_URL
      || process.env.NEXT_PUBLIC_STARKNET_NODE_URL
      || 'https://starknet-sepolia.public.blastapi.io';
    const privateKey = process.env.FACILITATOR_PRIVATE_KEY;
    const accountAddress = process.env.NEXT_PUBLIC_FACILITATOR_ADDRESS;

    if (!privateKey || !accountAddress) {
      return failSettle(
        'Facilitator not configured: ' +
          (!privateKey ? 'FACILITATOR_PRIVATE_KEY ' : '') +
          (!accountAddress ? 'NEXT_PUBLIC_FACILITATOR_ADDRESS' : ''),
        network,
        inner.from,
      );
    }

    // Step 4: Execute transfer_from
    try {
      const provider = new RpcProvider({ nodeUrl });
      const facilitatorAccount = new Account(provider, accountAddress, privateKey);

      const calls = [{
        contractAddress: inner.token,
        entrypoint: 'transfer_from',
        calldata: [
          inner.from,   // sender
          inner.to,     // recipient
          inner.amount, // amount low
          '0',          // amount high (u256)
        ],
      }];

      let transaction_hash: string;

      const paymasterUrl = process.env.PAYMASTER_URL;
      const paymasterApiKey = process.env.PAYMASTER_API_KEY;

      if (paymasterUrl && paymasterApiKey) {
        // Try AVNU paymaster for gas-sponsored settlement, fall back to standard
        try {
          const paymaster = new PaymasterRpc({
            nodeUrl: paymasterUrl,
            headers: { 'x-paymaster-api-key': paymasterApiKey },
          });

          const buildResult = await paymaster.buildTransaction(
            { type: 'invoke' as const, invoke: { userAddress: accountAddress, calls } },
            { version: '0x1', feeMode: { mode: 'sponsored' as const } },
          );

          if (buildResult.type !== 'invoke' || !('typed_data' in buildResult)) {
            throw new Error('Unexpected paymaster build result type');
          }
          const pmTypedData = (buildResult as any).typed_data;
          const sig = await facilitatorAccount.signMessage(pmTypedData);
          const sigR = '0x' + ((sig as any).r ?? (sig as any)[0]).toString(16);
          const sigS = '0x' + ((sig as any).s ?? (sig as any)[1]).toString(16);

          const execResult = await paymaster.executeTransaction(
            { type: 'invoke' as const, invoke: { userAddress: accountAddress, typedData: pmTypedData, signature: [sigR, sigS] } },
            { version: '0x1', feeMode: { mode: 'sponsored' as const } },
          );

          transaction_hash = (execResult as any).transaction_hash;
          console.log(`[Facilitator /settle] Paymaster-sponsored settlement | Tx: ${transaction_hash.slice(0, 16)}...`);
        } catch (pmError) {
          console.warn('[Facilitator /settle] Paymaster failed, falling back to standard:', pmError instanceof Error ? pmError.message.slice(0, 120) : pmError);
          // Fall through to standard execution below
          const feeEstimate = await facilitatorAccount.estimateInvokeFee(calls[0]);
          const suggestedMaxFee = BigInt(feeEstimate.suggestedMaxFee.toString());
          const maxFee = (suggestedMaxFee * 150n) / 100n;
          const result = await facilitatorAccount.execute(calls[0], { maxFee });
          transaction_hash = result.transaction_hash;
          console.log(`[Facilitator /settle] Standard settlement (fallback) | Tx: ${transaction_hash.slice(0, 16)}...`);
        }
      } else {
        // Standard execution — facilitator pays gas
        const feeEstimate = await facilitatorAccount.estimateInvokeFee(calls[0]);
        const suggestedMaxFee = BigInt(feeEstimate.suggestedMaxFee.toString());
        const maxFee = (suggestedMaxFee * 150n) / 100n;

        const result = await facilitatorAccount.execute(calls[0], { maxFee });
        transaction_hash = result.transaction_hash;
        console.log(`[Facilitator /settle] Standard settlement | Tx: ${transaction_hash.slice(0, 16)}...`);
      }

      // Wait for on-chain confirmation
      await provider.waitForTransaction(transaction_hash, {
        successStates: ['ACCEPTED_ON_L2', 'ACCEPTED_ON_L1'],
      });

      return NextResponse.json(buildSettleResponse({
        success: true,
        transaction: transaction_hash,
        network,
        payer: inner.from,
        amount: inner.amount,
      }));
    } catch (execError) {
      const message = execError instanceof Error ? execError.message : 'Transaction execution failed';
      console.error('[Facilitator /settle] Settlement failed:', message);
      return failSettle(message, network, inner.from);
    }
  } catch (error) {
    console.error('[Facilitator /settle] Unexpected error:', error);
    return NextResponse.json(
      buildSettleResponse({ success: false, errorReason: 'unexpected_settle_error' }),
      { status: 500 },
    );
  }
}
