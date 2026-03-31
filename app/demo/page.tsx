'use client';

import { useState, useEffect } from 'react';
import { Account, RpcProvider } from 'starknet';
import Link from 'next/link';

interface State {
  phase: 'idle' | 'requesting' | 'got402' | 'signing' | 'paying' | 'complete';
  paymentRequired?: any;
  weatherData?: any;
  settlement?: { transaction: string; network: string };
  error?: string;
  timing?: { step1: number; step2: number };
}

export default function DemoPage() {
  const [state, setState] = useState<State>({ phase: 'idle' });
  const [envReady, setEnvReady] = useState(true);

  useEffect(() => {
    setEnvReady(!!(
      process.env.NEXT_PUBLIC_CLIENT_PRIVATE_KEY &&
      process.env.NEXT_PUBLIC_CLIENT_ADDRESS &&
      process.env.NEXT_PUBLIC_STARKNET_NODE_URL &&
      process.env.NEXT_PUBLIC_PAYMASTER_URL
    ));
  }, []);

  const handlePayment = async () => {
    setState({ phase: 'requesting' });

    try {
      const t1 = performance.now();
      const res402 = await fetch('/api/protected/weather');
      const step1Time = Math.round(performance.now() - t1);

      if (res402.status !== 402) {
        setState({ phase: 'idle', error: `Expected 402, got ${res402.status}` });
        return;
      }

      const prHeader = res402.headers.get('payment-required');
      const paymentRequired = prHeader
        ? JSON.parse(atob(prHeader))
        : await res402.json();

      setState({ phase: 'got402', paymentRequired, timing: { step1: step1Time, step2: 0 } });
      setState(prev => ({ ...prev, phase: 'signing' }));

      const provider = new RpcProvider({ nodeUrl: process.env.NEXT_PUBLIC_STARKNET_NODE_URL! });
      const account = new Account(
        provider,
        process.env.NEXT_PUBLIC_CLIENT_ADDRESS!,
        process.env.NEXT_PUBLIC_CLIENT_PRIVATE_KEY!,
      );

      const requirements = paymentRequired.accepts[0];
      const { signPayment } = await import('../../lib/x402/client-payment');
      const { paymentHeader } = await signPayment(account, {
        from: account.address,
        to: requirements.payTo,
        token: requirements.asset,
        amount: requirements.amount,
        network: requirements.network,
        paymasterUrl: process.env.NEXT_PUBLIC_PAYMASTER_URL,
        paymasterApiKey: process.env.NEXT_PUBLIC_PAYMASTER_API_KEY,
      });

      setState(prev => ({ ...prev, phase: 'paying' }));

      const t2 = performance.now();
      const paidRes = await fetch('/api/protected/weather', {
        headers: { 'PAYMENT-SIGNATURE': paymentHeader },
      });
      const step2Time = Math.round(performance.now() - t2);

      if (paidRes.status !== 200) {
        const err: any = await paidRes.json();
        setState({ phase: 'idle', error: `${paidRes.status}: ${err.message || err.error}`, paymentRequired });
        return;
      }

      const prResHeader = paidRes.headers.get('payment-response');
      const settlement = prResHeader ? JSON.parse(atob(prResHeader)) : undefined;
      const weatherData = await paidRes.json();

      setState({ phase: 'complete', paymentRequired, weatherData, settlement, timing: { step1: step1Time, step2: step2Time } });
    } catch (error) {
      setState({ phase: 'idle', error: error instanceof Error ? error.message : String(error) });
    }
  };

  const steps = [
    { label: '1. request', desc: 'GET /api/protected/weather', done: state.phase !== 'idle' },
    { label: '2. 402', desc: 'server returns payment requirements', done: ['got402','signing','paying','complete'].includes(state.phase) },
    { label: '3. sign', desc: 'client signs OutsideExecution via AVNU', done: ['paying','complete'].includes(state.phase) },
    { label: '4. settle', desc: 'AVNU executes transfer on-chain', done: state.phase === 'complete' },
  ];

  return (
    <div className="min-h-screen bg-[#09090b] text-white font-sans">
      <nav className="border-b border-white/5">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/" className="font-bold text-lg">starknet x402</Link>
          <span className="text-xs text-zinc-600">live on starknet sepolia</span>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-2xl font-bold mb-2">x402v2 payment demo</h1>
          <p className="text-sm text-zinc-500">
            This demo calls a protected weather API. The middleware returns 402, the client signs a USDC transfer via AVNU paymaster (SNIP-9), and the facilitator settles it on-chain. No approval needed. Gas is sponsored.
          </p>
        </div>

        {!envReady && (
          <div className="mb-8 p-4 border border-red-900/50 bg-red-950/30 rounded-lg text-sm text-red-400">
            Missing env vars. Check .env and restart.
          </div>
        )}

        {/* Progress steps */}
        <div className="grid grid-cols-4 gap-3 mb-8">
          {steps.map(({ label, desc, done }) => (
            <div key={label} className={`p-3 rounded-lg border transition-all ${done ? 'border-zinc-700 bg-zinc-900/50' : 'border-zinc-800/50 bg-transparent'}`}>
              <div className={`text-xs font-bold mb-1 ${done ? 'text-white' : 'text-zinc-700'}`}>{label}</div>
              <div className={`text-[10px] leading-tight ${done ? 'text-zinc-400' : 'text-zinc-700'}`}>{desc}</div>
            </div>
          ))}
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          {/* Response — wider */}
          <div className="lg:col-span-3 border border-zinc-800 rounded-xl p-6 min-h-[350px] bg-zinc-900/30">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs text-zinc-500 uppercase tracking-widest">Response</h2>
              {state.phase !== 'idle' && state.phase !== 'requesting' && (
                <span className={`text-xs px-2 py-0.5 rounded ${state.phase === 'complete' ? 'bg-emerald-950 text-emerald-400' : 'bg-amber-950 text-amber-400'}`}>
                  {state.phase === 'complete' ? '200 OK' : '402'}
                </span>
              )}
            </div>

            {state.phase === 'idle' && !state.error && (
              <div className="flex flex-col items-center justify-center h-48 text-center">
                <p className="text-zinc-600 text-sm mb-1">No request sent yet.</p>
                <p className="text-zinc-700 text-xs">Click "send request" to start the x402v2 payment flow.</p>
              </div>
            )}

            {state.phase === 'requesting' && (
              <div className="flex items-center justify-center h-48">
                <div className="w-5 h-5 border-2 border-zinc-700 border-t-white rounded-full animate-spin"></div>
              </div>
            )}

            {state.phase === 'got402' && (
              <div className="space-y-3">
                <div className="text-xs text-zinc-500">{state.timing?.step1}ms</div>
                <pre className="text-xs text-zinc-400 bg-zinc-950 border border-zinc-800 p-4 rounded-lg overflow-x-auto max-h-52">
                  {JSON.stringify(state.paymentRequired, null, 2)}
                </pre>
              </div>
            )}

            {(state.phase === 'signing' || state.phase === 'paying') && (
              <div className="flex flex-col items-center justify-center h-48 gap-3">
                <div className="w-5 h-5 border-2 border-zinc-700 border-t-white rounded-full animate-spin"></div>
                <p className="text-xs text-zinc-500">
                  {state.phase === 'signing' ? 'signing OutsideExecution via AVNU...' : 'settling on starknet...'}
                </p>
              </div>
            )}

            {state.phase === 'complete' && (
              <div className="space-y-3">
                <div className="text-xs text-zinc-500">{state.timing?.step2}ms total settlement</div>
                {state.settlement && (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-zinc-600">tx:</span>
                    <a
                      href={`https://sepolia.voyager.online/tx/${state.settlement.transaction}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-zinc-400 hover:text-white transition truncate"
                    >
                      {state.settlement.transaction}
                    </a>
                  </div>
                )}
                <pre className="text-xs text-zinc-400 bg-zinc-950 border border-zinc-800 p-4 rounded-lg overflow-x-auto max-h-52">
                  {JSON.stringify(state.weatherData, null, 2)}
                </pre>
              </div>
            )}

            {state.error && (
              <div className="p-4 border border-red-900/50 bg-red-950/30 rounded-lg">
                <p className="text-xs text-red-400">{state.error}</p>
                <button onClick={() => setState({ phase: 'idle' })} className="mt-3 text-xs text-red-500 underline">reset</button>
              </div>
            )}
          </div>

          {/* Controls — narrower */}
          <div className="lg:col-span-2 border border-zinc-800 rounded-xl p-6 bg-zinc-900/30">
            <h2 className="text-xs text-zinc-500 uppercase tracking-widest mb-5">Controls</h2>

            <div className="space-y-4">
              <div>
                <div className="text-xs text-zinc-600 mb-1">endpoint</div>
                <div className="text-sm text-zinc-300 bg-zinc-950 border border-zinc-800 px-3 py-2 rounded-md">
                  GET /api/protected/weather
                </div>
              </div>

              <div>
                <div className="text-xs text-zinc-600 mb-1">network</div>
                <div className="text-sm text-zinc-300 bg-zinc-950 border border-zinc-800 px-3 py-2 rounded-md">
                  starknet-sepolia
                </div>
              </div>

              <div>
                <div className="text-xs text-zinc-600 mb-1">token</div>
                <div className="text-sm text-zinc-300 bg-zinc-950 border border-zinc-800 px-3 py-2 rounded-md">
                  USDC (Circle native)
                </div>
              </div>

              <div>
                <div className="text-xs text-zinc-600 mb-1">settlement</div>
                <div className="text-sm text-zinc-300 bg-zinc-950 border border-zinc-800 px-3 py-2 rounded-md">
                  SNIP-9 via AVNU paymaster
                </div>
              </div>
            </div>

            <div className="mt-6">
              {state.phase === 'complete' ? (
                <button
                  onClick={() => setState({ phase: 'idle' })}
                  className="w-full py-3 bg-zinc-800 hover:bg-zinc-700 text-sm rounded-md transition"
                >
                  reset
                </button>
              ) : (
                <button
                  onClick={handlePayment}
                  disabled={!envReady || !['idle', 'got402'].includes(state.phase)}
                  className="w-full py-3 bg-white text-black hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-600 text-sm rounded-md transition"
                >
                  {state.phase === 'idle' ? 'send request' : state.phase === 'got402' ? 'sign & pay' : 'processing...'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
