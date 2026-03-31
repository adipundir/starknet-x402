'use client';

import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#09090b] text-white font-sans">
      {/* Nav */}
      <nav className="border-b border-white/5">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-bold text-lg">starknet x402</span>
          <div className="flex gap-1">
            <Link href="/demo" className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white hover:bg-white/5 rounded-md transition">Demo</Link>
            <a href="https://github.com/adipundir/starknet-x402" target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white hover:bg-white/5 rounded-md transition">GitHub</a>
            <a href="https://www.npmjs.com/package/@adipundir/starknet-x402" target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 text-xs text-zinc-400 hover:text-white hover:bg-white/5 rounded-md transition">npm</a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="relative max-w-5xl mx-auto px-6 pt-28 pb-24 text-center">
          <p className="text-xs text-zinc-500 mb-4 tracking-widest uppercase">x402 protocol on Starknet</p>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
            Pay for APIs with<br />Circle's USDC on Starknet.
          </h1>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto mb-10 leading-relaxed">
            No unlimited approvals needed. Secure one-time payments with gas sponsorship.
          </p>
          <div className="flex justify-center gap-3">
            <Link href="/demo" className="px-8 py-3 bg-white text-black text-sm rounded-md hover:bg-zinc-200 transition">
              demo
            </Link>
            <a
              href="https://github.com/adipundir/starknet-x402#quick-start"
              target="_blank"
              rel="noopener noreferrer"
              className="px-8 py-3 border border-zinc-700 text-sm rounded-md hover:border-zinc-500 transition"
            >
              docs
            </a>
          </div>
        </div>
      </section>

      {/* Flow diagram */}
      <section className="border-t border-white/5">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <h2 className="text-xs text-zinc-500 uppercase tracking-widest mb-10 text-center">Protocol Flow</h2>
          <div className="text-sm text-zinc-400 bg-zinc-900/50 border border-zinc-800 rounded-xl p-8 overflow-x-auto">
            <pre className="leading-7">
{`  Client                          Server                       Starknet
    |                                |                              |
    |── GET /api/data ──────────────>|                              |
    |                                |                              |
    |<── 402 ────────────────────────|                              |
    |    PAYMENT-REQUIRED: {         |                              |
    |      amount, asset, payTo      |                              |
    |    }                           |                              |
    |                                |                              |
    |── sign OutsideExecution ──────>|  (AVNU paymaster)            |
    |   (SNIP-9, off-chain)          |                              |
    |                                |                              |
    |── GET /api/data ──────────────>|                              |
    |   PAYMENT-SIGNATURE: {...}     |                              |
    |                                |── verify call contents ─────>|
    |                                |── execute_from_outside_v2 ──>|
    |                                |   (AVNU pays gas)            |
    |                                |<── tx confirmed ─────────────|
    |                                |                              |
    |<── 200 + data ─────────────────|                              |
    |    PAYMENT-RESPONSE: {tx}      |                              |`}
            </pre>
          </div>
        </div>
      </section>

      {/* Install */}
      <section className="border-t border-white/5">
        <div className="max-w-5xl mx-auto px-6 py-14 text-center">
          <pre className="inline-block bg-zinc-950 border border-zinc-800 text-zinc-300 px-8 py-4 rounded-xl font-mono text-sm">
            npm install starknet-x402 starknet
          </pre>
        </div>
      </section>

      {/* Code — equal height */}
      <section className="border-t border-white/5 bg-zinc-900/20">
        <div className="max-w-5xl mx-auto px-6 py-20">
          <div className="grid lg:grid-cols-2 gap-8">
            <div className="flex flex-col">
              <h2 className="text-xs text-zinc-500 uppercase tracking-widest mb-4">Server</h2>
              <pre className="flex-1 bg-zinc-950 border border-zinc-800 text-zinc-300 p-5 rounded-xl text-sm overflow-x-auto leading-relaxed">
{`import { paymentMiddleware } from 'starknet-x402';

export const middleware = paymentMiddleware(
  RECIPIENT,
  {
    '/api/data': {
      price: '10000',
      tokenAddress: USDC,
      network: 'sepolia',
    },
  },
  { url: FACILITATOR_URL }
);`}
              </pre>
            </div>
            <div className="flex flex-col">
              <h2 className="text-xs text-zinc-500 uppercase tracking-widest mb-4">Client</h2>
              <pre className="flex-1 bg-zinc-950 border border-zinc-800 text-zinc-300 p-5 rounded-xl text-sm overflow-x-auto leading-relaxed">
{`import { x402axios } from 'starknet-x402';

const result = await x402axios.get(
  'https://api.example.com/data',
  {
    account,
    network: 'starknet-sepolia',
  }
);

// Done! Payment handled
console.log(result.data);`}
              </pre>
            </div>
          </div>
        </div>
      </section>

      {/* Big title */}
      <section className="border-t border-white/5">
        <div className="max-w-5xl mx-auto px-6 py-24 text-center">
          <h2 className="text-6xl md:text-8xl font-bold tracking-tighter text-zinc-800">
            starknet x402
          </h2>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5">
        <div className="max-w-5xl mx-auto px-6 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            {/* Icons */}
            <div className="flex items-center gap-5">
              {/* GitHub */}
              <a href="https://github.com/adipundir/starknet-x402" target="_blank" rel="noopener noreferrer" className="text-zinc-600 hover:text-white transition" title="GitHub">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/></svg>
              </a>
              {/* npm */}
              <a href="https://www.npmjs.com/package/@adipundir/starknet-x402" target="_blank" rel="noopener noreferrer" className="text-zinc-600 hover:text-white transition" title="npm">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M0 7.334v8h6.666v1.332H12v-1.332h12v-8H0zm6.666 6.664H5.334v-4H3.999v4H1.335V8.667h5.331v5.331zm4 0v1.336H8.001V8.667h5.334v5.331h-2.669zm12.001 0h-1.33v-4h-1.336v4h-1.335v-4h-1.33v4h-2.671V8.667h8.002v5.331zM10.665 10H12v2.667h-1.335V10z"/></svg>
              </a>
              {/* X / Twitter — project */}
              <a href="https://x.com/starknetx402" target="_blank" rel="noopener noreferrer" className="text-zinc-600 hover:text-white transition" title="@starknetx402">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
              </a>
              {/* X / Twitter — personal */}
              <a href="https://x.com/adipundir" target="_blank" rel="noopener noreferrer" className="text-zinc-600 hover:text-white transition text-xs" title="@adipundir">
                @adipundir
              </a>
            </div>
            {/* DonaLabs */}
            <a href="https://donalabs.xyz" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-zinc-600 hover:text-white transition">
              <span className="text-xs">a product of</span>
              <img src="/D.svg" alt="DonaLabs" className="w-4 h-4 invert opacity-50" />
              <span className="text-xs">DonaLabs</span>
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
