'use client';

import Link from 'next/link';

const code = {
  install: `npm install starknet-x402`,

  server: `// middleware.ts
import { paymentMiddleware, TOKENS } from 'starknet-x402';

export const middleware = paymentMiddleware(
  process.env.RECIPIENT_ADDRESS!,
  {
    '/api/weather': {
      price: '10000',                    // 0.01 USDC
      tokenAddress: TOKENS.USDC_SEPOLIA,
      network: 'sepolia',
    },
    '/api/analytics': {
      price: '100000',                   // 0.10 USDC
      tokenAddress: TOKENS.USDC_SEPOLIA,
      network: 'sepolia',
      config: {
        description: 'Premium analytics data',
        maxTimeoutSeconds: 600,
      },
    },
  },
  { url: process.env.FACILITATOR_URL! }
);

export const config = {
  matcher: '/api/:path*',
};`,

  route: `// app/api/weather/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    city: 'Cairo',
    temp: '34°C',
    conditions: 'Sunny',
  });
}`,

  clientAxios: `import { x402axios } from 'starknet-x402';
import { Account, RpcProvider } from 'starknet';

const provider = new RpcProvider({ nodeUrl: process.env.STARKNET_RPC_URL });
const account = new Account(provider, address, privateKey);

// Automatic 402 handling — request, sign, pay, done
const result = await x402axios.get('https://api.example.com/api/weather', {
  account,
  network: 'starknet-sepolia',
});

console.log(result.data);                    // { city, temp, conditions }
console.log(result.settlement?.transaction); // tx hash on Starknet`,

  clientFetch: `import { payAndRequest } from 'starknet-x402';
import { Account, RpcProvider } from 'starknet';

const provider = new RpcProvider({ nodeUrl: process.env.STARKNET_RPC_URL });
const account = new Account(provider, address, privateKey);

const response = await payAndRequest(
  'https://api.example.com/api/weather',
  account,
  { network: 'starknet-sepolia' },
);

const data = await response.json();`,

  clientMethods: `// All HTTP methods supported
await x402axios.post(url, { account, network: 'starknet-sepolia', data: { query: '...' } });
await x402axios.put(url, { account, network: 'starknet-sepolia' });
await x402axios.patch(url, { account, network: 'starknet-sepolia' });
await x402axios.delete(url, { account, network: 'starknet-sepolia' });`,

  customPaymaster: `const result = await x402axios.get(url, {
  account,
  network: 'starknet-sepolia',
  paymasterUrl: 'https://custom-paymaster.com',
  paymasterApiKey: 'your-api-key',
});`,

  env: `# .env
STARKNET_RPC_URL=https://starknet-sepolia.g.alchemy.com/starknet/version/rpc/v0_8/...
RECIPIENT_ADDRESS=0x...          # your address that receives payments
FACILITATOR_URL=https://...      # facilitator service URL`,

  tokens: `import { TOKENS } from 'starknet-x402';

TOKENS.USDC_SEPOLIA   // 0x0512fe...D8343
TOKENS.USDC_MAINNET   // 0x03306...e93fb
TOKENS.STRK_SEPOLIA   // 0x04718...c938d
TOKENS.ETH            // 0x049d3...04dc7`,
};

