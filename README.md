# x402 for Starknet

> **HTTP-native micropayments for the decentralized web. Accept digital payments in one line of code.**

x402 is an HTTP-native payment protocol that brings seamless micropayments to the internet. This implementation brings x402 **v2** to Starknet, leveraging STARK proofs for secure, scalable, and cost-effective payments.

## Features

- **One-line integration** - Add payments to your API in seconds
- **x402 v2 compliant** - Full v2 spec implementation
- **USDC payments** - Circle native USDC on Starknet (6 decimals)
- **Gas sponsoring** - AVNU paymaster integration for gasless settlement
- **Fast settlement** - ~10 second transaction finality on Starknet
- **Secure** - On-chain signature verification via `is_valid_signature`
- **Replay protection** - Nonce tracking prevents double-spending
- **Multi-token** - Support USDC, STRK, ETH, and any ERC20
- **TypeScript SDK** - Full type safety

## Quick Start

### Server Setup (Next.js Middleware)

```typescript
// middleware.ts
import { paymentMiddleware } from './lib/x402/middleware';

export const middleware = paymentMiddleware(
  process.env.RECIPIENT_ADDRESS!,
  {
    '/api/premium/data': {
      price: '10000',                  // 0.01 USDC (6 decimals)
      tokenAddress: process.env.TOKEN_ADDRESS!,
    },
  },
  { url: process.env.FACILITATOR_URL! }
);

export const config = {
  matcher: '/api/premium/:path*',
};
```

### Client Usage

```typescript
import { payAndRequest } from './lib/x402/client-payment';
import { Account, RpcProvider } from 'starknet';

const provider = new RpcProvider({ nodeUrl: 'https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_8/demo' });
const account = new Account(provider, address, privateKey);

// Automatic: request -> 402 -> sign -> pay -> get resource
const response = await payAndRequest('http://api.example.com/premium/data', account);
const data = await response.json();
```

## Protocol Flow (x402 v2)

```
Client                          Server (Middleware)              Facilitator              Starknet
  |                                   |                              |                      |
  |-- GET /api/data ----------------->|                              |                      |
  |                                   |                              |                      |
  |<-- 402 Payment Required ----------|                              |                      |
  |    PAYMENT-REQUIRED header        |                              |                      |
  |    Body: { x402Version: 2,        |                              |                      |
  |            accepts: [...] }       |                              |                      |
  |                                   |                              |                      |
  |-- Sign payment (off-chain) ------>|                              |                      |
  |   PAYMENT-SIGNATURE header        |                              |                      |
  |                                   |-- POST /verify ------------->|                      |
  |                                   |   (signature, balance,       |                      |
  |                                   |    allowance checks)         |-- is_valid_signature->|
  |                                   |<-- { isValid, payer } -------|<---------------------|
  |                                   |                              |                      |
  |                                   |-- POST /settle ------------->|                      |
  |                                   |                              |-- transfer_from ---->|
  |                                   |                              |<-- tx confirmed -----|
  |                                   |<-- { transaction, payer } ---|                      |
  |                                   |                              |                      |
  |<-- 200 OK + Data -----------------|                              |                      |
  |    PAYMENT-RESPONSE header        |                              |                      |
```

## v2 Headers

| Header | Direction | Description |
|--------|-----------|-------------|
| `PAYMENT-REQUIRED` | Server -> Client | Base64 payment requirements (on 402 response) |
| `PAYMENT-SIGNATURE` | Client -> Server | Base64 signed payment payload |
| `PAYMENT-RESPONSE` | Server -> Client | Base64 settlement result (tx hash) |

## API Endpoints

### `GET /api/facilitator/supported`
Returns supported scheme/network combinations.

### `POST /api/facilitator/verify`
Validates payment without executing on-chain. Checks: signature, balance, allowance, nonce, deadline.

### `POST /api/facilitator/settle`
Executes verified payment via `transfer_from`. Supports AVNU paymaster for gas sponsoring.

## Configuration

