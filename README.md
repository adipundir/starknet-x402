# x402 for Starknet

> **1 line of code to accept digital dollars. No fee, 2 second settlement, $0.001 minimum payment.**

x402 is an HTTP-native payment protocol that brings seamless micropayments to the internet. This implementation brings x402 to Starknet, leveraging STARK proofs for secure, scalable, and cost-effective payments.

## ✨ Features

- 🚀 **One-line integration** - Add payments to your API in seconds
- ⚡ **Fast settlement** - 2-second transaction finality on Starknet
- 💰 **Micro-payments** - Accept payments as low as $0.001
- 🔒 **Secure** - Cryptographic signatures and on-chain verification
- 🌐 **HTTP-native** - Works with standard web infrastructure
- 🔌 **Chain agnostic** - Extensible to other blockchains
- 🤖 **Perfect for AI agents** - Programmatic payments for autonomous systems

## 🏗️ Architecture

```
┌──────────┐         ┌──────────────┐         ┌────────────┐
│          │  HTTP   │              │   RPC   │            │
│  Client  │◄───────►│   Resource   │◄───────►│Facilitator │
│          │         │    Server    │         │   Server   │
└──────────┘         └──────────────┘         └────────────┘
     │                                              │
     │              Sign Transactions               │
     └──────────────────────────────────────────────┘
                         │
                         ▼
              ┌─────────────────────┐
              │                     │
              │  Starknet L2        │
              │  - Fast finality    │
              │  - Low gas costs    │
              │  - STARK proofs     │
              │                     │
              └─────────────────────┘
```

## 🚀 Quick Start

### 5-Minute Setup

```bash
# 1. Install dependencies
npm install

# 2. Generate test keys
npm run generate-keys

# 3. Configure environment
cp env.example .env
# Add your generated keys to .env

# 4. Run everything!
npm run demo
```

**Open:** http://localhost:3000

That's it! 🎉 You now have a complete x402 payment system running.

### Try the Interactive Demo

1. Navigate to http://localhost:3000
2. Click **"Try Demo"**
3. Select a protected endpoint
4. Watch the payment flow in real-time
5. See settlement on Starknet Sepolia

### 1. Accept Payments (1 Line!)

```typescript
import express from 'express';
import { paymentMiddleware } from './src/middleware/payment-middleware';

const app = express();

// 🎉 That's it! One line to accept payments
app.use(
  paymentMiddleware("0xYourStarknetAddress", {
    "/api/data": "$0.01",
    "/api/premium": "$0.10"
  })
);

app.get('/api/data', (req, res) => {
  res.json({ data: 'Your protected content' });
});

app.listen(3000);
```

### 2. Run a Facilitator

```bash
# Configure environment
cp env.example .env
# Edit .env with your settings

# Start facilitator
npm run facilitator
```

### 3. Make Payments

```typescript
import { createPaymentClient } from './src/client/payment-client';

const client = createPaymentClient({
  account: starknetAccount,
  provider: rpcProvider,
  network: 'starknet-sepolia',
});

const result = await client.pay('http://localhost:3000/api/data');
console.log(result.response);
```

## 📚 Documentation

- **[Quick Start](./QUICKSTART.md)** - 5-minute setup guide
- **[Getting Started](./docs/GETTING_STARTED.md)** - Complete setup guide
- **[Frontend Demo](./docs/FRONTEND_DEMO.md)** - Interactive demo guide
- **[API Reference](./docs/API_REFERENCE.md)** - Full API documentation
- **[Architecture](./docs/ARCHITECTURE.md)** - Technical deep-dive
- **[Deployment](./docs/DEPLOYMENT.md)** - Production deployment
- **[Contributing](./CONTRIBUTING.md)** - Contribution guidelines
- **[Examples](./examples/)** - Code examples and demos

## 🏃 Running Examples

### Run Everything at Once

```bash
npm run demo
```