function CodeBlock({ children, title }: { children: string; title?: string }) {
  return (
    <div className="relative group">
      {title && <div className="text-xs text-zinc-500 mb-2 font-mono">{title}</div>}
      <pre className="bg-zinc-950 border border-zinc-800 text-zinc-300 p-5 rounded-xl text-sm overflow-x-auto leading-relaxed">
        {children}
      </pre>
    </div>
  );
}

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20">
      <h2 className="text-xl font-bold text-white mb-6 pt-12 border-t border-white/5">{title}</h2>
      {children}
    </section>
  );
}

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-white font-sans">
      {/* Nav */}
      <nav className="border-b border-white/5 sticky top-0 bg-[#09090b]/90 backdrop-blur-sm z-50">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="font-bold text-lg hover:text-zinc-300 transition">starknet x402</Link>
          <div className="flex gap-1">
            <Link href="/docs" className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white hover:bg-white/5 rounded-md transition">Docs</Link>
            <Link href="/demo" className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white hover:bg-white/5 rounded-md transition">Demo</Link>
            <a href="https://github.com/adipundir/starknet-x402" target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white hover:bg-white/5 rounded-md transition">GitHub</a>
            <a href="https://www.npmjs.com/package/starknet-x402" target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white hover:bg-white/5 rounded-md transition">npm</a>
          </div>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 flex gap-12">
        {/* Sidebar */}
        <aside className="hidden lg:block w-48 shrink-0 sticky top-14 h-[calc(100vh-3.5rem)] py-8 overflow-y-auto">
          <nav className="flex flex-col gap-1 text-sm">
            {[
              ['#install', 'Install'],
              ['#server', 'Server Setup'],
              ['#client', 'Client Usage'],
              ['#tokens', 'Tokens & Pricing'],
              ['#paymaster', 'Paymaster'],
              ['#env', 'Environment'],
              ['#protocol', 'Protocol Flow'],
              ['#headers', 'Headers'],
              ['#facilitator', 'Facilitator API'],
              ['#agent', 'AI Agent Prompt'],
            ].map(([href, label]) => (
              <a key={href} href={href} className="text-zinc-500 hover:text-white px-2 py-1 rounded transition">{label}</a>
            ))}
          </nav>
        </aside>

        {/* Content */}
        <main className="flex-1 min-w-0 py-8 pb-24">
          <h1 className="text-3xl font-bold mb-2">Documentation</h1>
          <p className="text-zinc-400 mb-8">Everything you need to integrate paid APIs on Starknet.</p>

          {/* Install */}
          <Section id="install" title="Install">
            <CodeBlock>{code.install}</CodeBlock>
            <p className="text-sm text-zinc-500 mt-3"><code className="text-zinc-400">starknet</code> and <code className="text-zinc-400">axios</code> are included as dependencies. <code className="text-zinc-400">next</code> is a peer dependency (server middleware only).</p>
          </Section>

          {/* Server */}
          <Section id="server" title="Server Setup">
            <p className="text-zinc-400 text-sm mb-6">
              Add the payment middleware to your Next.js app. Any request to a matched route without a valid payment signature gets a <code className="text-zinc-300">402 Payment Required</code> response.
            </p>

            <div className="space-y-6">
              <CodeBlock title="middleware.ts">{code.server}</CodeBlock>
              <CodeBlock title="app/api/weather/route.ts — your API route (unchanged)">{code.route}</CodeBlock>
            </div>

            <div className="mt-6 bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
              <h3 className="text-sm font-medium text-white mb-3">Route config options</h3>
              <table className="w-full text-sm">
                <thead><tr className="text-left text-zinc-500 border-b border-zinc-800">
                  <th className="pb-2 pr-4">Option</th><th className="pb-2 pr-4">Type</th><th className="pb-2">Description</th>
                </tr></thead>
                <tbody className="text-zinc-400">
                  <tr className="border-b border-zinc-800/50"><td className="py-2 pr-4 font-mono text-xs text-zinc-300">price</td><td className="py-2 pr-4">string</td><td className="py-2">Amount in token smallest unit</td></tr>
                  <tr className="border-b border-zinc-800/50"><td className="py-2 pr-4 font-mono text-xs text-zinc-300">tokenAddress</td><td className="py-2 pr-4">string</td><td className="py-2">ERC-20 contract address</td></tr>
                  <tr className="border-b border-zinc-800/50"><td className="py-2 pr-4 font-mono text-xs text-zinc-300">network</td><td className="py-2 pr-4">string</td><td className="py-2">{`'sepolia' | 'mainnet' (default: 'sepolia')`}</td></tr>
                  <tr className="border-b border-zinc-800/50"><td className="py-2 pr-4 font-mono text-xs text-zinc-300">config.description</td><td className="py-2 pr-4">string?</td><td className="py-2">Resource description</td></tr>
                  <tr className="border-b border-zinc-800/50"><td className="py-2 pr-4 font-mono text-xs text-zinc-300">config.mimeType</td><td className="py-2 pr-4">string?</td><td className="py-2">Response MIME type</td></tr>
                  <tr><td className="py-2 pr-4 font-mono text-xs text-zinc-300">config.maxTimeoutSeconds</td><td className="py-2 pr-4">number?</td><td className="py-2">Settlement timeout (default: 300)</td></tr>
                </tbody>
              </table>
            </div>
          </Section>

          {/* Client */}
          <Section id="client" title="Client Usage">
            <p className="text-zinc-400 text-sm mb-6">
              The client handles the full 402 flow automatically — makes the request, receives payment requirements, signs an OutsideExecution via AVNU paymaster, and retries.
            </p>

            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-medium text-white mb-3">x402axios (recommended)</h3>
                <CodeBlock>{code.clientAxios}</CodeBlock>
              </div>

              <div>
                <h3 className="text-sm font-medium text-white mb-3">All HTTP methods</h3>
                <CodeBlock>{code.clientMethods}</CodeBlock>
              </div>

              <div>
                <h3 className="text-sm font-medium text-white mb-3">payAndRequest (native fetch)</h3>
                <CodeBlock>{code.clientFetch}</CodeBlock>
              </div>
            </div>

            <div className="mt-6 bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
              <h3 className="text-sm font-medium text-white mb-3">Client options</h3>
              <table className="w-full text-sm">
                <thead><tr className="text-left text-zinc-500 border-b border-zinc-800">
                  <th className="pb-2 pr-4">Option</th><th className="pb-2 pr-4">Type</th><th className="pb-2">Description</th>
                </tr></thead>
                <tbody className="text-zinc-400">
                  <tr className="border-b border-zinc-800/50"><td className="py-2 pr-4 font-mono text-xs text-zinc-300">account</td><td className="py-2 pr-4">Account</td><td className="py-2">Starknet.js Account (used for signing)</td></tr>
                  <tr className="border-b border-zinc-800/50"><td className="py-2 pr-4 font-mono text-xs text-zinc-300">network</td><td className="py-2 pr-4">string</td><td className="py-2">{`'starknet-sepolia' | 'starknet-mainnet'`}</td></tr>
                  <tr className="border-b border-zinc-800/50"><td className="py-2 pr-4 font-mono text-xs text-zinc-300">paymasterUrl</td><td className="py-2 pr-4">string?</td><td className="py-2">Custom paymaster URL (default: AVNU)</td></tr>
                  <tr><td className="py-2 pr-4 font-mono text-xs text-zinc-300">paymasterApiKey</td><td className="py-2 pr-4">string?</td><td className="py-2">Paymaster API key</td></tr>
                </tbody>
              </table>
            </div>
          </Section>

          {/* Tokens */}
          <Section id="tokens" title="Tokens & Pricing">
            <CodeBlock>{code.tokens}</CodeBlock>

            <div className="mt-6 bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
              <h3 className="text-sm font-medium text-white mb-3">USDC pricing reference (6 decimals)</h3>
              <table className="w-full text-sm">
                <thead><tr className="text-left text-zinc-500 border-b border-zinc-800">
                  <th className="pb-2 pr-4">USDC</th><th className="pb-2">price value</th>
                </tr></thead>
                <tbody className="text-zinc-400 font-mono text-xs">
                  <tr className="border-b border-zinc-800/50"><td className="py-2 pr-4">0.001</td><td className="py-2">{`'1000'`}</td></tr>
                  <tr className="border-b border-zinc-800/50"><td className="py-2 pr-4">0.01</td><td className="py-2">{`'10000'`}</td></tr>
                  <tr className="border-b border-zinc-800/50"><td className="py-2 pr-4">0.10</td><td className="py-2">{`'100000'`}</td></tr>
                  <tr><td className="py-2 pr-4">1.00</td><td className="py-2">{`'1000000'`}</td></tr>
                </tbody>
              </table>
            </div>
          </Section>

          {/* Paymaster */}
          <Section id="paymaster" title="Paymaster">
            <p className="text-zinc-400 text-sm mb-4">
              The SDK uses <a href="https://avnu.fi" target="_blank" rel="noopener noreferrer" className="text-white hover:underline">AVNU paymaster</a> by default. Gas is sponsored — neither the user nor the server pays gas.
            </p>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5 text-sm text-zinc-400 space-y-1 font-mono">
              <div><span className="text-zinc-500">Sepolia:</span> https://sepolia.paymaster.avnu.fi</div>
              <div><span className="text-zinc-500">Mainnet:</span> https://starknet.paymaster.avnu.fi</div>
            </div>
            <div className="mt-4">
              <h3 className="text-sm font-medium text-white mb-3">Custom paymaster</h3>
              <CodeBlock>{code.customPaymaster}</CodeBlock>
            </div>
          </Section>

          {/* Env */}
          <Section id="env" title="Environment Variables">
            <CodeBlock>{code.env}</CodeBlock>
          </Section>

          {/* Protocol */}
          <Section id="protocol" title="Protocol Flow">
            <div className="text-sm text-zinc-400 bg-zinc-950 border border-zinc-800 rounded-xl p-6 overflow-x-auto">
              <pre className="leading-7">
{`Client                          Server                      Facilitator
  |                               |                              |
  |-- GET /api/data ------------->|                              |
  |<-- 402 + PAYMENT-REQUIRED    |                              |
  |                               |                              |
  |-- sign OutsideExecution       |                              |
  |   (SNIP-9, AVNU paymaster)   |                              |
  |                               |                              |
  |-- GET /api/data ------------->|                              |
  |   + PAYMENT-SIGNATURE        |                              |
  |                               |-- POST /verify ------------->|
  |                               |<-- { isValid: true } --------|
  |                               |-- POST /settle ------------->|
  |                               |<-- { success, txHash } ------|
  |                               |                              |
  |<-- 200 + data ----------------|                              |
  |   + PAYMENT-RESPONSE         |                              |`}
              </pre>
            </div>
            <ol className="mt-6 text-sm text-zinc-400 space-y-2 list-decimal list-inside">
              <li>Client requests a protected endpoint</li>
              <li>Server returns <code className="text-zinc-300">402</code> with payment requirements in the <code className="text-zinc-300">PAYMENT-REQUIRED</code> header</li>
              <li>Client signs an OutsideExecution (SNIP-9) containing <code className="text-zinc-300">token.transfer()</code>, built via AVNU paymaster</li>
              <li>Client retries with the <code className="text-zinc-300">PAYMENT-SIGNATURE</code> header</li>
              <li>Server forwards to facilitator for verification and on-chain settlement</li>
              <li>Client receives <code className="text-zinc-300">200</code> + data + <code className="text-zinc-300">PAYMENT-RESPONSE</code> header with tx hash</li>
            </ol>
          </Section>

          {/* Headers */}
          <Section id="headers" title="Headers">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-zinc-500 border-b border-zinc-800">
                  <th className="pb-2 pr-4">Header</th><th className="pb-2 pr-4">Direction</th><th className="pb-2">Description</th>
                </tr></thead>
                <tbody className="text-zinc-400">
                  <tr className="border-b border-zinc-800/50"><td className="py-2 pr-4 font-mono text-xs text-zinc-300">PAYMENT-REQUIRED</td><td className="py-2 pr-4">Server → Client</td><td className="py-2">Base64 payment requirements (on 402)</td></tr>
                  <tr className="border-b border-zinc-800/50"><td className="py-2 pr-4 font-mono text-xs text-zinc-300">PAYMENT-SIGNATURE</td><td className="py-2 pr-4">Client → Server</td><td className="py-2">Base64 signed payment payload</td></tr>
                  <tr><td className="py-2 pr-4 font-mono text-xs text-zinc-300">PAYMENT-RESPONSE</td><td className="py-2 pr-4">Server → Client</td><td className="py-2">Base64 settlement result (tx hash)</td></tr>
                </tbody>
              </table>
            </div>
          </Section>

          {/* Facilitator */}
          <Section id="facilitator" title="Facilitator API">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
              <table className="w-full text-sm">
                <thead><tr className="text-left text-zinc-500 border-b border-zinc-800">
                  <th className="pb-2 pr-4">Endpoint</th><th className="pb-2 pr-4">Method</th><th className="pb-2">Description</th>
                </tr></thead>
                <tbody className="text-zinc-400">
                  <tr className="border-b border-zinc-800/50"><td className="py-2 pr-4 font-mono text-xs text-zinc-300">/verify</td><td className="py-2 pr-4">POST</td><td className="py-2">Validate payment signature against requirements</td></tr>
                  <tr className="border-b border-zinc-800/50"><td className="py-2 pr-4 font-mono text-xs text-zinc-300">/settle</td><td className="py-2 pr-4">POST</td><td className="py-2">Execute payment on-chain via AVNU paymaster</td></tr>
                  <tr><td className="py-2 pr-4 font-mono text-xs text-zinc-300">/supported</td><td className="py-2 pr-4">GET</td><td className="py-2">Returns supported schemes and networks</td></tr>
                </tbody>
              </table>
            </div>
          </Section>

          {/* AI Agent Prompt */}
          <Section id="agent" title="AI Agent Prompt">
            <p className="text-zinc-400 text-sm mb-4">
              Copy this file into your project or feed it to an AI agent to let it integrate starknet-x402 into any app. Available at <a href="/llms.txt" className="text-white hover:underline font-mono text-xs">/llms.txt</a>.
            </p>
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-5">
              <p className="text-sm text-zinc-400">
                The prompt contains the full SDK API surface, code examples for both server and client, token addresses, and integration steps. AI agents can use it to add paid API endpoints to any Next.js app without reading the full docs.
              </p>
            </div>
          </Section>
        </main>
      </div>
    </div>
  );
}
