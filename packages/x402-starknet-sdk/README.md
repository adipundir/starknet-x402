# starknet-x402

x402 v2 payment protocol for Starknet. Trustless HTTP-native payments via SNIP-9 Outside Execution.

No ERC-20 approvals. No gas for users. The signed OutsideExecution binds the exact transfer call — the facilitator cannot change amount or recipient.

## Install

```bash
npm install starknet-x402
```

## Quick Start

### 1. Protect an API route (Server)

Add payment middleware to your Next.js app. This returns a `402 Payment Required` response for any request without a valid payment signature.

```typescript
// middleware.ts
import { paymentMiddleware, TOKENS } from 'starknet-x402';

const RECIPIENT = '0x04ad...b479'; // your Starknet address that receives payments
const FACILITATOR_URL = 'https://your-facilitator.com'; // facilitator service URL

export const middleware = paymentMiddleware(
  RECIPIENT,
  {
    '/api/premium-data': {
      price: '10000',                    // 0.01 USDC (6 decimals)
      tokenAddress: TOKENS.USDC_SEPOLIA, // or TOKENS.USDC_MAINNET
      network: 'sepolia',                // 'sepolia' | 'mainnet'
    },
    '/api/another-route': {
      price: '1000000',                  // 1 USDC
      tokenAddress: TOKENS.USDC_SEPOLIA,
      network: 'sepolia',
      config: {                          // optional
        description: 'Premium analytics',
        maxTimeoutSeconds: 600,
      },
    },
  },
  { url: FACILITATOR_URL }
);

export const config = {
  matcher: '/api/:path*',
};
```

### 2. Make paid requests (Client)

The client automatically handles the 402 flow — it makes the initial request, receives the payment requirements, signs an OutsideExecution via the AVNU paymaster, and retries with the payment signature.

#### Using `x402axios` (recommended)

```typescript
import { x402axios } from 'starknet-x402';
import { Account, RpcProvider } from 'starknet';

// Setup account — the provider is only used for signing, not for paying gas
const provider = new RpcProvider({ nodeUrl: 'https://your-starknet-rpc-url' });
const account = new Account(provider, YOUR_ADDRESS, YOUR_PRIVATE_KEY);

// Make a paid request — payment is handled automatically
const result = await x402axios.get('https://api.example.com/api/premium-data', {
  account,
  network: 'starknet-sepolia', // must match server's network
});

console.log(result.data);                  // the API response
console.log(result.settlement?.transaction); // settlement tx hash
console.log(result.settlement?.network);     // 'starknet-sepolia'
```

All HTTP methods are supported:

```typescript
await x402axios.post(url, { account, network: 'starknet-sepolia', data: { key: 'value' } });
await x402axios.put(url, { account, network: 'starknet-sepolia' });
await x402axios.patch(url, { account, network: 'starknet-sepolia' });
await x402axios.delete(url, { account, network: 'starknet-sepolia' });
```

#### Using `payAndRequest` (fetch-based)

For environments where you prefer native `fetch`:

```typescript
import { payAndRequest } from 'starknet-x402';
import { Account, RpcProvider } from 'starknet';

const provider = new RpcProvider({ nodeUrl: 'https://your-starknet-rpc-url' });
const account = new Account(provider, YOUR_ADDRESS, YOUR_PRIVATE_KEY);

const response = await payAndRequest(
  'https://api.example.com/api/premium-data',
  account,
  { network: 'starknet-sepolia' },
);

const data = await response.json();
```

## Configuration

### Client options

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `account` | `Account` | Yes | Starknet.js Account instance (used for signing) |
| `network` | `'starknet-sepolia'` \| `'starknet-mainnet'` | Yes | Target network |
| `paymasterUrl` | `string` | No | Custom paymaster URL (defaults to AVNU) |
| `paymasterApiKey` | `string` | No | API key for the paymaster service |

The SDK uses [AVNU paymaster](https://avnu.fi) by default:
- **Sepolia:** `https://sepolia.paymaster.avnu.fi`
- **Mainnet:** `https://starknet.paymaster.avnu.fi`

### Route config

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `price` | `string` | Yes | Amount in token's smallest unit (USDC = 6 decimals) |
| `tokenAddress` | `string` | Yes | ERC-20 token contract address |
| `network` | `'sepolia'` \| `'mainnet'` | No | Defaults to `'sepolia'` |
| `config.description` | `string` | No | Description of the resource |
| `config.mimeType` | `string` | No | MIME type of the response |
| `config.maxTimeoutSeconds` | `number` | No | Max timeout for settlement (default: 300) |

### Token addresses

The SDK exports common token addresses:

```typescript
import { TOKENS } from 'starknet-x402';

TOKENS.USDC_SEPOLIA  // 0x0512fe...D8343
TOKENS.USDC_MAINNET  // 0x03306...e93fb
TOKENS.STRK_SEPOLIA  // 0x04718...c938d
TOKENS.ETH           // 0x049d3...04dc7
```

### USDC pricing reference

| USDC Amount | `price` value |
|-------------|---------------|
| 0.001 USDC  | `'1000'`      |
| 0.01 USDC   | `'10000'`     |
| 0.10 USDC   | `'100000'`    |
| 1.00 USDC   | `'1000000'`   |

## How it works

```
Client                          Server                      Facilitator
  │                               │                              │
  ├── GET /api/data ─────────────►│                              │
  │                               │                              │
  │◄── 402 + payment requirements │                              │
  │                               │                              │
  ├── sign OutsideExecution       │                              │
  │   (via AVNU paymaster)        │                              │
  │                               │                              │
  ├── GET /api/data ─────────────►│                              │
  │   + PAYMENT-SIGNATURE header  │                              │
  │                               ├── POST /verify ─────────────►│
  │                               │◄── { isValid: true } ────────│
  │                               │                              │
  │                               ├── POST /settle ─────────────►│
  │                               │◄── { success, txHash } ──────│
  │                               │                              │
  │◄── 200 + data ────────────────│                              │
  │   + PAYMENT-RESPONSE header   │                              │
```

1. Client requests a protected endpoint
2. Server returns `402` with `PAYMENT-REQUIRED` header containing payment requirements
3. Client signs an OutsideExecution (SNIP-9) containing a `token.transfer()` call, built via AVNU paymaster (gas is sponsored)
4. Client retries the request with the `PAYMENT-SIGNATURE` header
5. Server forwards the signed payload to the facilitator for verification and settlement
6. Facilitator executes the transfer on-chain via AVNU and returns the transaction hash
7. Client receives `200` + data + `PAYMENT-RESPONSE` header with settlement details

## Links

- [GitHub](https://github.com/adipundir/starknet-x402)
- [Demo](https://starknet-x402.vercel.app/demo)
- [@starknetx402](https://x.com/starknetx402)

## License

MIT
