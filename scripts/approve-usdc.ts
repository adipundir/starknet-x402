/**
 * Approve the facilitator to spend USDC on behalf of the client.
 * Run once before testing the payment flow.
 *
 * Usage: npx ts-node scripts/approve-usdc.ts
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { Account, RpcProvider, CallData, cairo } from 'starknet';

const NODE_URL = process.env.STARKNET_NODE_URL!;
const CLIENT_PRIVATE_KEY = process.env.CLIENT_PRIVATE_KEY!;
const CLIENT_ADDRESS = process.env.NEXT_PUBLIC_CLIENT_ADDRESS || process.env.CLIENT_ADDRESS!;
const FACILITATOR_ADDRESS = process.env.NEXT_PUBLIC_FACILITATOR_ADDRESS!;
const TOKEN_ADDRESS = process.env.TOKEN_ADDRESS!;

// Approve a large amount so we don't have to re-approve often
// 1,000,000 USDC (6 decimals) = 1_000_000_000_000
const APPROVE_AMOUNT = '1000000000000';

async function main() {
  console.log('=== Approve USDC for Facilitator ===\n');
  console.log('Client:', CLIENT_ADDRESS);
  console.log('Facilitator (spender):', FACILITATOR_ADDRESS);
  console.log('Token (USDC):', TOKEN_ADDRESS);
  console.log('Approve amount:', APPROVE_AMOUNT, `(${Number(APPROVE_AMOUNT) / 1e6} USDC)\n`);

  const provider = new RpcProvider({ nodeUrl: NODE_URL });
  const account = new Account(provider, CLIENT_ADDRESS, CLIENT_PRIVATE_KEY);

  // Check current USDC balance
  console.log('Checking USDC balance...');
  try {
    const balanceResult = await provider.callContract({
      contractAddress: TOKEN_ADDRESS,
      entrypoint: 'balanceOf',
      calldata: [CLIENT_ADDRESS],
    });
    const balance = BigInt(balanceResult[0]) + (BigInt(balanceResult[1] || '0') << 128n);
    console.log(`Balance: ${balance} (${Number(balance) / 1e6} USDC)`);

    if (balance === 0n) {
      console.log('\n⚠️  Client has 0 USDC. You need to get test USDC first.');
      console.log('Options:');
      console.log('  1. Use Starknet Sepolia faucet');
      console.log('  2. Bridge USDC from Ethereum Sepolia via StarkGate');
      console.log('  3. Use Circle\'s testnet faucet at https://faucet.circle.com/');
      console.log('\nContinuing with approval anyway...\n');
    }
  } catch (e: any) {
    console.log('Could not check balance:', e.message, '\n');
  }

  // Check current allowance
  console.log('Checking current allowance...');
  try {
    const allowanceResult = await provider.callContract({
      contractAddress: TOKEN_ADDRESS,
      entrypoint: 'allowance',
      calldata: [CLIENT_ADDRESS, FACILITATOR_ADDRESS],
    });
    const allowance = BigInt(allowanceResult[0]) + (BigInt(allowanceResult[1] || '0') << 128n);
    console.log(`Current allowance: ${allowance} (${Number(allowance) / 1e6} USDC)`);

    if (allowance >= BigInt(APPROVE_AMOUNT)) {
      console.log('\n✅ Allowance is already sufficient. No approval needed.');
      return;
    }
  } catch (e: any) {
    console.log('Could not check allowance:', e.message, '\n');
  }

  // Execute approval
  console.log('\nSubmitting approve transaction...');
  const call = {
    contractAddress: TOKEN_ADDRESS,
    entrypoint: 'approve',
    calldata: CallData.compile({
      spender: FACILITATOR_ADDRESS,
      amount: cairo.uint256(APPROVE_AMOUNT),
    }),
  };

  try {
    const feeEstimate = await account.estimateInvokeFee(call);
    const maxFee = (BigInt(feeEstimate.suggestedMaxFee.toString()) * 150n) / 100n;
    console.log(`Estimated fee: ${feeEstimate.suggestedMaxFee} (max: ${maxFee})`);

    const { transaction_hash } = await account.execute(call, { maxFee });
    console.log(`Transaction submitted: ${transaction_hash}`);
    console.log(`Explorer: https://sepolia.voyager.online/tx/${transaction_hash}`);

    console.log('\nWaiting for confirmation...');
    await provider.waitForTransaction(transaction_hash, {
      successStates: ['ACCEPTED_ON_L2', 'ACCEPTED_ON_L1'],
    });

    console.log('✅ Approval confirmed!');
    console.log(`\nThe facilitator can now spend up to ${Number(APPROVE_AMOUNT) / 1e6} USDC on behalf of the client.`);
  } catch (e: any) {
    console.error('❌ Approval failed:', e.message);
    if (e.message?.includes('balance')) {
      console.log('\nThe account may not have enough ETH/STRK to pay gas for the approval transaction.');
    }
  }
}

main().catch(console.error);
