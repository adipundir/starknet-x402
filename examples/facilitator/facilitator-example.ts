/**
 * Example: Running a facilitator service
 * 
 * A facilitator provides two main services:
 * 1. Verify payments (off-chain, fast)
 * 2. Settle payments (on-chain, secure)
 * 
 * Installation:
 *   npm install @adipundir/starknet-x402 starknet express
 * 
 * Usage:
 *   ts-node examples/facilitator/facilitator-example.ts
 */

import express from 'express';
import { verifyPayment, settlePayment } from '@adipundir/starknet-x402';

const app = express();
app.use(express.json());

const PORT = 3001;

// =====================================================
// Example 1: Verification endpoint
// =====================================================

app.post('/verify', async (req, res) => {
  try {
    const { paymentPayload, paymentRequirements } = req.body;
    
    console.log('📝 Verifying payment...');
    console.log('From:', paymentPayload.payload.from);
    console.log('To:', paymentPayload.payload.to);
    console.log('Amount:', paymentPayload.payload.amount);
    
    // Use SDK to verify payment
    const result = await verifyPayment(
      paymentPayload,
      paymentRequirements,
      {
        checkSignature: true,
        checkBalance: true,
        checkDeadline: true,
        checkNonce: true,
      }
    );
    
    if (result.isValid) {
      console.log('✅ Payment verified!');
      res.json({
        isValid: true,
        invalidReason: null,
      });
    } else {
      console.log('❌ Verification failed:', result.invalidReason);
      res.json({
        isValid: false,
        invalidReason: result.invalidReason,
      });
    }
  } catch (error: any) {
    console.error('Error verifying payment:', error);
    res.status(500).json({
      isValid: false,
      invalidReason: error.message,
    });
  }
});

// =====================================================
// Example 2: Settlement endpoint
// =====================================================

app.post('/settle', async (req, res) => {
  try {
    const { paymentPayload } = req.body;
    
    console.log('⛓️  Settling payment on-chain...');
    console.log('From:', paymentPayload.payload.from);
    console.log('To:', paymentPayload.payload.to);
    console.log('Amount:', paymentPayload.payload.amount);
    
    // Use SDK to settle payment
    const result = await settlePayment(paymentPayload, {
      facilitatorPrivateKey: process.env.FACILITATOR_PRIVATE_KEY!,
      facilitatorAddress: process.env.NEXT_PUBLIC_FACILITATOR_ADDRESS!,
      rpcUrl: process.env.STARKNET_NODE_URL || 'https://starknet-sepolia.public.blastapi.io',
    });
    
    if (result.success) {
      console.log('✅ Payment settled!');
      console.log('Transaction:', result.txHash);
      console.log(`Explorer: https://sepolia.voyager.online/tx/${result.txHash}`);
      
      res.json({
        success: true,
        txHash: result.txHash,
        message: 'Payment settled successfully',
      });
    } else {
      console.log('❌ Settlement failed:', result.message);
      res.json({
        success: false,
        message: result.message,
      });
    }
  } catch (error: any) {
    console.error('Error settling payment:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// =====================================================
// Example 3: Supported schemes endpoint
// =====================================================

app.get('/supported', (req, res) => {
  res.json({
    schemes: ['exact'],
    networks: ['starknet-sepolia', 'starknet-mainnet'],
    tokens: [
      {
        symbol: 'STRK',
        address: '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
        decimals: 18,
      },
      {
        symbol: 'ETH',
        address: '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
        decimals: 18,
      },
    ],
  });
});

// =====================================================
// Start facilitator server
// =====================================================

app.listen(PORT, () => {
  console.log(`\n╔════════════════════════════════════════════════════╗`);
  console.log(`║   x402 Facilitator Service                         ║`);
  console.log(`╚════════════════════════════════════════════════════╝\n`);
  console.log(`🚀 Facilitator running on http://localhost:${PORT}\n`);
  console.log('Endpoints:');
  console.log('  GET  /supported - List supported schemes/networks');
  console.log('  POST /verify    - Verify payment signature & validity');
  console.log('  POST /settle    - Settle payment on-chain\n');
  console.log('Environment variables required:');
  console.log('  FACILITATOR_PRIVATE_KEY');
  console.log('  NEXT_PUBLIC_FACILITATOR_ADDRESS');
  console.log('  STARKNET_NODE_URL\n');
});

/**
 * Advanced: Custom verification logic
 * 
 * You can add custom checks before verifying:
 * 
 * app.post('/verify', async (req, res) => {
 *   const { paymentPayload } = req.body;
 *   
 *   // Custom check: Verify user is not blocked
 *   if (isUserBlocked(paymentPayload.payload.from)) {
 *     return res.json({
 *       isValid: false,
 *       invalidReason: 'User is blocked',
 *     });
 *   }
 *   
 *   // Custom check: Rate limiting
 *   if (hasExceededRateLimit(paymentPayload.payload.from)) {
 *     return res.json({
 *       isValid: false,
 *       invalidReason: 'Rate limit exceeded',
 *     });
 *   }
 *   
 *   // Continue with normal verification
 *   const result = await verifyPayment(paymentPayload, ...);
 *   res.json(result);
 * });
 */

/**
 * Advanced: Batch settlement
 * 
 * For high-volume applications, you can batch settlements:
 * 
 * const pendingPayments: any[] = [];
 * 
 * app.post('/settle', async (req, res) => {
 *   pendingPayments.push(req.body.paymentPayload);
 *   
 *   res.json({
 *     success: true,
 *     message: 'Payment queued for batch settlement',
 *   });
 * });
 * 
 * // Settle in batches every 10 seconds
 * setInterval(async () => {
 *   if (pendingPayments.length > 0) {
 *     console.log(`Settling ${pendingPayments.length} payments...`);
 *     for (const payment of pendingPayments) {
 *       await settlePayment(payment, config);
 *     }
 *     pendingPayments.length = 0;
 *   }
 * }, 10000);
 */

/**
 * Advanced: Fee management
 * 
 * Take a small fee for facilitating:
 * 
 * app.post('/settle', async (req, res) => {
 *   const { paymentPayload } = req.body;
 *   
 *   // Calculate fee (e.g., 1%)
 *   const amount = BigInt(paymentPayload.payload.amount);
 *   const fee = amount / 100n;
 *   const netAmount = amount - fee;
 *   
 *   // Settle with adjusted amount
 *   const result = await settlePayment({
 *     ...paymentPayload,
 *     payload: {
 *       ...paymentPayload.payload,
 *       amount: netAmount.toString(),
 *     },
 *   }, config);
 *   
 *   res.json(result);
 * });
 */

