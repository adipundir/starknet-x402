# x402 for Starknet

> **HTTP-native micropayments for the decentralized web. Accept digital payments in one line of code.**

[![npm version](https://img.shields.io/npm/v/@x402/starknet-sdk.svg)](https://www.npmjs.com/package/@x402/starknet-sdk)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

x402 is an HTTP-native payment protocol that brings seamless micropayments to the internet. This implementation brings x402 to Starknet, leveraging STARK proofs for secure, scalable, and cost-effective payments.

## ✨ Features

- 🚀 **One-line integration** - Add payments to your API in seconds
- ⚡ **Fast settlement** - ~10 second transaction finality on Starknet
- 💰 **Micro-payments** - Accept payments as low as $0.001
- 🔒 **Secure** - Cryptographic signatures and on-chain verification
- 🌐 **HTTP-native** - Works with standard web infrastructure
- 🔌 **Multi-token** - Support STRK, ETH, USDC, and any ERC20
- 🤖 **Perfect for AI agents** - Programmatic payments for autonomous systems
- 📦 **TypeScript SDK** - Full type safety and IntelliSense support

## 🚀 Quick Start

### Installation

```bash
npm install @x402/starknet-sdk starknet
```

### Server Setup (Next.js Middleware)

```typescript
// middleware.ts
import { paymentMiddleware } from '@x402/starknet-sdk';

export default paymentMiddleware(
  process.env.RECIPIENT_ADDRESS!,
  {
    '/api/premium/data': {
      price: '10000000000000000',    // 0.01 STRK
      tokenAddress: '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
      network: 'sepolia',
      config: {
        description: 'Premium data access',
        mimeType: 'application/json',
      },
    },
  },
  {
    url: process.env.FACILITATOR_URL!,
  }
);

export const config = {
  matcher: '/api/premium/:path*',
};
```

### Client Usage (Automatic Payment)

```typescript
import { payAndRequest } from '@x402/starknet-sdk/client';
import { Account, RpcProvider } from 'starknet';

// Initialize Starknet account
const provider = new RpcProvider({ nodeUrl: 'https://starknet-sepolia.public.blastapi.io' });
const account = new Account(provider, accountAddress, privateKey, '1');

// Make paid request (automatic payment handling)
const response = await payAndRequest('http://api.example.com/premium/data', account);

if (response.ok) {
  const data = await response.json();
  console.log('Received:', data);
}
```

That's it! 🎉 You now have a complete x402 payment system.

---

## 📦 SDK Overview

The `@x402/starknet-sdk` provides everything you need to implement x402 payments:

### 🎯 Core Packages

| Package | Description | Use Case |
|---------|-------------|----------|
| **Client** | Payment creation & signing | Frontend/Browser apps |
| **Middleware** | Route protection | Next.js servers |
| **Facilitator** | Verification & settlement | Facilitator services |
| **Types** | TypeScript definitions | Type safety |
| **Utils** | Helper functions | All environments |

### 📚 Complete Documentation

- **[SDK Documentation](./packages/x402-starknet-sdk/README.md)** - Full SDK reference
- **[SDK Contents](./SDK_CONTENTS.md)** - Detailed package contents
- **[Project Structure](./PROJECT_STRUCTURE.md)** - Codebase organization
- **[Protocol Specification](./spec/scheme/exact/scheme_exact_starknet.md)** - x402 on Starknet
- **[Examples](./examples/)** - Code examples

---

## 🏗️ Architecture

```
┌──────────────┐
│   Client     │  1. Request resource (no payment)
│              │  ──────────────────────────────────►
└──────────────┘                                      ┌──────────────┐
                 ◄──────────────────────────────────  │   Server     │
                 2. 402 Payment Required               │  (Middleware)│
┌──────────────┐    (with requirements)               └──────────────┘
│   Client     │                                             │
│              │  3. Sign payment (off-chain)                │
│              │  ──────────────────────────────────►        │
└──────────────┘                                      ┌──────┴─────────┐
                                                      │  Facilitator   │
                                                      │                │
                                                      │  ┌──────────┐  │
                                                      │  │  Verify  │  │
                                                      │  │  (fast)  │  │
                                                      │  └──────────┘  │
                                                      │  ┌──────────┐  │
                                                      │  │  Settle  │  │
                                                      │  │(on-chain)│  │
                                                      │  └──────────┘  │
                                                      └────────────────┘
                                                             │
                                                             ▼
                                                   ┌──────────────────┐
┌──────────────┐                                  │  Starknet L2     │
│   Client     │  ◄───────────────────────────    │  - STARK proofs  │
│              │  4. 200 OK + Data                │  - Fast finality │
└──────────────┘     + Transaction Hash           │  - Low gas costs │
                                                   └──────────────────┘
```

### How It Works

1. **Client requests resource** → Receives `402 Payment Required` with payment details
2. **Client signs payment** → Off-chain signature (gasless)
3. **Middleware intercepts** → Verifies signature, settles on-chain
4. **Client receives resource** → With transaction hash

---

## 💡 Usage Examples

### Example 1: Protected API Endpoint

**Server (Next.js):**

```typescript
// middleware.ts
import { paymentMiddleware } from '@x402/starknet-sdk';

export default paymentMiddleware(
  '0x04ad015c7b45761cef82152303d133bbf2fd9b033e2ffa2af5ac76982d72b479', // Recipient
  {
    '/api/ai/chat': {
      price: '50000000000000000',      // 0.05 STRK per request
      tokenAddress: process.env.STRK_TOKEN!,
      network: 'sepolia',
      config: {
        description: 'AI Chat API',
        maxTimeoutSeconds: 60,
      },
    },
  },
  { url: 'http://localhost:3000/api/facilitator' }
);

// app/api/ai/chat/route.ts
export async function POST(request: Request) {
  const { message } = await request.json();
  
  // This route is protected - payment required!
  const aiResponse = await generateAIResponse(message);
  
  return Response.json({ response: aiResponse });
}
```

**Client (React):**

```typescript
import { payAndRequest } from '@x402/starknet-sdk/client';

function ChatApp() {
  const [response, setResponse] = useState('');
  
  const sendMessage = async (message: string) => {
    const account = await getStarknetAccount(); // Your wallet integration
    
    const res = await payAndRequest('/api/ai/chat', account, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
    
    if (res.ok) {
      const data = await res.json();
      setResponse(data.response);
    }
  };
  
  return <div>{/* Your UI */}</div>;
}
```

---

### Example 2: Multiple Pricing Tiers

```typescript
import { paymentMiddleware } from '@x402/starknet-sdk';

export default paymentMiddleware(
  process.env.RECIPIENT_ADDRESS!,
  {
    '/api/data/basic': {
      price: '10000000000000000',       // 0.01 STRK
      tokenAddress: STRK_TOKEN,
    },
    '/api/data/premium': {
      price: '100000000000000000',      // 0.1 STRK
      tokenAddress: STRK_TOKEN,
    },
    '/api/data/enterprise': {
      price: '1000000000000000000',     // 1 STRK
      tokenAddress: STRK_TOKEN,
    },
  },
  { url: process.env.FACILITATOR_URL! }
);
```

---

### Example 3: Browser Wallet Integration

```typescript
import { createPaymentPayload } from '@x402/starknet-sdk/client';
import { connect } from 'starknetkit';

async function payWithWallet() {
  // Connect wallet (ArgentX, Braavos, etc.)
  const { wallet } = await connect();
  
  // Get payment requirements
  const response = await fetch('/api/premium/data');
  const requirements = await response.json();
  const scheme = requirements.accepts[0];
  
  // Create payment (user signs in wallet)
  const payment = await createPaymentPayload(wallet.account, {
    to: scheme.payTo,
    token: scheme.asset,
    amount: scheme.maxAmountRequired,
    network: scheme.network,
  });
  
  // Send paid request
  const paidResponse = await fetch('/api/premium/data', {
    headers: { 'X-PAYMENT': payment.header },
  });
  
  return paidResponse.json();
}
```

---

## 🔧 Configuration

### Environment Variables

```bash
# Client Account (for demo/testing)
NEXT_PUBLIC_CLIENT_PRIVATE_KEY=0x...
NEXT_PUBLIC_CLIENT_ADDRESS=0x...

# Facilitator Account (server-side)
FACILITATOR_PRIVATE_KEY=0x...
NEXT_PUBLIC_FACILITATOR_ADDRESS=0x...

# Recipient Account (where payments go)
PAYMENT_RECIPIENT_ADDRESS=0x...

# Network Configuration
STARKNET_NODE_URL=https://starknet-sepolia.public.blastapi.io
NEXT_PUBLIC_NETWORK_ID=starknet-sepolia

# Token Addresses
NEXT_PUBLIC_TOKEN_ADDRESS=0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d
```

### Supported Networks

- ✅ Starknet Sepolia (testnet)
- ✅ Starknet Mainnet
- 🔄 Custom networks (configurable)

### Supported Tokens

- ✅ STRK (Starknet Token)
- ✅ ETH
- ✅ USDC
- ✅ USDT
- ✅ Any ERC20 token on Starknet

---

## 🎯 Use Cases

### API Monetization
- **Pay-per-request APIs** - Charge for each API call
- **Usage-based pricing** - Flexible pricing models
- **No subscription overhead** - Direct, immediate payments

### AI Services
- **LLM inference** - Pay per token/request
- **Image generation** - Pay per image
- **Data processing** - Pay per computation

### Content Access
- **Articles & media** - Micropayments for content
- **Data feeds** - Real-time data subscriptions
- **File storage** - Pay-per-access files

### Machine-to-Machine
- **IoT payments** - Device-to-device transactions
- **Autonomous agents** - AI-driven payments
- **Microservices** - Internal payment routing

---

## 📦 Project Structure

```
starknet-x402/
├── packages/
│   └── x402-starknet-sdk/          # 📦 The SDK (publishable)
│       ├── src/
│       │   ├── client/             # Payment creation & signing
│       │   ├── facilitator/        # Verification & settlement
│       │   ├── middleware/         # Next.js middleware
│       │   ├── types/              # TypeScript types
│       │   └── index.ts
│       ├── package.json
│       └── README.md
│
├── app/                            # Demo Next.js App
│   ├── api/
│   │   ├── facilitator/           # Facilitator endpoints
│   │   └── protected/             # Protected resources
│   └── page.tsx                   # Interactive demo UI
│
├── examples/                       # Usage examples
│   ├── client/
│   ├── server/
│   └── facilitator/
│
├── spec/                          # Protocol specification
│   └── scheme/exact/
│       └── scheme_exact_starknet.md
│
└── scripts/                       # Utility scripts
    ├── deploy-contract.sh
    └── generate-keys.ts
```

---

## 🛠️ Development

### Run Demo Application

```bash
# Install dependencies
npm install

# Set up environment
cp .env.example .env
# Add your keys to .env

# Start development server
npm run dev
```

Open http://localhost:3000 to see the interactive demo!

### Build SDK

```bash
cd packages/x402-starknet-sdk
npm run build
```

### Run Tests

```bash
npm test
```

---

## 🔐 Security

- ✅ **Off-chain signatures** - Client never exposes private key
- ✅ **Nonce protection** - Prevents replay attacks
- ✅ **Deadline enforcement** - Time-limited payments
- ✅ **Amount validation** - Exact amount control
- ✅ **Balance checks** - Ensures sufficient funds
- ✅ **Allowance verification** - ERC20 approval checks
- ✅ **On-chain settlement** - Cryptographically secured

---

## 🌟 Why x402 on Starknet?

### Starknet Benefits

| Feature | Benefit |
|---------|---------|
| **Low Fees** | 100x cheaper than Ethereum L1 |
| **Fast Finality** | ~10 second block times |
| **High Throughput** | Handle millions of micropayments |
| **Account Abstraction** | Native smart contract accounts |
| **STARK Proofs** | Superior cryptographic security |

### x402 Benefits

| Feature | Benefit |
|---------|---------|
| **HTTP Native** | Works with existing web infrastructure |
| **Simple Integration** | 1 line of code for servers |
| **Universal Standard** | Chain-agnostic protocol |
| **Developer Friendly** | Intuitive API and great docs |

---

## 📖 API Reference

### Client SDK

```typescript
import {
  createPaymentPayload,
  signPaymentWithAccount,
  payAndRequest,
  requestWithPayment,
  extractTransactionHash,
} from '@x402/starknet-sdk/client';
```

### Middleware SDK

```typescript
import { paymentMiddleware } from '@x402/starknet-sdk';
```

### Facilitator SDK

```typescript
import {
  verifyPayment,
  settlePayment,
  checkBalance,
  checkAllowance,
} from '@x402/starknet-sdk/facilitator';
```

**Full API documentation:** [SDK README](./packages/x402-starknet-sdk/README.md)

---

## 🗺️ Roadmap

### Completed ✅
- [x] Core protocol implementation
- [x] Exact payment scheme
- [x] Facilitator verification & settlement
- [x] Payment middleware for Next.js
- [x] Client SDK with automatic payment
- [x] TypeScript types and documentation
- [x] Interactive demo application
- [x] Build system passing

### In Progress 🔄
- [ ] SDK publishing to npm
- [ ] React hooks (`usePayment`, `useProtectedResource`)
- [ ] Express.js adapter
- [ ] CLI tools for testing

### Planned 📋
- [ ] Payment streaming
- [ ] Subscription support
- [ ] Multi-facilitator support
- [ ] Rate limiting integration
- [ ] Analytics dashboard
- [ ] Mainnet deployment

---

## 🤝 Contributing

Contributions are welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

---

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

## 🔗 Resources

- [x402 Specification](https://github.com/coinbase/x402)
- [Starknet Documentation](https://docs.starknet.io)
- [Starknet.js](https://www.starknetjs.com)
- [Cairo Language](https://www.cairo-lang.org)

---

## 💬 Support

- **GitHub Issues**: [Report bugs](https://github.com/yourusername/starknet-x402/issues)
- **Documentation**: [Full docs](./packages/x402-starknet-sdk/README.md)
- **Examples**: [Code examples](./examples/)

---

## ⚡ Philosophy

> "Payments on the internet are fundamentally flawed. Credit cards are high friction, hard to accept, have minimum payments that are far too high, and don't fit into the programmatic nature of the internet. It's time for an open, internet-native form of payments."

x402 on Starknet makes this vision real.

---

**Built with ❤️ for the open web**
