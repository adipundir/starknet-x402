'use client';

import { useState, useEffect } from 'react';
import { Account, RpcProvider } from 'starknet';

interface DemoState {
  phase: 'idle' | 'requesting' | 'got402' | 'signing' | 'paying' | 'complete';
  paymentRequired?: any;
  weatherData?: any;
  settlement?: { transaction: string; network: string; payer?: string; amount?: string };
  error?: string;
  timing?: { step1: number; step2: number };
}

function formatUSDC(amount: string): string {
  return `$${(Number(amount) / 1e6).toFixed(2)} USDC`;
}

export default function DemoPage() {
  const [state, setState] = useState<DemoState>({ phase: 'idle' });
  const [envReady, setEnvReady] = useState(false);

  useEffect(() => {
    const ready = !!(
      process.env.NEXT_PUBLIC_CLIENT_PRIVATE_KEY &&
      process.env.NEXT_PUBLIC_CLIENT_ADDRESS &&
      process.env.NEXT_PUBLIC_STARKNET_NODE_URL
    );
    setEnvReady(ready);
  }, []);

  const runDemo = async () => {
    setState({ phase: 'requesting' });

    try {
      // Step 1: Request without payment → get 402
      const t1 = performance.now();
      const res402 = await fetch('/api/protected/weather');
      const step1Time = Math.round(performance.now() - t1);

      if (res402.status !== 402) {
        setState({ phase: 'idle', error: `Expected 402, got ${res402.status}` });
        return;
      }

      // Read from PAYMENT-REQUIRED header (v2) or body
      const prHeader = res402.headers.get('payment-required');
      let paymentRequired: any;

      if (prHeader) {
        paymentRequired = JSON.parse(atob(prHeader));
      } else {
        paymentRequired = await res402.json();
      }

      setState({ phase: 'got402', paymentRequired, timing: { step1: step1Time, step2: 0 } });

      // Step 2: Sign payment using our SDK functions
      setState(prev => ({ ...prev, phase: 'signing' }));

      const requirements = paymentRequired.accepts[0];
      const nodeUrl = process.env.NEXT_PUBLIC_STARKNET_NODE_URL!;
      const provider = new RpcProvider({ nodeUrl });
      const account = new Account(
        provider,
        process.env.NEXT_PUBLIC_CLIENT_ADDRESS!,
        process.env.NEXT_PUBLIC_CLIENT_PRIVATE_KEY!,
      );

      // Import and use our SDK's signPayment function
      const { signPayment } = await import('../lib/x402/client-payment');
      const { paymentHeader } = await signPayment(account, {
        from: account.address,
        to: requirements.payTo,
        token: requirements.asset,
        amount: requirements.amount,
        network: requirements.network,
      });

      // Step 3: Retry with PAYMENT-SIGNATURE header
      setState(prev => ({ ...prev, phase: 'paying' }));

      const t2 = performance.now();
      const paidRes = await fetch('/api/protected/weather', {
        headers: { 'PAYMENT-SIGNATURE': paymentHeader },
      });
      const step2Time = Math.round(performance.now() - t2);

      if (paidRes.status !== 200) {
        const err: any = await paidRes.json();
        setState({
          phase: 'idle',
          error: `Payment failed (${paidRes.status}): ${err.message || err.error}`,
          paymentRequired,
        });
        return;
      }

      // Read settlement from PAYMENT-RESPONSE header
      const prResHeader = paidRes.headers.get('payment-response');
      let settlement: DemoState['settlement'];
      if (prResHeader) {
        settlement = JSON.parse(atob(prResHeader));
      }

      const weatherData = await paidRes.json();

      setState({
        phase: 'complete',
        paymentRequired,
        weatherData,
        settlement,
        timing: { step1: step1Time, step2: step2Time },
      });
    } catch (error) {
      setState({ phase: 'idle', error: error instanceof Error ? error.message : String(error) });
    }
  };

  const reset = () => setState({ phase: 'idle' });

  return (
    <div className="min-h-screen bg-white font-sans">
      <div className="container mx-auto px-6 py-16 max-w-7xl">

        {!envReady && (
          <div className="mb-8 p-6 bg-red-50 border-2 border-red-400 rounded-xl">
            <h3 className="text-xl font-bold text-red-900 mb-2">Environment variables not loaded</h3>
            <p className="text-red-800">Check .env and restart the dev server.</p>
          </div>
        )}

        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4 text-gray-900 tracking-tight">x402 Payment Protocol</h1>
          <p className="text-xl text-gray-600 font-light">
            HTTP-native payments for API access on Starknet (v2)
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left: Response */}
          <div className="bg-white border border-gray-300 rounded-xl p-8 min-h-[500px] shadow-sm">
            <h2 className="text-2xl font-semibold mb-6 text-gray-900">Response</h2>

            {state.phase === 'idle' && !state.error && (
              <div className="flex items-center justify-center h-64">
                <p className="text-gray-400 text-center">Click "Request Weather API" to start the demo.</p>
              </div>
            )}

            {state.phase === 'requesting' && (
              <div className="flex items-center justify-center h-64">
                <p className="text-gray-500">Requesting...</p>
              </div>
            )}

            {state.phase === 'got402' && state.paymentRequired && (
              <div className="space-y-4">
                <div className="text-2xl font-bold text-orange-600">402 Payment Required</div>
                <div className="text-sm text-gray-600">
                  Time: {state.timing?.step1}ms
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-2">
                  <div><strong>Amount:</strong> {formatUSDC(state.paymentRequired.accepts[0].amount)}</div>
                  <div><strong>Token:</strong> <span className="font-mono text-sm">{state.paymentRequired.accepts[0].asset.slice(0, 12)}...</span></div>
                  <div><strong>Recipient:</strong> <span className="font-mono text-sm">{state.paymentRequired.accepts[0].payTo.slice(0, 12)}...</span></div>
                  <div><strong>Network:</strong> {state.paymentRequired.accepts[0].network}</div>
                  {state.paymentRequired.accepts[0].extra?.sponsored && (
                    <div className="text-green-700 font-semibold">Gas Sponsored</div>
                  )}
                </div>
                <div>
                  <div className="text-sm text-gray-600 mb-2">PAYMENT-REQUIRED header:</div>
                  <pre className="text-xs text-gray-200 bg-black p-4 rounded overflow-x-auto max-h-48">
                    {JSON.stringify(state.paymentRequired, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {(state.phase === 'signing' || state.phase === 'paying') && (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="w-8 h-8 border-3 border-gray-300 border-t-black rounded-full animate-spin mx-auto mb-3"></div>
                  <p className="text-gray-600 font-medium">
                    {state.phase === 'signing' ? 'Signing payment...' : 'Verifying & settling on-chain...'}
                  </p>
                </div>
              </div>
            )}

            {state.phase === 'complete' && state.weatherData && (
              <div className="space-y-4">
                <div className="text-2xl font-bold text-green-600">200 OK</div>
                <div className="text-sm text-gray-600">
                  Payment: {state.timing?.step2}ms
                </div>

                {state.settlement && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 space-y-1">
                    <div className="text-sm font-semibold text-green-800">Settlement</div>
                    <div className="text-xs font-mono text-green-700">
                      tx: {state.settlement.transaction?.slice(0, 20)}...
                    </div>
                    <a
                      href={`https://sepolia.voyager.online/tx/${state.settlement.transaction}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      View on Voyager
                    </a>
                  </div>
                )}

                <div>
                  <div className="text-sm text-gray-600 mb-2">Weather Data:</div>
                  <pre className="text-xs text-gray-200 bg-black p-4 rounded overflow-x-auto max-h-64">
                    {JSON.stringify(state.weatherData, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {state.error && (
              <div className="p-6 bg-red-50 border-2 border-red-300 rounded-lg">
                <div className="text-red-800 font-bold mb-2">Error</div>
                <div className="text-red-700 font-mono text-sm">{state.error}</div>
                <button onClick={reset} className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded">
                  Reset
                </button>
              </div>
            )}
          </div>

          {/* Right: Controls */}
          <div className="space-y-6">
            <div className="bg-white border border-gray-300 rounded-xl p-8 shadow-sm">
              {state.phase === 'idle' && (
                <>
                  <div className="mb-6">
                    <div className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-md mb-3">
                      x402 v2
                    </div>
                    <h2 className="text-2xl font-semibold text-gray-900">Request Protected Resource</h2>
                  </div>
                  <p className="text-gray-600 mb-8 leading-relaxed">
                    Send a request to the weather API. The middleware returns <strong>402</strong> with
                    payment requirements in the <code className="bg-gray-100 px-1 rounded text-xs">PAYMENT-REQUIRED</code> header.
                    The client signs a payment using <code className="bg-gray-100 px-1 rounded text-xs">signPayment()</code> from the SDK
                    and retries with the <code className="bg-gray-100 px-1 rounded text-xs">PAYMENT-SIGNATURE</code> header.
                  </p>
                  <button
                    onClick={runDemo}
                    disabled={!envReady}
                    className="w-full py-3.5 bg-gray-900 hover:bg-gray-800 disabled:bg-gray-300 text-white font-medium rounded-lg transition-all"
                  >
                    Request Weather API
                  </button>
                </>
              )}

              {state.phase === 'got402' && (
                <>
                  <div className="mb-4">
                    <h2 className="text-2xl font-bold text-gray-900">Sign & Pay</h2>
                  </div>
                  <p className="text-gray-600 mb-6">
                    Got 402. Click to sign the payment and retry.
                  </p>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6">
                    <div className="text-lg font-semibold text-gray-900">
                      {formatUSDC(state.paymentRequired.accepts[0].amount)}
                    </div>
                    <div className="text-sm text-gray-500">
                      {state.paymentRequired.accepts[0].scheme} scheme on {state.paymentRequired.accepts[0].network}
                    </div>
                  </div>
                  <button
                    onClick={runDemo}
                    className="w-full py-3.5 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-lg transition-all"
                  >
                    Sign Payment & Retry
                  </button>
                </>
              )}

              {state.phase === 'complete' && (
                <button
                  onClick={reset}
                  className="w-full py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium rounded-lg transition-all"
                >
                  Start Over
                </button>
              )}
            </div>

            {/* How it works */}
            <div className="bg-white border border-gray-300 rounded-xl p-8 shadow-sm">
              <h3 className="text-xl font-semibold mb-6 text-gray-900">x402 v2 Flow</h3>
              <ol className="space-y-3 text-gray-700 text-sm leading-relaxed">
                <li className="flex gap-2">
                  <span className="font-semibold shrink-0">1.</span>
                  <span>Client sends <code className="bg-gray-100 px-1 rounded text-xs">GET /api/protected/weather</code></span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold shrink-0">2.</span>
                  <span>Middleware returns <strong>402</strong> with <code className="bg-gray-100 px-1 rounded text-xs">PAYMENT-REQUIRED</code> header</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold shrink-0">3.</span>
                  <span>Client signs payment off-chain using <code className="bg-gray-100 px-1 rounded text-xs">signPayment()</code></span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold shrink-0">4.</span>
                  <span>Client retries with <code className="bg-gray-100 px-1 rounded text-xs">PAYMENT-SIGNATURE</code> header</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold shrink-0">5.</span>
                  <span>Middleware calls facilitator to verify signature + settle on-chain</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold shrink-0">6.</span>
                  <span>Client receives <strong>200</strong> + data + <code className="bg-gray-100 px-1 rounded text-xs">PAYMENT-RESPONSE</code> header with tx hash</span>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
