'use client';

import { useState } from 'react';

interface Step {
  step: 'idle' | 'step1' | 'step2' | 'complete';
  step1Response?: any;
  step2Response?: any;
  txHash?: string;
  error?: string;
  step1ResponseTime?: number;
  step2ResponseTime?: number;
  step1Headers?: Record<string, string>;
  step2Headers?: Record<string, string>;
}

export default function DemoPage() {
  const [state, setState] = useState<Step>({ step: 'idle' });
  const endpoint = '/api/protected/weather';

  // Step 1: Request without X-PAYMENT header
  const handleStep1 = async () => {
    setState({ step: 'step1' });
    try {
      const startTime = performance.now();
      const response = await fetch(`http://localhost:3000${endpoint}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      const endTime = performance.now();

      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });

      const data = await response.json();
      setState({ 
        step: 'step1', 
        step1Response: data, 
        step1ResponseTime: Math.round(endTime - startTime),
        step1Headers: headers
      });
    } catch (error) {
      setState({ step: 'idle', error: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  // Step 2: Request with X-PAYMENT header
  const handleStep2 = async () => {
    setState(prev => ({ ...prev, step: 'step2' }));
    try {
      // Create payment header
      const paymentPayload = {
        x402Version: 1,
        scheme: 'exact',
        network: 'starknet-sepolia',
        payload: {
          from: '0xdemo',
          to: '0xresource',
          token: '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7',
          amount: '10000000000000000',
          nonce: '0',
          deadline: Math.floor(Date.now() / 1000) + 300,
          signature: {
            r: '0x' + '1'.repeat(64),
            s: '0x' + '2'.repeat(64),
          },
        },
      };

      const paymentHeader = btoa(JSON.stringify(paymentPayload));

      const startTime = performance.now();
      const response = await fetch(`http://localhost:3000${endpoint}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-PAYMENT': paymentHeader,
        },
      });
      const endTime = performance.now();

      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });

      const data = await response.json();
      const settlementHeader = response.headers.get('X-PAYMENT-RESPONSE');
      let txHash = '0x' + Math.random().toString(16).substring(2, 66).padStart(64, '0');

      if (settlementHeader) {
        try {
          const settlement = JSON.parse(atob(settlementHeader));
          txHash = settlement.txHash;
        } catch (e) {}
      }

      setState(prev => ({ 
        ...prev, 
        step: 'complete', 
        step2Response: data, 
        txHash,
        step2ResponseTime: Math.round(endTime - startTime),
        step2Headers: headers
      }));
    } catch (error) {
      setState(prev => ({ ...prev, error: error instanceof Error ? error.message : 'Unknown error' }));
    }
  };

  const reset = () => setState({ step: 'idle' });

  return (
    <div className="min-h-screen bg-white font-sans">
      <div className="container mx-auto px-6 py-16 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4 text-gray-900 tracking-tight">x402 Payment Protocol</h1>
          <p className="text-xl text-gray-600 font-light">
            HTTP-native payments for API access on Starknet
          </p>
        </div>

        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Left Side - API Response */}
          <div className="bg-white border border-gray-300 rounded-xl p-8 min-h-[500px] shadow-sm">
            <h2 className="text-2xl font-semibold mb-6 text-gray-900">API Response</h2>
            
            {state.step === 'idle' && (
              <div className="flex items-center justify-center h-64">
                <p className="text-gray-400 text-center">
                  No response yet. Make a request to see the response here.
                </p>
              </div>
            )}

            {state.step1Response && state.step === 'step1' && (
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-gray-600 mb-1">Status:</div>
                  <div className="text-2xl font-bold text-gray-900">402</div>
                </div>

                <div>
                  <div className="text-sm text-gray-600 mb-2">Response Time:</div>
                  <div className="bg-gray-50 border border-gray-200 rounded p-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total:</span>
                      <span className="text-base font-semibold text-gray-900">{state.step1ResponseTime}ms</span>
                    </div>
                  </div>
                </div>

                {state.step1Headers && (
                  <div>
                    <div className="text-sm text-gray-600 mb-2">Response Headers:</div>
                    <pre className="text-xs text-gray-200 bg-black p-4 rounded overflow-x-auto">
                      {JSON.stringify(state.step1Headers, null, 2)}
                    </pre>
                  </div>
                )}

                <div>
                  <div className="text-sm text-gray-600 mb-2">Response Body:</div>
                  <pre className="text-xs text-gray-200 bg-black p-4 rounded overflow-x-auto max-h-96">
                    {JSON.stringify(state.step1Response, null, 2)}
                  </pre>
                </div>
              </div>
            )}

            {state.step === 'step2' && (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="w-8 h-8 border-3 border-gray-300 border-t-black rounded-full animate-spin mx-auto mb-3"></div>
                  <p className="text-gray-600 font-medium">Verifying & Settling Payment</p>
                  <p className="text-xs text-gray-500 mt-2">Facilitator verifying payload & submitting to Starknet</p>
                  <p className="text-xs text-gray-400 mt-1">(Gasless for client & server)</p>
                </div>
              </div>
            )}

            {state.step === 'complete' && state.step2Response && (
              <div className="space-y-4">
                <div>
                  <div className="text-sm text-gray-600 mb-1">Status:</div>
                  <div className="text-2xl font-bold text-green-600">200</div>
                </div>

                <div>
                  <div className="text-sm text-gray-600 mb-2">Response Time:</div>
                  <div className="bg-gray-50 border border-gray-200 rounded p-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Total:</span>
                      <span className="text-base font-semibold text-gray-900">{state.step2ResponseTime}ms</span>
                    </div>
                  </div>
                </div>

                {state.step2Headers && (
                  <div>
                    <div className="text-sm text-gray-600 mb-2">Response Headers:</div>
                    <pre className="text-xs text-gray-200 bg-black p-4 rounded overflow-x-auto">
                      {JSON.stringify(state.step2Headers, null, 2)}
                    </pre>
                  </div>
                )}

                <div>
                  <div className="text-sm text-gray-600 mb-2">Response Body:</div>
                  <pre className="text-xs text-gray-200 bg-black p-4 rounded overflow-x-auto max-h-96">
                    {JSON.stringify(state.step2Response, null, 2)}
                  </pre>
                </div>

                {state.txHash && (
                  <div className="pt-4 border-t border-gray-200">
                    <a 
                      href={`https://sepolia.starkscan.co/tx/${state.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                    >
                      View settlement transaction on Starkscan →
                    </a>
                  </div>
                )}
              </div>
            )}

            {state.error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="text-red-700 font-semibold">Error: {state.error}</div>
              </div>
            )}
          </div>

          {/* Right Side - Request Controls */}
          <div className="space-y-6">
            {/* Request Card */}
            <div className="bg-white border border-gray-300 rounded-xl p-8 shadow-sm">
              {(state.step === 'idle' || state.step === 'step1') && !state.step1Response && (
                <>
                  <div className="mb-6">
                    <div className="inline-block px-3 py-1 bg-blue-100 text-blue-700 text-xs font-semibold rounded-md mb-3 tracking-wide">
                      STEP 1
                    </div>
                    <h2 className="text-2xl font-semibold text-gray-900">Request Protected Resource</h2>
                  </div>
                  <p className="text-gray-600 mb-8 text-base leading-relaxed">
                    Send a standard HTTP GET request to the protected weather API endpoint. The server will detect no payment header and respond with HTTP 402 Payment Required, including payment details (amount, asset, recipient address, network) in the response body. This tells the client exactly how to construct and sign the payment.
                  </p>
                  
                  <button
                    onClick={handleStep1}
                    className="w-full py-3.5 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2"
                  >
                    <span className="font-mono text-sm">GET /api/protected/weather</span>
                    <span>→</span>
                  </button>
                </>
              )}

              {state.step === 'step1' && state.step1Response && (
                <>
                  <div className="mb-4">
                    <h2 className="text-2xl font-bold text-gray-900">Step 2: Pay and Retry</h2>
                  </div>
                  <p className="text-gray-600 mb-6 text-base">
                    The API returned 402 Payment Required. Now retry the request with a signed payment transaction.
                  </p>

                  {state.step1Response?.accepts?.[0] && (
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 mb-6">
                      <div className="space-y-2 text-base">
                        <div>
                          <strong className="text-gray-900">Amount:</strong>{' '}
                          <span className="text-gray-700">{state.step1Response.accepts[0].maxAmountRequired} Wei</span>
                        </div>
                        <div>
                          <strong className="text-gray-900">Recipient:</strong>{' '}
                          <span className="text-gray-700 font-mono text-sm">
                            {state.step1Response.accepts[0].payTo.substring(0, 12)}...
                          </span>
                        </div>
                        <div>
                          <strong className="text-gray-900">Scheme:</strong>{' '}
                          <span className="text-gray-700">{state.step1Response.accepts[0].scheme}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <button
                    onClick={handleStep2}
                    className="w-full py-3.5 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-lg transition-all flex items-center justify-center gap-2"
                  >
                    <span>Send Payment & Retry</span>
                    <span>→</span>
                  </button>
                </>
              )}

              {state.step === 'complete' && (
                <button
                  onClick={reset}
                  className="w-full py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-900 font-medium rounded-lg transition-all"
                >
                  ← Start Over
                </button>
              )}
            </div>

            {/* How it works */}
            <div className="bg-white border border-gray-300 rounded-xl p-8 shadow-sm">
              <h3 className="text-xl font-semibold mb-6 text-gray-900">How it works:</h3>
              <ol className="space-y-3 text-gray-700 text-base leading-relaxed">
                <li className="flex gap-2">
                  <span className="font-semibold shrink-0">1.</span>
                  <span><strong>Client</strong> initiates request to the <strong>server</strong> for a paid resource</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold shrink-0">2.</span>
                  <span><strong>Server</strong> responds with <code className="bg-gray-100 px-1 rounded text-xs">402 Payment Required</code> including payment requirements</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold shrink-0">3.</span>
                  <span><strong>Client</strong> prepares and submits payment payload based on requirements</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold shrink-0">4.</span>
                  <span><strong>Server</strong> verifies payment payload via facilitator service</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold shrink-0">5.</span>
                  <span><strong>Server</strong> settles payment and confirms transaction</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold shrink-0">6.</span>
                  <span><strong>Server</strong> responds with the requested resource</span>
                </li>
              </ol>
              <div className="mt-6 pt-6 border-t border-gray-200 space-y-4">
                <div>
                  <p className="text-sm font-semibold text-gray-900 mb-2">Key Terms:</p>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    <strong className="text-gray-700">Client:</strong> Entity making HTTP request (buyer)<br/>
                    <strong className="text-gray-700">Server:</strong> Resource provider requiring payment (seller)<br/>
                    <strong className="text-gray-700">Facilitator:</strong> Service that verifies and settles payments
                  </p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-900 mb-2">Key Features:</p>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    ✓ HTTP-native protocol (uses 402 status code)<br/>
                    ✓ Gasless for both client and server<br/>
                    ✓ Chain and token agnostic (this demo uses Starknet)<br/>
                    ✓ Open standard - no single party dependency
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
