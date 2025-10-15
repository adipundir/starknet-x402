# @x402/starknet-sdk

> x402 payment protocol SDK for Starknet - HTTP-native micropayments

## Installation

```bash
npm install @x402/starknet-sdk starknet
```

## Features

- 🔐 **Secure**: Off-chain signatures, on-chain settlement
- ⚡ **Fast**: Verify payments without waiting for blockchain confirmation
- 💰 **Flexible**: Support any ERC20 token (STRK, ETH, USDC, etc.)
- 🎯 **Simple**: Easy integration with Next.js and Express
- 📦 **TypeScript**: Full type safety

## Quick Start

### Server Setup (Next.js)

```typescript
import { paymentMiddleware } from '@x402/starknet-sdk';

export const config = {
  matcher: '/api/protected/:path*',
};

export default paymentMiddleware(
  process.env.RECIPIENT_ADDRESS!, // Where payments go
  {
    '/api/protected/weather': {
      price: '10000000000000000', // 0.01 STRK
      tokenAddress: '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
      network: 'sepolia',
      config: {
        description: 'Access to weather API',
        mimeType: 'application/json',
      },
    },
  },
  {
    url: 'http://localhost:3000/api/facilitator',
  }
);
```

### Client Usage

```typescript
import { Account, RpcProvider } from 'starknet';

// 1. Initialize Starknet account
const provider = new RpcProvider({ nodeUrl: 'https://starknet-sepolia.public.blastapi.io' });
const account = new Account(provider, accountAddress, privateKey, '1');

// 2. Make payment request
const response = await fetch('http://localhost:3000/api/protected/weather');

if (response.status === 402) {
  const paymentRequirements = await response.json();
  const scheme = paymentRequirements.accepts[0];

  // 3. Sign payment
  const nonce = '0x' + Array.from(new Uint8Array(31))
    .map(() => Math.floor(Math.random() * 256).toString(16).padStart(2, '0'))
    .join('');
  
  const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour

  const message = {
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
    primaryType: 'Payment',
    domain: {
      name: 'x402 Payment',
      version: '1',
      chainId: '0x534e5f5345504f4c4941',
    },
    message: {
      from: accountAddress.toLowerCase(),
      to: scheme.payTo.toLowerCase(),
      token: scheme.asset.toLowerCase(),
      amount: scheme.maxAmountRequired,
      nonce: nonce.toLowerCase(),
      deadline: deadline.toString(),
    },
  };

  const sig = await account.signMessage(message);
  const sigR = typeof sig[0] === 'bigint' ? '0x' + sig[0].toString(16) : sig[0];
  const sigS = typeof sig[1] === 'bigint' ? '0x' + sig[1].toString(16) : sig[1];

  // 4. Send payment header
  const paymentPayload = {
    x402Version: 1,
    scheme: 'exact',
    network: 'starknet-sepolia',
    payload: {
      from: accountAddress.toLowerCase(),
      to: scheme.payTo.toLowerCase(),
      token: scheme.asset.toLowerCase(),
      amount: scheme.maxAmountRequired,
      nonce: nonce.toLowerCase(),
      deadline,
      signature: { r: sigR, s: sigS },
    },
  };

  const paymentHeader = Buffer.from(JSON.stringify(paymentPayload)).toString('base64');

  const paidResponse = await fetch('http://localhost:3000/api/protected/weather', {
    headers: {
      'X-PAYMENT': paymentHeader,
    },
  });

  const data = await paidResponse.json();
  console.log(data); // Weather data!
}
```

## API Reference

### `paymentMiddleware(recipientAddress, routes, facilitatorConfig)`

Creates a Next.js middleware for x402 payments.

**Parameters:**
- `recipientAddress` (string): Starknet address where payments should be sent
- `routes` (object): Map of route paths to their payment requirements
- `facilitatorConfig` (object): Configuration for the payment facilitator

**Returns:** Next.js middleware function

### Types

```typescript
interface RouteConfig {
  price: string; // Amount in wei
  tokenAddress: string; // ERC20 token contract address
  network?: 'sepolia' | 'mainnet';
  config?: {
    description?: string;
    mimeType?: string;
    maxTimeoutSeconds?: number;
  };
}

interface PaymentRequirements {
  scheme: string;
  network: string;
  maxAmountRequired: string;
  resource: string;
  description: string;
  payTo: string;
  asset: string;
}
```

## Architecture

```
┌─────────┐                    ┌──────────┐
│ Client  │ ─── X-PAYMENT ───> │ Server   │
└─────────┘                    └────┬─────┘
                                    │
                              ┌─────┴─────┐
                              │ Middleware│
                              └─────┬─────┘
                                    │
                         ┌──────────┴──────────┐
                         │                     │
                    ┌────▼────┐          ┌────▼────┐
                    │ Verify  │          │ Settle  │
                    │ (fast)  │          │(on-chain)│
                    └─────────┘          └─────────┘
```

## Security

- ✅ Off-chain signatures (gasless for users)
- ✅ ERC20 `transfer_from` pattern (requires approval)
- ✅ Nonce prevents replay attacks
- ✅ Deadline prevents stale payments
- ✅ Exact amount control
- ✅ Recipient address locked

## License

MIT

