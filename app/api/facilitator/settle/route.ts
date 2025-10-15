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

    console.log('[Facilitator /settle] ========================================');
    console.log('[Facilitator /settle] CONFIGURATION DEBUG');
    console.log('[Facilitator /settle] ========================================');
    console.log('[Facilitator /settle] Node URL:', nodeUrl);
    console.log('[Facilitator /settle] Network:', nodeUrl.includes('sepolia') ? 'SEPOLIA ✅' : 'UNKNOWN NETWORK ⚠️');
    console.log('[Facilitator /settle] Private Key (first 20 chars):', privateKey ? privateKey.substring(0, 20) + '...' : '❌ UNDEFINED');
    console.log('[Facilitator /settle] Private Key (full):', privateKey);
    console.log('[Facilitator /settle] Account Address:', accountAddress);
    console.log('[Facilitator /settle] Account Address matches expected?', accountAddress === '0x02a8a171dc53d51916e1db63c239a77658b5d2e8c129f2800e0fc47d794b236e' ? '✅ YES' : '❌ NO');
    console.log('[Facilitator /settle] ========================================');

    if (!privateKey || !accountAddress) {
      console.error('[Facilitator /settle] ❌ Missing configuration!');
      console.error('  Required env vars: FACILITATOR_PRIVATE_KEY, NEXT_PUBLIC_FACILITATOR_ADDRESS');
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
        // Initialize Starknet provider and account
        const provider = new RpcProvider({ nodeUrl });
        
        console.log('[Facilitator /settle] Starting settlement...');
        
        // Initialize account - try WITHOUT specifying Cairo version (let it auto-detect)
        console.log('[Facilitator /settle] Initializing facilitator account (auto-detect version)...');
        const facilitatorAccount = new Account(provider, accountAddress, privateKey);
        
        console.log('[Facilitator /settle] Payment details:');
        console.log('[Facilitator /settle] From:', paymentPayload.payload.from);
        console.log('[Facilitator /settle] To:', paymentPayload.payload.to);
        console.log('[Facilitator /settle] Token:', paymentPayload.payload.token);
        console.log('[Facilitator /settle] Amount:', paymentPayload.payload.amount);

        // Try the SIMPLEST possible approach - manual invoke
        console.log('[Facilitator /settle] Attempting manual invoke...');
        
        try {
          // Build the most basic possible call
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
          
          console.log('[Facilitator /settle] Call object:', JSON.stringify(call, null, 2));
          
          // Use invoke method directly on the account signer
          console.log('[Facilitator /settle] Calling account.execute()...');
          
          // Estimate fee first to avoid version issues
          console.log('[Facilitator /settle] Estimating fee...');
          try {
            const feeEstimate = await facilitatorAccount.estimateInvokeFee(call);
            console.log('[Facilitator /settle] Fee estimate:', feeEstimate);
            
            // Use 150% of estimated fee as maxFee
            const suggestedMaxFee = BigInt(feeEstimate.suggestedMaxFee.toString());
            const maxFee = (suggestedMaxFee * 150n) / 100n;
            
            console.log('[Facilitator /settle] Using maxFee:', maxFee.toString());
            
            const { transaction_hash } = await facilitatorAccount.execute(call, { maxFee });
            
            console.log('[Facilitator /settle] ✅ Transaction submitted:', transaction_hash);
            console.log('[Facilitator /settle] Waiting for confirmation...');

            // Wait for transaction confirmation
            await provider.waitForTransaction(transaction_hash, {
              successStates: ['ACCEPTED_ON_L2', 'ACCEPTED_ON_L1'],
            });

            console.log('[Facilitator /settle] ✅ Settlement confirmed!');

            // Return settlement response
            return NextResponse.json({
              success: true,
              error: null,
              txHash: transaction_hash,
              networkId: paymentPayload.network,
            });
          } catch (feeError: any) {
            console.error('[Facilitator /settle] Fee estimation failed:', feeError.message);
            throw new Error(`Fee estimation failed: ${feeError.message}`);
          }
        } catch (execError: any) {
          console.error('[Facilitator /settle] Execute error:', execError);
          console.error('[Facilitator /settle] Error stack:', execError.stack);
          throw execError;
        }
      } catch (error: any) {
        console.error('[Facilitator /settle] ❌ Settlement transaction failed:', error);
        console.error('[Facilitator /settle] Error name:', error.name);
        console.error('[Facilitator /settle] Error message:', error.message);
        if (error.stack) {
          console.error('[Facilitator /settle] Stack trace:', error.stack);
        }
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

