#!/usr/bin/env ts-node

/**
 * Generate Starknet Key Pair for Testing
 * 
 * This script generates a new Starknet account keypair and displays
 * the private key, public key, and account address.
 */

import { ec, hash, CallData } from 'starknet';
import * as crypto from 'crypto';

console.log('🔐 Generating Starknet Key Pair for x402 Testing\n');
console.log('='.repeat(60));
console.log('');

// Generate a random private key
const privateKeyHex = '0x' + crypto.randomBytes(32).toString('hex');
const privateKey = BigInt(privateKeyHex);

console.log('🔑 Private Key (Keep this SECRET!):');
console.log(privateKeyHex);
console.log('');

// Derive the public key from the private key
const starkKey = ec.starkCurve.getStarkKey(privateKey);
const publicKey = '0x' + starkKey.toString(16).padStart(64, '0');

console.log('🔓 Public Key:');
console.log(publicKey);
console.log('');

// For Starknet, the account address is typically derived from the public key
// using a specific formula. For testing, we'll use a simplified approach.
// In production, you'd deploy an account contract.

// Generate a mock account address (in production, deploy an account contract)
const mockAccountAddress = '0x' + hash.computeHashOnElements([
  publicKey,
  '0x1', // Account contract class hash (mock)
]).slice(2);

console.log('📍 Account Address (Mock - deploy contract for real address):');
console.log(mockAccountAddress);
console.log('');

console.log('='.repeat(60));
console.log('');
console.log('📝 Add these to your .env file:');
console.log('');
console.log(`# Testing Account Credentials`);
console.log(`NEXT_PUBLIC_CLIENT_PRIVATE_KEY="${privateKeyHex}"`);
console.log(`NEXT_PUBLIC_CLIENT_PUBLIC_KEY="${publicKey}"`);
console.log(`NEXT_PUBLIC_CLIENT_ADDRESS="${mockAccountAddress}"`);
console.log('');
console.log('🚨 IMPORTANT:');
console.log('  1. Never commit these keys to version control');
console.log('  2. For production, deploy a proper Starknet account contract');
console.log('  3. For testnet, fund this address with test ETH from a faucet');
console.log('');
console.log('🔗 Starknet Testnet Faucet:');
console.log('   https://faucet.goerli.starknet.io/');
console.log('');

// Generate a second key pair for the facilitator
console.log('='.repeat(60));
console.log('');
console.log('🏦 Generating Facilitator Key Pair\n');

const facilitatorPrivateKeyHex = '0x' + crypto.randomBytes(32).toString('hex');
const facilitatorPrivateKey = BigInt(facilitatorPrivateKeyHex);
const facilitatorStarkKey = ec.starkCurve.getStarkKey(facilitatorPrivateKey);
const facilitatorPublicKey = '0x' + facilitatorStarkKey.toString(16).padStart(64, '0');
const facilitatorAddress = '0x' + hash.computeHashOnElements([
  facilitatorPublicKey,
  '0x1',
]).slice(2);

console.log('🔑 Facilitator Private Key:');
console.log(facilitatorPrivateKeyHex);
console.log('');
console.log('🔓 Facilitator Public Key:');
console.log(facilitatorPublicKey);
console.log('');
console.log('📍 Facilitator Address:');
console.log(facilitatorAddress);
console.log('');

console.log('='.repeat(60));
console.log('');
console.log('📝 Add these to your .env file:');
console.log('');
console.log(`# Facilitator Credentials`);
console.log(`FACILITATOR_PRIVATE_KEY="${facilitatorPrivateKeyHex}"`);
console.log(`FACILITATOR_ADDRESS="${facilitatorAddress}"`);
console.log('');

// Generate resource server address
const resourcePrivateKeyHex = '0x' + crypto.randomBytes(32).toString('hex');
const resourcePrivateKey = BigInt(resourcePrivateKeyHex);
const resourceStarkKey = ec.starkCurve.getStarkKey(resourcePrivateKey);
const resourcePublicKey = '0x' + resourceStarkKey.toString(16).padStart(64, '0');
const resourceAddress = '0x' + hash.computeHashOnElements([
  resourcePublicKey,
  '0x1',
]).slice(2);

console.log('='.repeat(60));
console.log('');
console.log('🏪 Generating Resource Server Address\n');
console.log('📍 Resource Server Address (to receive payments):');
console.log(resourceAddress);
console.log('');

console.log('📝 Add this to your .env file:');
console.log('');
console.log(`# Resource Server`);
console.log(`RESOURCE_SERVER_ADDRESS="${resourceAddress}"`);
console.log('');
console.log('='.repeat(60));
console.log('');
console.log('✅ Key generation complete!');
console.log('');
console.log('Next steps:');
console.log('1. Copy the environment variables to your .env file');
console.log('2. Fund the demo account with test ETH (if using testnet)');
console.log('3. Start the facilitator and resource server');
console.log('4. Open the frontend demo to test payments');
console.log('');




