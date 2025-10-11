/**
 * Example Express Server with x402 Payment Middleware
 * 
 * This demonstrates how to accept payments on a resource server
 * using just 1 line of code!
 */

import express from 'express';
import { paymentMiddleware } from '../src/middleware/payment-middleware';

const app = express();
const PORT = 3000;

// ============================================================================
// Setup Payment Middleware
// ============================================================================

// This is it! One line to accept payments
app.use(
  paymentMiddleware(
    '0x1234567890123456789012345678901234567890123456789012345678901234', // Your Starknet address
    {
      '/api/data': '$0.01',           // $0.01 to access /api/data
      '/api/premium': '$0.10',         // $0.10 to access /api/premium
      '/api/ai-query': '$0.05',        // $0.05 per AI query
    },
    {
      facilitatorUrl: 'http://localhost:3001',
      network: 'starknet-sepolia',
      tokenAddress: '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7', // ETH
      timeoutSeconds: 300,
    }
  )
);

// ============================================================================
// API Endpoints (Protected by Payment)
// ============================================================================

app.get('/api/data', (req, res) => {
  res.json({
    message: 'Here is your data!',
    data: {
      temperature: 72,
      humidity: 45,
      timestamp: Date.now(),
    },
  });
});

app.get('/api/premium', (req, res) => {
  res.json({
    message: 'Premium data access granted!',
    data: {
      insights: ['Insight 1', 'Insight 2', 'Insight 3'],
      predictions: [95, 87, 92],
      confidence: 0.94,
    },
  });
});

app.post('/api/ai-query', express.json(), (req, res) => {
  const { query } = req.body;
  
  res.json({
    query,
    response: `AI response to: ${query}`,
    tokensUsed: 150,
    processingTime: 234,
  });
});

// ============================================================================
// Free Endpoints (No Payment Required)
// ============================================================================

app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to the x402 API!',
    endpoints: {
      '/api/data': 'Get basic data - $0.01',
      '/api/premium': 'Get premium insights - $0.10',
      '/api/ai-query': 'Query AI model - $0.05',
    },
    protocol: 'x402',
    network: 'starknet-sepolia',
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// ============================================================================
// Start Server
// ============================================================================

app.listen(PORT, () => {
  console.log(`🚀 x402 Resource Server running on http://localhost:${PORT}`);
  console.log('');
  console.log('Payment-protected endpoints:');
  console.log('  GET  /api/data      - $0.01');
  console.log('  GET  /api/premium   - $0.10');
  console.log('  POST /api/ai-query  - $0.05');
  console.log('');
  console.log('Free endpoints:');
  console.log('  GET  /            - API info');
  console.log('  GET  /health      - Health check');
});


