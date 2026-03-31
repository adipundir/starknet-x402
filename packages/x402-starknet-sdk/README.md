# starknet-x402

x402 v2 payment protocol for Starknet. Trustless HTTP-native payments via SNIP-9 Outside Execution.

## Install

```bash
npm install starknet-x402 starknet axios
```

## Client

```typescript
import { x402axios } from 'starknet-x402';
import { Account, RpcProvider } from 'starknet';

const provider = new RpcProvider({ nodeUrl: RPC_URL });
const account = new Account(provider, address, privateKey);

const result = await x402axios.get('https://api.example.com/data', {
  account,
  network: 'starknet-sepolia',
});

console.log(result.data);
console.log(result.settlement?.transaction);
```

## Server (Next.js middleware)

```typescript
import { paymentMiddleware } from 'starknet-x402';

export const middleware = paymentMiddleware(
  RECIPIENT_ADDRESS,
  {
    '/api/data': {
      price: '10000',        // 0.01 USDC (6 decimals)
      tokenAddress: USDC,
      network: 'sepolia',
    },
  },
  { url: FACILITATOR_URL }
);

export const config = {
  matcher: '/api/:path*',
};
```

## How it works

1. Client requests protected endpoint
2. Server returns 402 with `PAYMENT-REQUIRED` header
3. Client signs an OutsideExecution (SNIP-9) via AVNU paymaster
4. Client retries with `PAYMENT-SIGNATURE` header
5. Server verifies and settles via AVNU — gas is sponsored
6. Client gets 200 + data + `PAYMENT-RESPONSE` header

No ERC-20 approvals. No gas for users. The signed OutsideExecution binds the exact transfer call — the facilitator cannot change amount or recipient.

## Links

- [GitHub](https://github.com/adipundir/starknet-x402)
- [Demo](https://starknet-x402.vercel.app/demo)
- [@starknetx402](https://x.com/starknetx402)

## License

MIT
