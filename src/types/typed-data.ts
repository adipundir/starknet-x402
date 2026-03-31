/**
 * SNIP-12 Typed Data definitions for x402 payments on Starknet.
 *
 * This is the canonical definition used by BOTH the client (signing)
 * and the facilitator (verification). Keeping them in one place
 * ensures hash consistency.
 */

import type { StarknetExactPayload } from './x402';

const CHAIN_IDS: Record<string, string> = {
  'starknet-mainnet': '0x534e5f4d41494e',     // SN_MAIN
  'starknet-sepolia': '0x534e5f5345504f4c4941', // SN_SEPOLIA
};

export function getChainId(network: string): string {
  const id = CHAIN_IDS[network];
  if (!id) throw new Error(`Unknown network: ${network}`);
  return id;
}

/**
 * Build the SNIP-12 typed data message for an x402 payment.
 * The resulting object is passed to both `account.signMessage()`
 * and `typedData.getMessageHash()`.
 */
export function buildPaymentTypedData(
  payload: Pick<StarknetExactPayload, 'from' | 'to' | 'token' | 'amount' | 'nonce' | 'deadline'>,
  network: string,
) {
  const chainId = getChainId(network);

  return {
    types: {
      StarkNetDomain: [
        { name: 'name', type: 'felt' },
        { name: 'version', type: 'felt' },
        { name: 'chainId', type: 'felt' },
      ],
      Payment: [
        { name: 'from', type: 'felt' },
        { name: 'to', type: 'felt' },
        { name: 'token', type: 'felt' },
        { name: 'amount', type: 'felt' },
        { name: 'nonce', type: 'felt' },
        { name: 'deadline', type: 'felt' },
      ],
    },
    primaryType: 'Payment' as const,
    domain: {
      name: 'x402 Payment',
      version: '1',
      chainId,
    },
    message: {
      from: payload.from,
      to: payload.to,
      token: payload.token,
      amount: payload.amount,
      nonce: payload.nonce,
      deadline: payload.deadline.toString(),
    },
  };
}
