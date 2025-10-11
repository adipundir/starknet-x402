/**
 * Example Client Making x402 Payments
 * 
 * This demonstrates how to use the payment client to access paid resources
 */

import { Account, RpcProvider } from 'starknet';
import { createPaymentClient, payForResource } from '../src/client/payment-client';

// ============================================================================
// Setup
// ============================================================================

const provider = new RpcProvider({
  nodeUrl: process.env.STARKNET_RPC_URL || 'https://starknet-sepolia.public.blastapi.io',
});

// Initialize your Starknet account
// In production, securely manage your private key
const account = new Account(
  provider,
  process.env.ACCOUNT_ADDRESS || '0x...',
  process.env.ACCOUNT_PRIVATE_KEY || '0x...'
);

const client = createPaymentClient({
  account,
  provider,
  network: 'starknet-sepolia',
  autoApproveThreshold: BigInt('10000000000000000'), // Auto-approve up to 0.01 ETH
});

// ============================================================================
// Example 1: Simple GET request
// ============================================================================

async function example1() {
  console.log('Example 1: Fetching basic data...');
  
  const result = await client.pay('http://localhost:3000/api/data', {
    method: 'GET',
  });

  if (result.success) {
    console.log('✅ Success!');
    console.log('Response:', result.response);
    console.log('Transaction:', result.txHash);
  } else {
    console.error('❌ Failed:', result.error);
  }
}

// ============================================================================
// Example 2: Accessing premium content
// ============================================================================

async function example2() {
  console.log('\nExample 2: Accessing premium content...');
  
  const result = await client.pay('http://localhost:3000/api/premium', {
    method: 'GET',
  });

  if (result.success) {
    console.log('✅ Success!');
    console.log('Premium data:', result.response);
    console.log('Transaction:', result.txHash);
  } else {
    console.error('❌ Failed:', result.error);
  }
}

// ============================================================================
// Example 3: POST request with body
// ============================================================================

async function example3() {
  console.log('\nExample 3: Querying AI model...');
  
  const result = await client.pay('http://localhost:3000/api/ai-query', {
    method: 'POST',
    data: {
      query: 'What is the meaning of life?',
    },
  });

  if (result.success) {
    console.log('✅ Success!');
    console.log('AI Response:', result.response);
    console.log('Transaction:', result.txHash);
  } else {
    console.error('❌ Failed:', result.error);
  }
}

// ============================================================================
// Example 4: Using the convenience function
// ============================================================================

async function example4() {
  console.log('\nExample 4: Using convenience function...');
  
  const result = await payForResource(
    'http://localhost:3000/api/data',
    account,
    provider,
    'starknet-sepolia'
  );

  if (result.success) {
    console.log('✅ Success!');
    console.log('Data:', result.response);
  } else {
    console.error('❌ Failed:', result.error);
  }
}

// ============================================================================
// Example 5: Handling free endpoints
// ============================================================================

async function example5() {
  console.log('\nExample 5: Accessing free endpoint...');
  
  // Free endpoints don't require payment
  const result = await client.pay('http://localhost:3000/', {
    method: 'GET',
  });

  if (result.success) {
    console.log('✅ Success (no payment needed)!');
    console.log('Info:', result.response);
  } else {
    console.error('❌ Failed:', result.error);
  }
}

// ============================================================================
// Run Examples
// ============================================================================

async function main() {
  console.log('x402 Payment Client Examples');
  console.log('=============================\n');

  try {
    await example1();
    await example2();
    await example3();
    await example4();
    await example5();
    
    console.log('\n=============================');
    console.log('All examples completed!');
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Run if executed directly
if (require.main === module) {
  main().catch(console.error);
}

export { example1, example2, example3, example4, example5 };


