/**
 * Example: Creating and sending x402 payments on Starknet
 * 
 * This example demonstrates the complete payment flow:
 * 1. Request a protected resource (get 402 response)
 * 2. Create and sign payment payload
 * 3. Send request with X-PAYMENT header
 * 4. Receive resource with X-PAYMENT-RESPONSE header
 */

import { Account, RpcProvider } from 'starknet';
import {
  signPaymentWithPrivateKey,
  createMockPayment,
  requestWithPayment,
  payAndRequest,
  decodeSettlementResponse,
} from '../lib/x402/client-payment';

// =====================================================
// Example 1: Manual payment flow with private key
// =====================================================

async function example1_ManualPayment() {
  console.log('\n=== Example 1: Manual Payment Flow ===\n');

  // Configuration
  const PROTECTED_URL = 'http://localhost:3000/api/protected/weather';
  const RPC_URL = process.env.STARKNET_NODE_URL || 'https://starknet-sepolia.public.blastapi.io';
  const PRIVATE_KEY = process.env.NEXT_PUBLIC_CLIENT_PRIVATE_KEY!;
  const ACCOUNT_ADDRESS = process.env.NEXT_PUBLIC_CLIENT_ADDRESS!;
  
  // Step 1: Request without payment (get 402)
  console.log('Step 1: Requesting protected resource without payment...');
  const initialResponse = await fetch(PROTECTED_URL);
  console.log(`Status: ${initialResponse.status} ${initialResponse.statusText}`);
  
  if (initialResponse.status === 402) {
    const paymentRequired = await initialResponse.json();
    console.log('\nPayment required:');
    console.log(JSON.stringify(paymentRequired, null, 2));
    
    const requirements = paymentRequired.accepts[0];
    
    // Step 2: Create and sign payment
    console.log('\nStep 2: Creating and signing payment...');
    const provider = new RpcProvider({ nodeUrl: RPC_URL });
    
    const signedPayment = await signPaymentWithPrivateKey(
      PRIVATE_KEY,
      provider,
      {
        from: ACCOUNT_ADDRESS,
        to: requirements.payTo,
        token: requirements.asset,
        amount: requirements.maxAmountRequired,
        network: requirements.network,
      }
    );
    
    console.log('Payment payload created:');
    console.log(JSON.stringify(signedPayment.paymentPayload, null, 2));
    console.log(`\nX-PAYMENT header (base64): ${signedPayment.paymentHeader.substring(0, 50)}...`);
    
    // Step 3: Send request with payment
    console.log('\nStep 3: Sending request with X-PAYMENT header...');
    const paidResponse = await requestWithPayment(
      PROTECTED_URL,
      signedPayment.paymentHeader
    );
    
    console.log(`Status: ${paidResponse.status} ${paidResponse.statusText}`);
    
    // Step 4: Get settlement response
    const settlementHeader = paidResponse.headers.get('X-PAYMENT-RESPONSE');
    if (settlementHeader) {
      const settlement = decodeSettlementResponse(settlementHeader);
      console.log('\nSettlement response:');
      console.log(JSON.stringify(settlement, null, 2));
      console.log(`\nExplorer: https://sepolia.starkscan.co/tx/${settlement.txHash}`);
    }
    
    // Get the protected resource
    const data = await paidResponse.json();
    console.log('\nProtected resource:');
    console.log(JSON.stringify(data, null, 2));
  }
}

// =====================================================
// Example 2: Automatic payment flow (one function)
// =====================================================

async function example2_AutomaticPayment() {
  console.log('\n=== Example 2: Automatic Payment Flow ===\n');

  const PROTECTED_URL = 'http://localhost:3000/api/protected/weather';
  const RPC_URL = process.env.STARKNET_NODE_URL || 'https://starknet-sepolia.public.blastapi.io';
  const PRIVATE_KEY = process.env.NEXT_PUBLIC_CLIENT_PRIVATE_KEY!;
  const ACCOUNT_ADDRESS = process.env.NEXT_PUBLIC_CLIENT_ADDRESS!;

  // Create account
  const provider = new RpcProvider({ nodeUrl: RPC_URL });
  const account = new Account(provider, ACCOUNT_ADDRESS, PRIVATE_KEY);

  // Single function handles entire flow
  console.log('Requesting protected resource (automatic payment)...');
  const response = await payAndRequest(PROTECTED_URL, account);

  console.log(`Status: ${response.status} ${response.statusText}`);

  if (response.ok) {
    const data = await response.json();
    console.log('\nProtected resource:');
    console.log(JSON.stringify(data, null, 2));

    const settlementHeader = response.headers.get('X-PAYMENT-RESPONSE');
    if (settlementHeader) {
      const settlement = decodeSettlementResponse(settlementHeader);
      console.log(`\nTransaction: ${settlement.txHash}`);
    }
  }
}

