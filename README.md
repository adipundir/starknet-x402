# starknet x402

HTTP-native payments for Starknet. Pay for APIs with USDC using SNIP-9 Outside Execution — no approvals, no gas for users.

## Install

```bash
npm install starknet-x402
```

## Server (Next.js middleware)

```typescript
// middleware.ts
import { paymentMiddleware, TOKENS } from 'starknet-x402';

export const middleware = paymentMiddleware(
  process.env.RECIPIENT_ADDRESS!,
  {
    '/api/premium/data': {
      price: '10000',                    // 0.01 USDC (6 decimals)
      tokenAddress: TOKENS.USDC_SEPOLIA,
      network: 'sepolia',
    },
  },
  { url: process.env.FACILITATOR_URL! }
);

export const config = {
  matcher: '/api/premium/:path*',
};
```

## Client

```typescript
import { x402axios } from 'starknet-x402';
import { Account, RpcProvider } from 'starknet';

const provider = new RpcProvider({ nodeUrl: process.env.STARKNET_RPC_URL });
const account = new Account(provider, address, privateKey);

const result = await x402axios.get('https://api.example.com/api/premium/data', {
  account,
  network: 'starknet-sepolia',
});

console.log(result.data);
console.log(result.settlement?.transaction);
```

All HTTP methods supported: `x402axios.get`, `.post`, `.put`, `.patch`, `.delete`.

For native `fetch`, use `payAndRequest`:

```typescript
import { payAndRequest } from 'starknet-x402';

const response = await payAndRequest(
  'https://api.example.com/api/premium/data',
  account,
  { network: 'starknet-sepolia' },
);
```

## How it works

```
Client                          Server                      Facilitator
  |                               |                              |
  |-- GET /api/data ------------->|                              |
  |<-- 402 + payment requirements |                              |
  |                               |                              |
  |-- sign OutsideExecution       |                              |
  |   (SNIP-9, via AVNU paymaster)|                              |
  |                               |                              |
  |-- GET /api/data ------------->|                              |
  |   + PAYMENT-SIGNATURE header  |                              |
  |                               |-- POST /verify ------------->|
  |                               |<-- { isValid: true } --------|
  |                               |-- POST /settle ------------->|
  |                               |<-- { success, txHash } ------|
  |                               |                              |
  |<-- 200 + data ----------------|                              |
  |   + PAYMENT-RESPONSE header   |                              |
```

No ERC-20 approvals needed. The client signs an OutsideExecution containing a `token.transfer()` call. The facilitator executes it on-chain via AVNU paymaster — gas is sponsored.

## Configuration

### Token addresses

```typescript
import { TOKENS } from 'starknet-x402';

TOKENS.USDC_SEPOLIA  // Circle native USDC on Sepolia
TOKENS.USDC_MAINNET  // Circle native USDC on Mainnet
TOKENS.STRK_SEPOLIA  // STRK on Sepolia
TOKENS.ETH           // ETH
```

### USDC pricing

| Amount | `price` value |
|--------|---------------|
| 0.001  | `'1000'`      |
| 0.01   | `'10000'`     |
| 0.10   | `'100000'`    |
| 1.00   | `'1000000'`   |

### Paymaster

The SDK uses [AVNU paymaster](https://avnu.fi) by default (Sepolia + Mainnet). Override with:

```typescript
x402axios.get(url, {
  account,
  network: 'starknet-sepolia',
  paymasterUrl: 'https://custom-paymaster.com',
  paymasterApiKey: 'your-key',
});
```

### Headers

| Header | Direction | Description |
|--------|-----------|-------------|
| `PAYMENT-REQUIRED` | Server -> Client | Base64 payment requirements (402 response) |
| `PAYMENT-SIGNATURE` | Client -> Server | Base64 signed payment payload |
| `PAYMENT-RESPONSE` | Server -> Client | Base64 settlement result (tx hash) |

### Environment variables

```bash
STARKNET_RPC_URL=https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_8/...
RECIPIENT_ADDRESS=0x...
FACILITATOR_URL=https://your-facilitator.com
```

### Facilitator endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/verify` | POST | Validate payment signature and requirements |
| `/settle` | POST | Execute payment on-chain via AVNU |
| `/supported` | GET | Supported schemes and networks |

## Development

```bash
npm install
cp env.example .env
npm run dev
npm run test:e2e
```

## Links

- [npm](https://www.npmjs.com/package/starknet-x402)
- [Demo](https://starknet-x402.vercel.app/demo)
- [x402 Protocol](https://www.x402.org)
- [@starknetx402](https://x.com/starknetx402)

## License

MIT