This starts:
- ✅ **Frontend** (http://localhost:3000) - Interactive demo UI
- ✅ **Facilitator** (port 3001) - Payment verification
- ✅ **Resource Server** (port 3000) - Protected APIs

### Or Run Services Individually

#### Start the Facilitator Server

```bash
npm run facilitator
```

The facilitator runs on port 3001 and provides:
- `GET /supported` - List supported schemes and networks
- `POST /verify` - Verify payment signatures
- `POST /settle` - Settle payments on Starknet

#### Start the Resource Server

```bash
npm run server
```

The resource server runs on port 3000 with protected endpoints:
- `GET /api/data` - $0.01
- `GET /api/premium` - $0.10
- `POST /api/ai-query` - $0.05

#### Start the Frontend

```bash
npm run dev
```

Beautiful Next.js UI with:
- Landing page with protocol overview
- Interactive payment demo
- Complete documentation
- Real-time payment visualization

#### Run the Client Example

```bash
npm run client
```

## 🔧 Configuration

### Generate Keys

First, generate test keypairs:

```bash
npm run generate-keys
```

This creates:
- Demo account (client) keypair
- Facilitator keypair  
- Resource server address

### Environment Variables

Copy `.env.example` to `.env` and add your generated keys:

```bash
# Client Account (from generate-keys or KEYPAIRS.md)
NEXT_PUBLIC_CLIENT_PRIVATE_KEY=0x...
NEXT_PUBLIC_CLIENT_ADDRESS=0x...

# Facilitator Account (from generate-keys or KEYPAIRS.md)
FACILITATOR_PRIVATE_KEY=0x...
NEXT_PUBLIC_FACILITATOR_ADDRESS=0x...

# Recipient Account (from KEYPAIRS.md)
NEXT_PUBLIC_RECIPIENT_ADDRESS=0x...

# Network Configuration
STARKNET_NODE_URL=https://starknet-sepolia.public.blastapi.io
NEXT_PUBLIC_STARKNET_NODE_URL=https://starknet-sepolia.public.blastapi.io
NEXT_PUBLIC_NETWORK_ID=SN_SEPOLIA
NEXT_PUBLIC_TOKEN_ADDRESS=0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d

# Frontend URLs
NEXT_PUBLIC_FRONTEND_URL=http://localhost:3000
NEXT_PUBLIC_NETWORK_NAME=Starknet Sepolia Testnet
NEXT_PUBLIC_EXPLORER_URL=https://sepolia.starkscan.co
```

### Funding Test Accounts (Optional)

For real testnet transactions:

1. Visit [Starknet Sepolia Faucet](https://faucet.goerli.starknet.io/)
2. Enter your `NEXT_PUBLIC_CLIENT_ADDRESS`
3. Request test ETH and STRK tokens

## 🎯 Use Cases

### For APIs & Services

- Pay-per-use APIs
- Content access (articles, videos, data)
- AI model inference
- File storage and retrieval
- Real-time data feeds

### For AI Agents

- Autonomous payments for resources
- Machine-to-machine transactions
- Programmatic API access
- Dynamic resource allocation
- Pay-as-you-go computing

### For Creators

- Micropayments for content
- No subscription overhead
- Direct monetization
- Global accessibility
- Instant settlement

## 🛠️ Tech Stack

- **Blockchain**: Starknet L2
- **Smart Contracts**: Cairo
- **Backend**: TypeScript, Express
- **HTTP Protocol**: x402
- **Cryptography**: STARK signatures

## 📦 Project Structure

```
starknet-x402/
├── src/
│   ├── types/           # TypeScript type definitions
│   ├── contracts/       # Cairo smart contracts
│   ├── facilitator/     # Facilitator server implementation
│   │   ├── server.ts
│   │   ├── starknet-verifier.ts
│   │   └── starknet-settler.ts
│   ├── middleware/      # Payment middleware for resource servers
│   └── client/          # Payment client library
├── examples/
│   ├── facilitator.ts   # Facilitator server example
│   ├── express-server.ts # Resource server example
│   └── client-example.ts # Client usage examples
├── docs/
│   ├── GETTING_STARTED.md
│   └── API_REFERENCE.md
└── app/                 # Next.js UI (optional dashboard)
```

## 🔐 Security

- **Signature Verification**: All payments cryptographically signed
- **Nonce Protection**: Prevents replay attacks
- **Deadline Enforcement**: Time-limited payments
- **Amount Validation**: Strict payment verification
- **Balance Checks**: Ensures sufficient funds

## 🌟 Why x402 on Starknet?

### Starknet Benefits

- **Low Fees**: Orders of magnitude cheaper than L1
- **Fast Finality**: 2-second block times
- **High Throughput**: Handle millions of micropayments
- **Native Account Abstraction**: Flexible signature schemes
- **STARK Proofs**: Superior cryptographic security

### x402 Benefits

- **HTTP Native**: Works with existing web infrastructure
- **No Integration Overhead**: 1 line of code for servers
- **Universal Standard**: Chain-agnostic protocol
- **Extensible**: Support for multiple payment schemes
- **Developer Friendly**: Simple, intuitive API

## 🗺️ Roadmap

- [x] Core protocol implementation
- [x] Exact payment scheme
- [x] Facilitator server
- [x] Payment middleware
- [x] Client library
- [x] Cairo smart contracts
- [ ] Smart contract deployment scripts
- [ ] Web dashboard for monitoring
- [ ] Additional payment schemes (upto, streaming)
- [ ] Multi-token support
- [ ] Rate limiting & quotas
- [ ] Analytics & reporting
- [ ] Mainnet deployment

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests.

## 📄 License

MIT License - see [LICENSE](LICENSE) for details

## 🔗 Resources

- [x402 Specification](https://github.com/x402/spec)
- [Starknet Documentation](https://docs.starknet.io)
- [Cairo Language](https://www.cairo-lang.org)
- [Starknet.js](https://www.starknetjs.com)

## 💬 Community

- GitHub Issues: Report bugs and request features
- Discord: Join our community
- Twitter: Follow for updates

## ⚡ Philosophy

> "Payments on the internet are fundamentally flawed. Credit Cards are high friction, hard to accept, have minimum payments that are far too high, and don't fit into the programmatic nature of the internet. It's time for an open, internet-native form of payments."

x402 on Starknet makes this vision real.

---

**Built with ❤️ for the open web**