### Environment Variables

```bash
# Network
STARKNET_NODE_URL=https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_8/demo

# Accounts
CLIENT_PRIVATE_KEY=0x...
RECIPIENT_ADDRESS=0x...
FACILITATOR_PRIVATE_KEY=0x...
NEXT_PUBLIC_FACILITATOR_ADDRESS=0x...
FACILITATOR_URL=http://localhost:3000/api/facilitator

# Token - USDC (Circle native, 6 decimals)
TOKEN_ADDRESS=0x0512feAc6339Ff7889822cb5aA2a86C848e9D392bB0E3E237C008674feeD8343

# AVNU Paymaster (optional - enables gas sponsoring)
PAYMASTER_URL=https://sepolia.paymaster.avnu.fi
PAYMASTER_API_KEY=your-api-key
```

### Supported Networks

- Starknet Sepolia (testnet)
- Starknet Mainnet

### Supported Tokens

| Token | Sepolia | Mainnet | Decimals |
|-------|---------|---------|----------|
| USDC (Circle native) | `0x0512fe...` | `0x03306...` | 6 |
| STRK | `0x04718...` | `0x04718...` | 18 |
| ETH | `0x04936...` | `0x04936...` | 18 |

## Gas Sponsoring (AVNU Paymaster)

When `PAYMASTER_URL` and `PAYMASTER_API_KEY` are set, the facilitator settlement uses AVNU's sponsored mode so neither the user nor the facilitator pays gas. If the paymaster fails, it falls back to standard gas estimation.

Get an API key at [docs.avnu.fi](https://docs.avnu.fi).

## Prerequisites for Payment

Before a client can pay:
1. **Token balance** - Client must have sufficient USDC (or configured token)
2. **Facilitator approval** - Client must call `approve(facilitator_address, amount)` on the token contract

Run `npx ts-node scripts/approve-usdc.ts` to set up the approval.

## Development

```bash
npm install
cp env.example .env     # Edit with your keys
npm run dev             # Start dev server
npm run build           # Production build

# Test the full flow
npx ts-node scripts/test-e2e.ts
```

## Project Structure

```
starknet-x402/
├── src/types/x402.ts              # Canonical type definitions (single source of truth)
├── src/types/typed-data.ts        # SNIP-12 typed data (shared client/server)
├── src/facilitator/
│   ├── starknet-verifier.ts       # Signature + on-chain verification
│   ├── starknet-settler.ts        # transfer_from execution
│   ├── nonce-tracker.ts           # Replay protection
│   └── server.ts                  # Express facilitator server
├── lib/x402/
│   ├── middleware.ts              # Next.js payment middleware
│   ├── client-payment.ts          # Payment signing
│   ├── facilitator.ts             # Facilitator client
│   └── types.ts                   # Re-exports from src/types
├── app/api/facilitator/
│   ├── verify/route.ts            # Verification endpoint
│   ├── settle/route.ts            # Settlement endpoint
│   └── supported/route.ts         # Supported schemes/networks
├── packages/x402-starknet-sdk/    # Publishable SDK package
├── spec/                          # Protocol specification
└── scripts/
    ├── test-e2e.ts                # End-to-end test
    └── approve-usdc.ts            # Token approval script
```

## Security

- **On-chain signature verification** via `is_valid_signature` (works with all Starknet account types)
- **SNIP-12 typed data** for structured, human-readable signing
- **Nonce replay protection** prevents double-spending
- **Deadline enforcement** with configurable timeout
- **Balance + allowance checks** before settlement
- **Verify-before-settle** enforced in settle endpoint

## Resources

- [x402 Protocol](https://github.com/coinbase/x402)
- [x402.org](https://www.x402.org)
- [Starknet Documentation](https://docs.starknet.io)
- [AVNU Paymaster](https://docs.avnu.fi/docs/paymaster/index)
- [Circle USDC on Starknet](https://developers.circle.com/stablecoins/usdc-contract-addresses)

## License

MIT
