/**
 * Facilitator Supported Endpoint (x402 v2)
 *
 * Returns supported (scheme, network) combinations.
 * Advertises `sponsored: true` in `extra` when a paymaster is configured.
 */

import { NextResponse } from 'next/server';
import {
  type SupportedResponse,
  X402_VERSION,
  SCHEMES,
  NETWORKS,
} from '../../../../src/types/x402';

export async function GET() {
  const sponsored = !!(process.env.PAYMASTER_URL && process.env.PAYMASTER_API_KEY);

  const extra = sponsored ? { sponsored: true } : undefined;

  const response: SupportedResponse = {
    kinds: [
      {
        x402Version: X402_VERSION,
        scheme: SCHEMES.EXACT,
        network: NETWORKS.STARKNET_SEPOLIA,
        extra,
      },
      {
        x402Version: X402_VERSION,
        scheme: SCHEMES.EXACT,
        network: NETWORKS.STARKNET_MAINNET,
        extra,
      },
    ],
  };

  return NextResponse.json(response);
}
