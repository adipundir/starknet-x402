/**
 * Example Facilitator Server
 * 
 * This server handles verification and settlement of x402 payments
 */

import { createFacilitatorServer } from '../src/facilitator/server';
import { FacilitatorConfig, SCHEMES, NETWORKS } from '../src/types/x402';

// ============================================================================
// Configuration
// ============================================================================

const config: FacilitatorConfig = {
  port: 3001,
  
  // Starknet RPC URL
  rpcUrl: process.env.STARKNET_RPC_URL || 'https://starknet-sepolia.public.blastapi.io',
  
  // Facilitator's private key for executing settlements
  // In production, use environment variables and secure key management
  privateKey: process.env.FACILITATOR_PRIVATE_KEY || '',
  
  // Supported networks
  networks: [
    NETWORKS.STARKNET_MAINNET,
    NETWORKS.STARKNET_SEPOLIA,
  ],
  
  // Supported payment schemes
  schemes: [
    SCHEMES.EXACT,
  ],
  
  // Optional: Maximum gas price to accept (in wei)
  maxGasPrice: process.env.MAX_GAS_PRICE,
};

// ============================================================================
// Start Facilitator
// ============================================================================

async function main() {
  try {
    console.log('Starting x402 Facilitator Server...');
    console.log('');
    console.log('Configuration:');
    console.log(`  Port: ${config.port}`);
    console.log(`  RPC URL: ${config.rpcUrl}`);
    console.log(`  Networks: ${config.networks.join(', ')}`);
    console.log(`  Schemes: ${config.schemes.join(', ')}`);
    console.log('');

    const server = await createFacilitatorServer(config);

    console.log('');
    console.log('Endpoints:');
    console.log(`  GET  /supported - List supported schemes and networks`);
    console.log(`  POST /verify    - Verify a payment`);
    console.log(`  POST /settle    - Settle a payment on-chain`);
    console.log('');
    console.log('✅ Facilitator ready to process payments!');
  } catch (error) {
    console.error('Failed to start facilitator:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\nShutting down facilitator...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\nShutting down facilitator...');
  process.exit(0);
});

main();


