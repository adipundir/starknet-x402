/**
 * x402 v2 End-to-End Test (SNIP-9 Outside Execution)
 *
 * Tests the full trustless payment flow:
 *   Client signs OutsideExecution (via AVNU) → Facilitator submits → On-chain settlement
 *   No ERC-20 approval needed.
 *
 * Usage: npx ts-node scripts/test-e2e.ts
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { Account, RpcProvider } from 'starknet';
import { signPayment } from '../lib/x402/client-payment';
import type { PaymentRequirements, PaymentRequiredResponse, SupportedResponse } from '../lib/x402/types';
import { PAYMENT_REQUIRED_HEADER } from '../lib/x402/types';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const NODE_URL = process.env.STARKNET_NODE_URL!;
const CLIENT_PRIVATE_KEY = process.env.CLIENT_PRIVATE_KEY!;
const CLIENT_ADDRESS = process.env.NEXT_PUBLIC_CLIENT_ADDRESS || process.env.CLIENT_ADDRESS!;
const PAYMASTER_URL = process.env.PAYMASTER_URL!;
const PAYMASTER_API_KEY = process.env.PAYMASTER_API_KEY!;

// Use STRK for testing (client has STRK balance)
const STRK = '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d';
const STRK_AMOUNT = '10000000000000000'; // 0.01 STRK

let passed = 0;
let failed = 0;

function ok(_name: string) { passed++; console.log(`  PASS\n`); }
function fail(_name: string, reason: string) { failed++; console.log(`  FAIL: ${reason}\n`); }

async function main() {
  console.log('================================================');
  console.log('  x402 v2 E2E Test (SNIP-9 Outside Execution)');
  console.log('================================================\n');

  const provider = new RpcProvider({ nodeUrl: NODE_URL });
  const account = new Account(provider, CLIENT_ADDRESS, CLIENT_PRIVATE_KEY);

  // ── Test 1: 402 Response ───────────────────────────────────

  console.log('[1] 402 response format...');
  const res402 = await fetch(`${BASE_URL}/api/protected/weather`);
  const hasHeader = res402.headers.has(PAYMENT_REQUIRED_HEADER.toLowerCase());
  console.log(`  Status: ${res402.status}`);
  console.log(`  PAYMENT-REQUIRED header: ${hasHeader}`);

  const prHeader = res402.headers.get(PAYMENT_REQUIRED_HEADER.toLowerCase());
  const body: PaymentRequiredResponse = prHeader
    ? JSON.parse(Buffer.from(prHeader, 'base64').toString('utf8'))
    : await res402.json() as any;

  console.log(`  x402Version: ${body.x402Version}`);
  console.log(`  error: ${body.error}`);
  console.log(`  resource.url: ${body.resource?.url}`);
  console.log(`  accepts[0].amount: ${body.accepts[0].amount}`);

  if (res402.status === 402 && hasHeader && body.x402Version === 2 && body.resource?.url && body.error) ok('402 format');
  else fail('402 format', 'Missing fields');

  // ── Test 2: /supported ─────────────────────────────────────

  console.log('[2] GET /supported...');
  const supRes = await fetch(`${BASE_URL}/api/facilitator/supported`);
  const sup: SupportedResponse = await supRes.json() as any;
  console.log(`  kinds: ${sup.kinds.length}`);
  console.log(`  sponsored: ${(sup.kinds[0]?.extra as any)?.sponsored}`);

  if (sup.kinds.length >= 2) ok('/supported');
  else fail('/supported', 'Unexpected');

  // ── Test 3: signPayment() — SNIP-9 OutsideExecution ────────

  console.log('[3] signPayment() via AVNU paymaster...');
  const recipient = body.accepts[0].payTo;

  const { paymentPayload, paymentHeader } = await signPayment(account, {
    from: CLIENT_ADDRESS,
    to: recipient,
    token: STRK,
    amount: STRK_AMOUNT,
    network: 'starknet-sepolia',
    paymasterUrl: PAYMASTER_URL,
    paymasterApiKey: PAYMASTER_API_KEY,
  });

  console.log(`  x402Version: ${paymentPayload.x402Version}`);
  console.log(`  accepted.scheme: ${paymentPayload.accepted.scheme}`);
  console.log(`  has outsideExecution: ${!!paymentPayload.payload.outsideExecution?.typedData}`);
  console.log(`  signature length: ${paymentPayload.payload.outsideExecution?.signature?.length}`);
  console.log(`  header length: ${paymentHeader.length} chars`);

  if (paymentPayload.payload.outsideExecution?.typedData && paymentPayload.payload.outsideExecution?.signature?.length === 2) {
    ok('signPayment');
  } else {
    fail('signPayment', 'Missing outsideExecution');
  }

  // ── Test 4: Verify ─────────────────────────────────────────

  console.log('[4] POST /verify...');
  const strkReqs: PaymentRequirements = {
    scheme: 'exact',
    network: 'starknet-sepolia',
    amount: STRK_AMOUNT,
    asset: STRK,
    payTo: recipient,
    maxTimeoutSeconds: 300,
  };

  const vRes = await fetch(`${BASE_URL}/api/facilitator/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ x402Version: 2, paymentHeader, paymentRequirements: strkReqs }),
  });
  const v: any = await vRes.json();
  console.log(`  isValid: ${v.isValid}`);
  console.log(`  payer: ${v.payer}`);
  if (!v.isValid) console.log(`  reason: ${v.invalidReason}`);

  if (v.isValid && v.payer) ok('verify');
  else fail('verify', v.invalidReason || 'Invalid');

  // ── Test 5: Settle (SNIP-9 via AVNU) ───────────────────────

  console.log('[5] POST /settle...');
  // Use the same signed payment (not a new one — the OutsideExecution
  // nonce is managed by AVNU, and verify doesn't consume it)
  const t = Date.now();
  const sRes = await fetch(`${BASE_URL}/api/facilitator/settle`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ x402Version: 2, paymentHeader, paymentRequirements: strkReqs }),
  });
  const s: any = await sRes.json();
  console.log(`  success: ${s.success} (${Date.now() - t}ms)`);
  console.log(`  transaction: ${s.transaction}`);
  console.log(`  network: ${s.network}`);
  console.log(`  payer: ${s.payer}`);
  console.log(`  amount: ${s.amount}`);
  if (s.transaction) console.log(`  https://sepolia.voyager.online/tx/${s.transaction}`);
  if (s.errorReason) console.log(`  errorReason: ${s.errorReason}`);

  if (s.success && s.transaction && s.payer) ok('settle');
  else fail('settle', s.errorReason || 'Failed');

  // ── Summary ────────────────────────────────────────────────

  console.log('================================================');
  console.log(`  ${passed} passed, ${failed} failed`);
  console.log(`  ${failed === 0 ? 'ALL TESTS PASSED' : 'SOME TESTS FAILED'}`);
  console.log('================================================');
}

main().catch(console.error);
