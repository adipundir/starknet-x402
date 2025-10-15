# x402 Starknet SDK Examples

Complete examples demonstrating how to use the `@adipundir/starknet-x402` SDK for HTTP-native micropayments on Starknet.

## 📦 Installation

```bash
npm install @adipundir/starknet-x402 starknet
```

For server examples:
```bash
npm install @adipundir/starknet-x402 starknet express next
```

---

## 📚 Examples Overview

### 1. [Client Examples](./client/)
How to create and send payments from your application

- **[client-payment-example.ts](./client/client-payment-example.ts)** - Complete client payment flows
  - Manual payment flow (step-by-step)
  - Automatic payment flow (one function)
  - Mock payments (for testing)
  - Payment payload structure

### 2. [Server Examples](./server/)
How to protect your API endpoints with x402 payments

- **[nextjs-middleware-example.ts](./server/nextjs-middleware-example.ts)** - Next.js middleware (recommended)
  - One-line integration
  - Route configuration
  - Multiple tokens
  - Dynamic pricing

- **[express-server-example.ts](./server/express-server-example.ts)** - Express.js server
  - Manual payment checking
  - Route protection
  - 402 responses

### 3. [Facilitator Examples](./facilitator/)
How to run verification and settlement services

- **[facilitator-example.ts](./facilitator/facilitator-example.ts)** - Complete facilitator service
  - Payment verification
  - On-chain settlement
  - Custom logic
  - Batch processing

---

## 🚀 Quick Start

### Client: Making Payments

```typescript
import { Account, RpcProvider } from 'starknet';
import { payAndRequest } from '@adipundir/starknet-x402';

// Setup account
const provider = new RpcProvider({ nodeUrl: RPC_URL });
const account = new Account(provider, ADDRESS, PRIVATE_KEY);

// Make a paid request (automatic payment handling)
const response = await payAndRequest(
  'https://api.example.com/data',
  account
);

const data = await response.json();
console.log(data);
```

### Server: Accepting Payments (Next.js)

```typescript
// middleware.ts
import { paymentMiddleware } from '@adipundir/starknet-x402';

const routes = {
  '/api/data': {
    amount: '10000000000000000', // 0.01 STRK
    token: '0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d',
  },
};

export default paymentMiddleware(recipientAddress, routes);

export const config = {
  matcher: ['/api/:path*'],
};
```

---

## 📖 Example Details

### Client Payment Example

**File:** `client/client-payment-example.ts`

**What it shows:**
- 4 complete payment flows
- How to handle 402 responses
- Signature creation
- Payment verification
- Settlement tracking

**Run it:**
```bash
# Start the server first
npm run dev

# Then run the client example
ts-node examples/client/client-payment-example.ts
```

**Key functions:**
- `signPaymentWithPrivateKey()` - Sign payment with private key
- `payAndRequest()` - Automatic payment + request
- `requestWithPayment()` - Manual request with payment header
- `decodeSettlementResponse()` - Parse settlement details

---

### Next.js Middleware Example

**File:** `server/nextjs-middleware-example.ts`

**What it shows:**
- One-line payment protection
- Route configuration
- Multiple pricing tiers
- Dynamic pricing
- Multi-token support

**Use it:**
```bash
# Copy to your Next.js project
cp examples/server/nextjs-middleware-example.ts middleware.ts

# Configure routes and start
npm run dev
```

**Features:**
- ✅ Automatic 402 responses
- ✅ Payment verification
- ✅ On-chain settlement
- ✅ Route matching
- ✅ Custom configuration

---

### Express Server Example

**File:** `server/express-server-example.ts`

**What it shows:**
- Manual payment checking
- 402 response format
- Protected endpoints
- Route configuration

**Run it:**
```bash
ts-node examples/server/express-server-example.ts
```

**Endpoints:**
- `GET /api/weather` - 0.01 STRK
- `GET /api/premium` - 0.1 STRK
- `POST /api/ai-query` - 0.05 STRK

---

### Facilitator Example

**File:** `facilitator/facilitator-example.ts`

**What it shows:**
- Verification endpoint
- Settlement endpoint
- Custom validation
- Batch processing
- Fee management

