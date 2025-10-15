'use client';

import { useState, useEffect } from 'react';
import { Account, RpcProvider, num } from 'starknet';

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
  step1RequestHeaders?: Record<string, string>;
  step2RequestHeaders?: Record<string, string>;
}

// Helper function to format token amounts (STRK has 18 decimals)
function formatTokenAmount(amountWei: string): string {
  try {
    const amount = BigInt(amountWei);
    const divisor = BigInt(10 ** 18); // STRK has 18 decimals
    const wholePart = amount / divisor;
    const fractionalPart = amount % divisor;
    
    if (fractionalPart === 0n) {
      return `${wholePart} STRK`;
    }
    
    const fractionalStr = fractionalPart.toString().padStart(18, '0');
    const trimmed = fractionalStr.replace(/0+$/, '');
    return `${wholePart}.${trimmed} STRK`;
  } catch (e) {
    return `${amountWei} Wei (STRK)`;
  }
}

export default function DemoPage() {
  const [state, setState] = useState<Step>({ step: 'idle' });
  const endpoint = '/api/protected/weather';
  
  // Check environment variables on mount
  const [envCheck, setEnvCheck] = useState<{loaded: boolean, message: string}>({
    loaded: false,
    message: 'Checking...'
  });
  
  useEffect(() => {
    const privateKey = process.env.NEXT_PUBLIC_CLIENT_PRIVATE_KEY;
    const address = process.env.NEXT_PUBLIC_CLIENT_ADDRESS;
    const facilitator = process.env.NEXT_PUBLIC_FACILITATOR_ADDRESS;
    const tokenAddress = process.env.NEXT_PUBLIC_TOKEN_ADDRESS;
    const networkId = process.env.NEXT_PUBLIC_NETWORK_ID;
    const rpcUrl = process.env.NEXT_PUBLIC_STARKNET_NODE_URL;
    
    console.log('🔍 Environment Variables Check:');
    console.log('   NEXT_PUBLIC_CLIENT_PRIVATE_KEY:', privateKey && privateKey !== '' ? `✅ ${privateKey.slice(0, 10)}...` : `❌ ${privateKey}`);
    console.log('   NEXT_PUBLIC_CLIENT_ADDRESS:', address && address !== '' ? `✅ ${address}` : `❌ ${address}`);
    console.log('   NEXT_PUBLIC_FACILITATOR_ADDRESS:', facilitator && facilitator !== '' ? `✅ ${facilitator}` : `❌ ${facilitator}`);
    console.log('   NEXT_PUBLIC_TOKEN_ADDRESS:', tokenAddress && tokenAddress !== '' ? `✅ ${tokenAddress}` : `❌ ${tokenAddress}`);
    console.log('   NEXT_PUBLIC_NETWORK_ID:', networkId && networkId !== '' ? `✅ ${networkId}` : `❌ ${networkId}`);
    console.log('   NEXT_PUBLIC_STARKNET_NODE_URL:', rpcUrl && rpcUrl !== '' ? `✅ ${rpcUrl}` : `❌ ${rpcUrl}`);
    
    // Check for ACTUAL values, not just truthy
    const hasPrivateKey = privateKey && privateKey.length > 0;
    const hasAddress = address && address.length > 0;
    const hasFacilitator = facilitator && facilitator.length > 0;
    
    if (hasPrivateKey && hasAddress && hasFacilitator) {
      setEnvCheck({ 
        loaded: true, 
        message: '✅ Environment variables loaded' 
      });
      console.log('✅ All required environment variables are set!');
    } else {
      setEnvCheck({ 
        loaded: false, 
        message: '❌ Environment variables NOT loaded - Check .env and restart!' 
      });
      console.error('❌ Environment variables MISSING!');
      console.error('   PRIVATE_KEY present:', !!hasPrivateKey);
      console.error('   ADDRESS present:', !!hasAddress);
      console.error('   FACILITATOR present:', !!hasFacilitator);
      console.error('   Fix: Restart server (Ctrl+C → npm run dev) → Hard refresh browser (Ctrl+Shift+R)');
    }
  }, []);

  // Step 1: Request without X-PAYMENT header
  const handleStep1 = async () => {
    setState({ step: 'step1' });
    try {
      const requestHeaders = { 'Content-Type': 'application/json' };
      
      const startTime = performance.now();
      const response = await fetch(`http://localhost:3000${endpoint}`, {
        method: 'GET',
        headers: requestHeaders,
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
        step1Headers: headers,
        step1RequestHeaders: requestHeaders
      });
    } catch (error) {
      setState({ step: 'idle', error: error instanceof Error ? error.message : 'Unknown error' });
    }
  };

  // Step 2: Request with X-PAYMENT header (with proper Starknet signing)
  const handleStep2 = async () => {
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔵 [CLIENT] Step 2: Starting payment process');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // FIRST CHECK: Verify environment variables are loaded
    const clientPrivateKey = process.env.NEXT_PUBLIC_CLIENT_PRIVATE_KEY;
    const clientAddress = process.env.NEXT_PUBLIC_CLIENT_ADDRESS;
    const facilitatorAddress = process.env.NEXT_PUBLIC_FACILITATOR_ADDRESS;
    
    console.log('🔍 [CLIENT] Pre-flight check - Environment variables:');
    console.log('   NEXT_PUBLIC_CLIENT_PRIVATE_KEY:', clientPrivateKey ? '✅ LOADED' : '❌ UNDEFINED');
    console.log('     Value:', clientPrivateKey || 'UNDEFINED');
    console.log('     Type:', typeof clientPrivateKey);
    console.log('     Length:', clientPrivateKey?.length || 0);
    console.log('   NEXT_PUBLIC_CLIENT_ADDRESS:', clientAddress ? '✅ LOADED' : '❌ UNDEFINED');
    console.log('     Value:', clientAddress || 'UNDEFINED');
    console.log('     Type:', typeof clientAddress);
    console.log('     Length:', clientAddress?.length || 0);
    console.log('   NEXT_PUBLIC_FACILITATOR_ADDRESS:', facilitatorAddress ? '✅ LOADED' : '❌ UNDEFINED');
    console.log('     Value:', facilitatorAddress || 'UNDEFINED');
    console.log('     Type:', typeof facilitatorAddress);
    console.log('     Length:', facilitatorAddress?.length || 0);
    
    if (!clientPrivateKey || !clientAddress || !facilitatorAddress) {
      const errorMsg = 
        '❌ CRITICAL ERROR: Environment variables not loaded!\n\n' +
        '🔴 The dev server needs to be RESTARTED.\n\n' +
        'Steps to fix:\n' +
        '1. Stop the dev server (Ctrl+C in terminal)\n' +
        '2. Run: npm run dev\n' +
        '3. Hard refresh browser (Cmd+Shift+R or Ctrl+Shift+R)\n\n' +
        'Missing variables:\n' +
        (!clientPrivateKey ? '  ❌ NEXT_PUBLIC_CLIENT_PRIVATE_KEY\n' : '') +
        (!clientAddress ? '  ❌ NEXT_PUBLIC_CLIENT_ADDRESS\n' : '') +
        (!facilitatorAddress ? '  ❌ NEXT_PUBLIC_FACILITATOR_ADDRESS\n' : '');
      
      console.error('🚨', errorMsg);
      setState(prev => ({ ...prev, error: errorMsg, step: 'idle' }));
      return; // STOP here - don't proceed
    }
    
    setState(prev => ({ ...prev, step: 'step2' }));
    try {
      if (!state.step1Response?.accepts?.[0]) {
        throw new Error('No payment requirements from step 1');
      }

      const requirements = state.step1Response.accepts[0];
      
      console.log('\n📋 [CLIENT] Raw payment requirements received:');
      console.log(JSON.stringify(requirements, null, 2));
      
      // Validate required fields
      if (!requirements.asset && !requirements.token) {
        throw new Error('Missing token address in payment requirements (expected "asset" or "token" field)');
      }
      if (!requirements.maxAmountRequired && !requirements.amount) {
        throw new Error('Missing amount in payment requirements (expected "maxAmountRequired" or "amount" field)');
      }
      if (!requirements.payTo && !requirements.to) {
        throw new Error('Missing recipient in payment requirements (expected "payTo" or "to" field)');
      }
      
      // Support both field names (middleware uses different names)
      const tokenAddress = (requirements.asset || requirements.token).toLowerCase();
      const amount = requirements.maxAmountRequired || requirements.amount;
      const recipient = requirements.payTo || requirements.to;
      
      console.log('\n💰 [CLIENT] Payment Requirements (validated):');
      console.log('   Amount:', formatTokenAmount(amount));
      console.log('   Recipient:', recipient);
      console.log('   Token:', tokenAddress, '(STRK)');

      // Initialize Starknet provider and account
      console.log('\n🔗 [CLIENT] Initializing Starknet provider...');
      const nodeUrl = process.env.NEXT_PUBLIC_STARKNET_NODE_URL || 'https://starknet-sepolia.public.blastapi.io';
      console.log('   Node URL:', nodeUrl);
      
      const provider = new RpcProvider({ nodeUrl });
      console.log('   Provider created:', !!provider);
      
      console.log('\n👤 [CLIENT] Creating account instance from private key...');
      console.log('   Parameters for Account():');
      console.log('     provider:', !!provider);
      console.log('     address:', clientAddress);
      console.log('     address length:', clientAddress?.length);
      console.log('     privateKey:', clientPrivateKey ? `${clientPrivateKey.substring(0, 10)}...` : 'UNDEFINED');
      console.log('     privateKey length:', clientPrivateKey?.length);
      
      // Create account with explicit Cairo 1 / V3 transaction support
      const clientAccount = new Account(provider, clientAddress, clientPrivateKey, '1');
      console.log('   Account created:', !!clientAccount);
      console.log('   Account.address:', clientAccount.address);
      console.log('   Account configured for: Cairo 1 (V3 transactions)');
      
      // Check account balance before proceeding
      console.log('\n💰 [CLIENT] Checking account balance...');
      try {
        const balance = await provider.callContract({
          contractAddress: tokenAddress,
          entrypoint: 'balanceOf',
          calldata: [clientAddress],
        });
        const balanceAmount = num.toBigInt(balance[0]);
        console.log('   STRK Balance:', balanceAmount.toString(), 'Wei', `(${formatTokenAmount(balanceAmount.toString())})`);
        
        if (balanceAmount === 0n) {
          throw new Error(
            '❌ Account has ZERO STRK balance!\n\n' +
            'The account needs STRK tokens to pay for gas fees.\n\n' +
            'Please fund the account:\n' +
            `  Address: ${clientAddress}\n` +
            '  Token: STRK\n' +
            '  Faucet: https://starknet-faucet.vercel.app'
          );
        }
        
        console.log('   ✅ Account has sufficient STRK for gas');
      } catch (balanceError) {
        console.error('   ⚠️  Could not check balance:', balanceError);
        // Continue anyway, the execute call will fail if there's no balance
      }

      // Step 1: Get account nonce for signing
      console.log('\n📋 [CLIENT] Step 1: Getting account nonce...');
      console.log('   Account:', clientAddress);
      
      const accountNonce = await clientAccount.getNonce();
      
      console.log('   Current Nonce:', accountNonce);
      console.log('   ✅ Nonce retrieved!');

      // Step 2: Sign the transfer transaction
        console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✍️  [CLIENT] Step 2: SIGNING TRANSFER TRANSACTION');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('   This is a PRE-SIGNED transaction');
      console.log('   User signs the transaction, facilitator will broadcast it');

      console.log('   Token:', tokenAddress);
      console.log('   Recipient:', recipient);
      console.log('   Amount:', formatTokenAmount(amount));

      // Step 3: Generate nonce for payment
      console.log('\n🎲 [CLIENT] Step 3: Generating unique nonce and deadline...');
      // Generate a random nonce that fits in a Starknet felt (< 252 bits)
      // Use a 31-byte random value to ensure it's always < CURVE.P
      const bytes = new Uint8Array(31); // 31 bytes = 248 bits < 252 bits
      crypto.getRandomValues(bytes);
      const nonce = '0x' + Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
      const deadline = Math.floor(Date.now() / 1000) + 300; // 5 minutes
      
      console.log('   Nonce:', nonce);
      console.log('   Deadline:', deadline, '(', new Date(deadline * 1000).toISOString(), ')');

      // Step 4: Sign the payment message with Starknet typed data
      console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('✍️  [CLIENT] Step 4: PAYMENT SIGNING PREPARATION');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('   This is OFF-CHAIN and GASLESS!');
      
      console.log('\n📊 [CLIENT] VARIABLES CHECK - Before Signing Payment:');
      console.log('   ╔═══════════════════════════════════════════════════════════');
      console.log('   ║ clientAddress:');
      console.log('   ║   Value:', clientAddress);
      console.log('   ║   Type:', typeof clientAddress);
      console.log('   ║   Is Undefined?', clientAddress === undefined);
      console.log('   ╠═══════════════════════════════════════════════════════════');
      console.log('   ║ recipient (from requirements):');
      console.log('   ║   Value:', recipient);
      console.log('   ║   Type:', typeof recipient);
      console.log('   ║   Is Undefined?', recipient === undefined);
      console.log('   ╠═══════════════════════════════════════════════════════════');
      console.log('   ║ tokenAddress:');
      console.log('   ║   Value:', tokenAddress);
      console.log('   ║   Type:', typeof tokenAddress);
      console.log('   ║   Is Undefined?', tokenAddress === undefined);
      console.log('   ╠═══════════════════════════════════════════════════════════');
      console.log('   ║ amount (from requirements):');
      console.log('   ║   Value:', amount);
      console.log('   ║   Type:', typeof amount);
      console.log('   ║   Is Undefined?', amount === undefined);
      console.log('   ╠═══════════════════════════════════════════════════════════');
      console.log('   ║ nonce:');
      console.log('   ║   Value:', nonce);
      console.log('   ║   Type:', typeof nonce);
      console.log('   ║   Is Undefined?', nonce === undefined);
      console.log('   ╠═══════════════════════════════════════════════════════════');
      console.log('   ║ deadline:');
      console.log('   ║   Value:', deadline);
      console.log('   ║   Type:', typeof deadline);
      console.log('   ║   Is Undefined?', deadline === undefined);
      console.log('   ╠═══════════════════════════════════════════════════════════');
      console.log('   ║ clientAccount:');
      console.log('   ║   Exists?', !!clientAccount);
      console.log('   ║   Has signMessage method?', typeof clientAccount?.signMessage === 'function');
      console.log('   ╚═══════════════════════════════════════════════════════════');
      
      // CRITICAL CHECK: Verify ALL required variables for signing
      const missingSignVars: string[] = [];
      if (!clientAddress) missingSignVars.push('clientAddress');
      if (!recipient) missingSignVars.push('recipient');
      if (!tokenAddress) missingSignVars.push('tokenAddress');
      if (!amount) missingSignVars.push('amount');
      if (!nonce) missingSignVars.push('nonce');
      if (!deadline) missingSignVars.push('deadline');
      if (!clientAccount) missingSignVars.push('clientAccount');
      
      if (missingSignVars.length > 0) {
        const errorMsg = 
          '🚨 FATAL ERROR: Cannot proceed with payment signing!\n\n' +
          'Missing/Undefined Variables:\n' +
          missingSignVars.map(v => `  ❌ ${v}`).join('\n') +
          '\n\n' +
          '⚠️  Critical variables are missing!\n' +
          '⚠️  Check environment variables and restart dev server.\n';
        
        console.error('\n' + errorMsg);
        throw new Error(errorMsg);
      }
      
      console.log('\n✅ [CLIENT] All signing variables verified!');
      console.log('   Proceeding with message creation and signing...\n');
      
      const message = {
        types: {
          StarkNetDomain: [
            { name: 'name', type: 'felt' },
            { name: 'version', type: 'felt' },
            { name: 'chainId', type: 'felt' },
          ],
          Payment: [
            { name: 'from', type: 'felt' },
            { name: 'to', type: 'felt' },
            { name: 'token', type: 'felt' },
            { name: 'amount', type: 'felt' },
            { name: 'nonce', type: 'felt' },
            { name: 'deadline', type: 'felt' },
          ],
        },
        primaryType: 'Payment',
        domain: {
          name: 'x402 Payment',
          version: '1',
          chainId: '0x534e5f5345504f4c4941', // SN_SEPOLIA
        },
        message: {
          from: clientAddress.toLowerCase(), // Normalize to lowercase
          to: recipient.toLowerCase(), // Normalize to lowercase
          token: tokenAddress, // Already normalized above
          amount: amount,
          nonce: nonce.toLowerCase(), // Normalize to lowercase
          deadline: deadline.toString(),
        },
      };

      console.log('   Payment Details:');
      console.log('     From:', clientAddress);
      console.log('     To:', recipient);
      console.log('     Token:', tokenAddress, '(STRK)');
      console.log('     Amount:', amount, 'Wei', `(${formatTokenAmount(amount)})`);
      console.log('   📝 [CLIENT] Signing message with Starknet typed data...');
      
      const signature = await clientAccount.signMessage(message);
      
      const sig: any = signature;
      const sigRRaw = Array.isArray(sig) ? sig[0] : (sig.r || sig[0]);
      const sigSRaw = Array.isArray(sig) ? sig[1] : (sig.s || sig[1]);
      
      // Convert BigInt to hex string for JSON serialization
      const sigR = typeof sigRRaw === 'bigint' ? '0x' + sigRRaw.toString(16) : sigRRaw;
      const sigS = typeof sigSRaw === 'bigint' ? '0x' + sigSRaw.toString(16) : sigSRaw;
      
      console.log('   ✅ [CLIENT] Payment signed! (NO GAS COST)');
      console.log('   Signature r:', sigR);
      console.log('   Signature s:', sigS);

      // Step 5: Create payment payload
      console.log('\n📦 [CLIENT] Step 5: Creating X-PAYMENT header...');
          const paymentPayload = {
            x402Version: 1,
            scheme: 'exact',
            network: 'starknet-sepolia',
            payload: {
          from: clientAddress.toLowerCase(), // Normalize to lowercase
          to: recipient.toLowerCase(), // Normalize to lowercase
          token: tokenAddress, // Already normalized above
          amount: amount,
          nonce: nonce.toLowerCase(), // Normalize to lowercase
          deadline: deadline,
              signature: {
            r: sigR,
            s: sigS,
              },
            },
          };

      const paymentHeader = btoa(JSON.stringify(paymentPayload));

      console.log('   Payload created with', Object.keys(paymentPayload.payload).length, 'fields');
      console.log('   Base64 encoded length:', paymentHeader.length, 'characters');

      const requestHeaders = {
            'Content-Type': 'application/json',
        'X-PAYMENT': paymentHeader,
      };

      // Step 6: Send request with payment
      console.log('\n📤 [CLIENT] Step 6: Sending request with X-PAYMENT header...');
      console.log('   Endpoint:', endpoint);
      console.log('   Headers:', Object.keys(requestHeaders).join(', '));
      console.log('   This will trigger:');
      console.log('     1️⃣ [SERVER] Middleware intercepts request');
      console.log('     2️⃣ [SERVER] Middleware calls facilitator /verify');
      console.log('     3️⃣ [FACILITATOR] Verifies signature & checks balance');
      console.log('     4️⃣ [SERVER] Middleware calls facilitator /settle');
      console.log('     5️⃣ [FACILITATOR] Executes transfer_from on-chain');
      console.log('     6️⃣ [SERVER] Returns 200 + weather data');
      
      const startTime = performance.now();
      const response = await fetch(`http://localhost:3000${endpoint}`, {
            method: 'GET',
        headers: requestHeaders,
      });
      const endTime = performance.now();
      
      console.log('\n📥 [CLIENT] Response received!');
      console.log('   Status:', response.status, response.status === 200 ? '✅ SUCCESS' : '❌ FAILED');
      console.log('   Time:', Math.round(endTime - startTime), 'ms');

      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });

      const data: any = await response.json();
      
      // Check if payment failed (402 or other non-200 status)
      if (response.status !== 200) {
        console.error('\n❌ [CLIENT] Payment failed!');
        console.error('   Status:', response.status);
        console.error('   Error:', data.error || 'Unknown error');
        console.error('   Message:', data.message || '');
        
        const errorMsg = `Payment failed (${response.status}): ${data.message || data.error || 'Unknown error'}`;
        setState(prev => ({ 
          ...prev, 
          error: errorMsg,
          step: 'idle',
          step2Response: data,
          step2ResponseTime: Math.round(endTime - startTime),
          step2Headers: headers,
          step2RequestHeaders: requestHeaders
        }));
        return;
      }
      
      // Success - extract transaction hash
      const settlementHeader = response.headers.get('X-PAYMENT-RESPONSE');
      let txHash = '';

            if (settlementHeader) {
              try {
                const settlement = JSON.parse(atob(settlementHeader));
          txHash = settlement.transaction || settlement.txHash || '';
              } catch (e) {
          console.error('Failed to parse settlement header:', e);
        }
      }

      console.log('\n✅ [CLIENT] Payment successful!');
      console.log('   Transaction hash:', txHash);

      setState(prev => ({ 
        ...prev, 
        step: 'complete', 
        step2Response: data, 
              txHash,
        step2ResponseTime: Math.round(endTime - startTime),
        step2Headers: headers,
        step2RequestHeaders: requestHeaders
      }));
    } catch (error) {
      console.error('\n🚨 [CLIENT] ERROR OCCURRED:');
      console.error('   Error type:', error?.constructor?.name);
      console.error('   Error message:', error instanceof Error ? error.message : String(error));
      console.error('   Full error:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Unknown error: ' + String(error);
      setState(prev => ({ 
        ...prev, 
        error: errorMessage,
        step: 'idle' 
      }));
    }
  };

  const reset = () => setState({ step: 'idle' });

  return (
    <div className="min-h-screen bg-white font-sans">
      <div className="container mx-auto px-6 py-16 max-w-7xl">
        {/* Environment Check Warning */}
        {!envCheck.loaded && (
          <div className="mb-8 p-6 bg-red-50 border-2 border-red-400 rounded-xl">
            <div className="flex items-start gap-4">
              <div className="text-3xl">⚠️</div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-red-900 mb-2">
                  {envCheck.message}
                </h3>
                <p className="text-red-800 mb-3">
                  The environment variables required for signing transactions are not loaded. 
                  The demo will not work until you restart the dev server.
                </p>
                <div className="bg-red-100 border border-red-300 rounded p-4 font-mono text-sm text-red-900">
                  <div className="font-bold mb-2">Steps to fix:</div>
                  <div>1. Open terminal where dev server is running</div>
                  <div>2. Press Ctrl+C to stop the server</div>
                  <div>3. Run: <span className="bg-red-200 px-2 py-1 rounded">npm run dev</span></div>
                  <div>4. Hard refresh browser (Cmd+Shift+R or Ctrl+Shift+R)</div>
                </div>
              </div>
            </div>
          </div>
        )}

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
                      href={`https://sepolia.voyager.online/tx/${state.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                    >
                      View settlement transaction on Voyager →
                    </a>
                    </div>
                  )}
                </div>
              )}

            {state.error && (
              <div className="p-6 bg-red-50 border-2 border-red-300 rounded-lg">
                <div className="text-red-800 font-bold text-lg mb-2">⚠️ Error</div>
                <div className="text-red-700 font-mono text-sm">{state.error}</div>
                <button 
                  onClick={reset}
                  className="mt-4 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded transition-all"
                >
                  Reset & Try Again
                </button>
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
                          <span className="text-gray-700 font-semibold">
                            {formatTokenAmount(state.step1Response.accepts[0].maxAmountRequired)}
                          </span>
                          <span className="text-gray-500 text-sm ml-2">
                            ({state.step1Response.accepts[0].maxAmountRequired} Wei)
                          </span>
                        </div>
                        <div>
                          <strong className="text-gray-900">Token:</strong>{' '}
                          <span className="text-gray-700">STRK</span>
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

            {/* Request Headers Card */}
            {(state.step1RequestHeaders || state.step2RequestHeaders) && (
              <div className="bg-white border border-gray-300 rounded-xl p-8 shadow-sm">
                <h3 className="text-xl font-semibold mb-4 text-gray-900">Request Headers</h3>
                
                {state.step === 'step1' && state.step1RequestHeaders && (
                    <div>
                    <div className="text-sm text-gray-600 mb-2">Step 1 - Headers Sent:</div>
                    <pre className="text-xs text-gray-200 bg-black p-4 rounded overflow-x-auto">
                      {JSON.stringify(state.step1RequestHeaders, null, 2)}
                      </pre>
                    </div>
                  )}

                {(state.step === 'step2' || state.step === 'complete') && state.step2RequestHeaders && (
                    <div>
                    <div className="text-sm text-gray-600 mb-2">Step 2 - Headers Sent:</div>
                    <pre className="text-xs text-gray-200 bg-black p-4 rounded overflow-x-auto max-h-96">
                      {JSON.stringify(state.step2RequestHeaders, null, 2)}
                    </pre>
                    {state.step2RequestHeaders['X-PAYMENT'] && (
                      <div className="mt-4">
                        <div className="text-sm text-gray-600 mb-2">X-PAYMENT Payload (decoded):</div>
                        <pre className="text-xs text-gray-200 bg-black p-4 rounded overflow-x-auto max-h-64">
                          {JSON.stringify(JSON.parse(atob(state.step2RequestHeaders['X-PAYMENT'])), null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
            )}

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
