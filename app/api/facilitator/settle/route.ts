/**
 * Facilitator Settlement Endpoint
 * Settles payments on Starknet blockchain according to x402 protocol
 */

import { NextRequest, NextResponse } from 'next/server';
import { Account, RpcProvider } from 'starknet';

interface SettleRequest {
  x402Version: number;
  paymentHeader: string;
  paymentRequirements: {
    scheme: string;
    network: string;
    maxAmountRequired: string;
    payTo: string;
    asset: string;
    [key: string]: any;
  };
}

interface PaymentPayload {
  x402Version: number;
  scheme: string;
  network: string;
  payload: {
    from: string;
    to: string;
    token: string;
    amount: string;
    nonce: string;
    deadline: number;
    signature: {
      r: string;
      s: string;
    };
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as SettleRequest;
    const { x402Version, paymentHeader, paymentRequirements } = body;

    // Validate request structure
    if (!x402Version || !paymentHeader || !paymentRequirements) {
      return NextResponse.json(
        {
          success: false,
          error: 'Missing required fields',
          txHash: null,
          networkId: null,
        },
        { status: 400 }
      );
    }

    // Decode payment header
    let paymentPayload: PaymentPayload;
    try {
      const decoded = Buffer.from(paymentHeader, 'base64').toString('utf8');
      paymentPayload = JSON.parse(decoded);
    } catch (error) {
      return NextResponse.json({
        success: false,
        error: 'Invalid payment header encoding',
        txHash: null,
        networkId: null,
      });
    }

    // Verify network is supported
    if (paymentPayload.network !== 'starknet-sepolia') {
      return NextResponse.json({
        success: false,
        error: `Unsupported network: ${paymentPayload.network}`,
        txHash: null,
        networkId: null,
      });
    }

      // Get configuration from environment
      // Try alternative RPC providers for Sepolia
      const nodeUrl = process.env.STARKNET_NODE_URL || 'https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_7/demo';
      const privateKey = process.env.FACILITATOR_PRIVATE_KEY;
      const accountAddress = process.env.NEXT_PUBLIC_FACILITATOR_ADDRESS;

    if (!privateKey || !accountAddress) {
      console.error('[Facilitator] Missing configuration');
      return NextResponse.json({
        success: false,
        error: 'Facilitator not configured. Missing: ' + 
          (!privateKey ? 'FACILITATOR_PRIVATE_KEY ' : '') + 
          (!accountAddress ? 'NEXT_PUBLIC_FACILITATOR_ADDRESS' : ''),
        txHash: null,
        networkId: null,
      });
    }

      try {
        console.log('[Facilitator] Settling payment on-chain...');
        
        const provider = new RpcProvider({ nodeUrl });
        const facilitatorAccount = new Account(provider, accountAddress, privateKey);

        try {
          const call = {
            contractAddress: paymentPayload.payload.token,
            entrypoint: 'transfer_from',
            calldata: [
              paymentPayload.payload.from,
              paymentPayload.payload.to,
              paymentPayload.payload.amount,
              '0'
            ]
          };
          
          // Estimate fee
          try {
            const feeEstimate = await facilitatorAccount.estimateInvokeFee(call);
            const suggestedMaxFee = BigInt(feeEstimate.suggestedMaxFee.toString());
            const maxFee = (suggestedMaxFee * 150n) / 100n;
            
            const { transaction_hash } = await facilitatorAccount.execute(call, { maxFee });
            
            // Wait for transaction confirmation
            await provider.waitForTransaction(transaction_hash, {
              successStates: ['ACCEPTED_ON_L2', 'ACCEPTED_ON_L1'],
            });


            console.log('[Facilitator] ✅ Settlement successful | Tx:', transaction_hash.slice(0, 10) + '...');
            
            return NextResponse.json({
              success: true,
              error: null,
              txHash: transaction_hash,
              networkId: paymentPayload.network,
            });
          } catch (feeError: any) {
            throw new Error(`Fee estimation failed: ${feeError.message}`);
          }
        } catch (execError: any) {
          throw execError;
        }
      } catch (error: any) {
        console.error('[Facilitator] Settlement failed:', error.message);
        return NextResponse.json({
          success: false,
          error: error.message || 'Transaction execution failed',
          txHash: null,
          networkId: paymentPayload.network,
        });
      }
  } catch (error) {
    console.error('Settlement error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Internal server error during settlement',
        txHash: null,
        networkId: null,
      },
      { status: 500 }
    );
  }
}