**Run it:**
```bash
# Set environment variables
export FACILITATOR_PRIVATE_KEY=0x...
export NEXT_PUBLIC_FACILITATOR_ADDRESS=0x...
export STARKNET_NODE_URL=https://starknet-sepolia.public.blastapi.io

# Start facilitator
ts-node examples/facilitator/facilitator-example.ts
```

**Endpoints:**
- `GET /supported` - List supported schemes
- `POST /verify` - Verify payment
- `POST /settle` - Settle on-chain

---

## 🔧 Configuration

### Environment Variables

Create a `.env` file:

```bash
# Client Account
NEXT_PUBLIC_CLIENT_PRIVATE_KEY=0x...
NEXT_PUBLIC_CLIENT_ADDRESS=0x...

# Facilitator Account
FACILITATOR_PRIVATE_KEY=0x...
NEXT_PUBLIC_FACILITATOR_ADDRESS=0x...

# Recipient Account
NEXT_PUBLIC_RECIPIENT_ADDRESS=0x...

# Network
STARKNET_NODE_URL=https://starknet-sepolia.public.blastapi.io
NEXT_PUBLIC_NETWORK_ID=SN_SEPOLIA

# Token (STRK on Sepolia)
NEXT_PUBLIC_TOKEN_ADDRESS=0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d
```

### Generate Test Keys

```bash
npm run generate-keys
```

This creates:
- Client keypair
- Facilitator keypair
- Displays addresses

---

## 💡 Common Patterns

### 1. Simple Payment

```typescript
import { payAndRequest } from '@adipundir/starknet-x402';

const response = await payAndRequest(url, account);
```

### 2. Manual Payment Flow

```typescript
import { signPaymentWithPrivateKey, requestWithPayment } from '@adipundir/starknet-x402';

// Get requirements
const initial = await fetch(url);
const requirements = await initial.json();

// Sign payment
const payment = await signPaymentWithPrivateKey(
  privateKey,
  provider,
  requirements
);

// Send with payment
const response = await requestWithPayment(url, payment.paymentHeader);
```

### 3. Protect Routes (Next.js)

```typescript
import { paymentMiddleware } from '@adipundir/starknet-x402';

export default paymentMiddleware(recipientAddress, {
  '/api/*': { amount: '10000000000000000', token: STRK_TOKEN },
});
```

### 4. Custom Verification

```typescript
import { verifyPayment } from '@adipundir/starknet-x402';

const result = await verifyPayment(payload, requirements, {
  checkSignature: true,
  checkBalance: true,
  checkDeadline: true,
});
```

---

## 🧪 Testing

### Test Payment Flow

```bash
# Terminal 1: Start server
npm run dev

# Terminal 2: Run client
ts-node examples/client/client-payment-example.ts
```

### Test with curl

```bash
# Request without payment (should get 402)
curl http://localhost:3000/api/weather

# Request with payment (get the header from client example)
curl -H "X-PAYMENT: <base64-payload>" http://localhost:3000/api/weather
```

---

## 📊 Payment Amounts

Starknet uses 18 decimals for STRK token:

| Amount | Wei | Human-Readable |
|--------|-----|----------------|
| `10000000000000000` | 10^16 | 0.01 STRK |
| `50000000000000000` | 5×10^16 | 0.05 STRK |
| `100000000000000000` | 10^17 | 0.1 STRK |
| `1000000000000000000` | 10^18 | 1 STRK |

Calculate amounts:
```typescript
const amount = (0.01 * 10**18).toString(); // 0.01 STRK
```

---

## 🔗 Resources

- **npm Package:** https://www.npmjs.com/package/@adipundir/starknet-x402
- **GitHub Repo:** https://github.com/adipundir/starknet-x402
- **x402 Spec:** HTTP 402 Payment Required
- **Starknet Docs:** https://docs.starknet.io

---

## 💬 Support

- **Issues:** https://github.com/adipundir/starknet-x402/issues
- **Discussions:** https://github.com/adipundir/starknet-x402/discussions

---

## 📝 License

MIT License - see [LICENSE](../LICENSE) for details

---

**Happy building with x402 on Starknet! 🚀**