// =====================================================
// Example 3: Mock payment (for testing/demo)
// =====================================================

async function example3_MockPayment() {
  console.log('\n=== Example 3: Mock Payment (Demo/Testing) ===\n');

  const PROTECTED_URL = 'http://localhost:3000/api/protected/weather';

  // Step 1: Get payment requirements
  const initialResponse = await fetch(PROTECTED_URL);
  const paymentRequired = await initialResponse.json();
  const requirements = paymentRequired.accepts[0];

  // Step 2: Create mock payment (no real signing)
  console.log('Creating mock payment...');
  const mockPayment = createMockPayment({
    from: requirements.payTo,
    to: requirements.payTo,
    token: requirements.asset,
    amount: requirements.maxAmountRequired,
    network: requirements.network,
  });

  console.log('Mock payment payload:');
  console.log(JSON.stringify(mockPayment.paymentPayload, null, 2));

  // Step 3: Send request (will fail verification in production)
  console.log('\nSending request with mock payment...');
  const response = await requestWithPayment(
    PROTECTED_URL,
    mockPayment.paymentHeader
  );

  console.log(`Status: ${response.status} ${response.statusText}`);

  if (response.ok) {
    const data = await response.json();
    console.log('\nResource received:');
    console.log(JSON.stringify(data, null, 2));
  } else {
    const error = await response.json();
    console.log('\nError response:');
    console.log(JSON.stringify(error, null, 2));
  }
}

// =====================================================
// Example 4: Payment payload structure
// =====================================================

function example4_PayloadStructure() {
  console.log('\n=== Example 4: Payment Payload Structure ===\n');

  const examplePayload = {
    x402Version: 1,
    scheme: 'exact',
    network: 'starknet-sepolia',
    payload: {
      from: '0x4467e53b112af30acd3cd62b029bea473dd364bd5c0211a929cb7da0f4b8f79',
      to: '0x209693Bc6afc0C5328bA36FaF03C514EF312287C',
      token: '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
      amount: '10000000000000000', // 0.01 STRK
      nonce: '0xf3746613c2d920b5fdabc0856f2aeb2d4f88ee6037b8cc5d04a71a4462f13480',
      deadline: 1740672154,
      signature: {
        r: '0x2d6a7588d6acca505cbf0d9a4a227e0c52c6c34008c8e8986a1283259764173',
        s: '0x608a2ce6496642e377d6da8dbbf5836e9bd15092f9ecab05ded3d6293af148b5',
      },
    },
  };

  console.log('Example payment payload structure:');
  console.log(JSON.stringify(examplePayload, null, 2));

  console.log('\nThis payload is then:');
  console.log('1. JSON-stringified');
  console.log('2. Base64-encoded');
  console.log('3. Sent as X-PAYMENT header');

  const base64Header = Buffer.from(JSON.stringify(examplePayload)).toString('base64');
  console.log(`\nX-PAYMENT: ${base64Header}`);
}

// =====================================================
// Run examples
// =====================================================

async function main() {
  console.log('\n╔════════════════════════════════════════════════════╗');
  console.log('║   x402 Starknet Client Payment Examples           ║');
  console.log('╚════════════════════════════════════════════════════╝');

  // Show payload structure
  example4_PayloadStructure();

  // Uncomment to run live examples (requires server running)
  // await example1_ManualPayment();
  // await example2_AutomaticPayment();
  // await example3_MockPayment();

  console.log('\n✅ Examples complete!\n');
  console.log('To run live examples:');
  console.log('1. Start the server: npm run dev');
  console.log('2. Uncomment the example calls in main()');
  console.log('3. Run: ts-node examples/client-payment-example.ts\n');
}

main().catch(console.error);


