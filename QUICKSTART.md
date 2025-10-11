# 🚀 Quick Start Guide

Get x402 running in 5 minutes!

## Prerequisites

- Node.js 18+ installed
- npm or yarn
- Terminal access

## Step 1: Clone & Install (1 min)

```bash
# Clone the repository
git clone https://github.com/yourusername/starknet-x402.git
cd starknet-x402

# Install dependencies
npm install
```

## Step 2: Generate Keys (1 min)

```bash
# Generate test keypairs
npm run generate-keys
```

You'll see output like:

```
🔑 Private Key (Keep this SECRET!):
0xabcd1234...

🔓 Public Key:
0xef567890...

📍 Account Address:
0x12345678...
```

**Copy these values!** You'll need them next.

## Step 3: Configure Environment (1 min)

```bash
# Copy environment template
cp env.example .env

# Open in your editor
nano .env
# or
code .env
```

Add your generated keys:

```env
# From generate-keys output
DEMO_PRIVATE_KEY=0xabcd1234...
DEMO_PUBLIC_KEY=0xef567890...
DEMO_ACCOUNT_ADDRESS=0x12345678...

FACILITATOR_PRIVATE_KEY=0x...
FACILITATOR_ADDRESS=0x...
RESOURCE_SERVER_ADDRESS=0x...

# Use Sepolia testnet
STARKNET_RPC_URL=https://starknet-sepolia.public.blastapi.io
NETWORK=starknet-sepolia
```

## Step 4: Run Demo (1 min)

```bash
# Run everything at once!
npm run demo
```

This starts:
- ✅ Facilitator server (port 3001)
- ✅ Resource server (port 3000)
- ✅ Frontend (port 3000)

## Step 5: Try It! (1 min)

Open your browser:

```
http://localhost:3000
```

Then click **"Try Demo"** and watch the magic happen! ✨

## What You Just Built

You now have a complete x402 payment system:

1. **Frontend** - Beautiful UI showcasing the protocol
2. **Resource Server** - API accepting micropayments
3. **Facilitator** - Verification and settlement service
4. **Smart Contract** - Ready to deploy to Starknet

## Next Steps

### Option A: Use Demo Mode (Recommended First)

No blockchain needed! Perfect for testing:

```env
NEXT_PUBLIC_DEMO_MODE=true
MOCK_MODE=true
```

### Option B: Use Real Testnet

1. **Fund your test account:**
   - Visit [Starknet Sepolia Faucet](https://faucet.goerli.starknet.io/)
   - Enter your `DEMO_ACCOUNT_ADDRESS`
   - Request test ETH

2. **Deploy smart contract:**
   ```bash
   chmod +x scripts/deploy-contract.sh
   ./scripts/deploy-contract.sh sepolia
   ```

3. **Update environment:**
   ```env
   PAYMENT_PROCESSOR_ADDRESS=<deployed-address>
   MOCK_MODE=false
   ```

4. **Restart services:**
   ```bash
   npm run demo
   ```

## Project Structure

```
starknet-x402/
├── app/              # Next.js frontend
│   ├── page.tsx      # Landing page
│   ├── demo/         # Interactive demo
│   └── docs/         # Documentation
├── src/
│   ├── facilitator/  # Payment verification
│   ├── middleware/   # Express middleware (1 line!)
│   ├── client/       # Payment client library
│   └── contracts/    # Cairo smart contracts
├── examples/         # Working examples
└── docs/            # Full documentation
```

## Available Commands

```bash
# Development
npm run dev              # Start frontend only
npm run facilitator      # Start facilitator only
npm run server          # Start resource server only
npm run demo            # Start everything

# Utilities
npm run generate-keys   # Generate new keypairs
npm run compile         # Compile TypeScript

# Examples
npm run client          # Run client examples
```

## Common Issues

### Port Already in Use

```bash
# Find and kill process
lsof -i :3000
kill -9 <PID>

# Or use different port
PORT=3002 npm run dev
```

### Keys Not Working

```bash
# Regenerate keys
npm run generate-keys

# Update .env with new values
```

### RPC Connection Failed

Try a different RPC endpoint in `.env`:

```env
# Alternative RPCs
STARKNET_RPC_URL=https://starknet-sepolia.infura.io/v3/YOUR-KEY
STARKNET_RPC_URL=https://rpc.starknet-testnet.lava.build
```

## Learn More

- **[Full Documentation](docs/GETTING_STARTED.md)** - Complete guide
- **[API Reference](docs/API_REFERENCE.md)** - API docs
- **[Frontend Demo](docs/FRONTEND_DEMO.md)** - Frontend guide
- **[Architecture](docs/ARCHITECTURE.md)** - Technical deep-dive

## Example Code

### Accept Payments (1 Line!)

```typescript
import { paymentMiddleware } from 'starknet-x402';

app.use(
  paymentMiddleware("0xYourAddress", {
    "/api/data": "$0.01"
  })
);
```

### Make Payments

```typescript
import { createPaymentClient } from 'starknet-x402';

const client = createPaymentClient({ account, provider, network });
const result = await client.pay('http://api.example.com/data');
```

## Get Help

- 📖 [Documentation](docs/)
- 🐛 [Report Issues](https://github.com/yourusername/starknet-x402/issues)
- 💬 [Discussions](https://github.com/yourusername/starknet-x402/discussions)
- 🐦 [Twitter](#)

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md).

---

**That's it!** You're now accepting payments on the internet. 🎉

Built with ❤️ for the open web


