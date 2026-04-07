import { describe, it, expect } from 'vitest';
import { decodeAndValidate } from '../../src/facilitator/verify';
import type { PaymentPayload } from '../../src/types/x402';

function makePayload(overrides?: Partial<PaymentPayload>): PaymentPayload {
  return {
    x402Version: 2,
    accepted: {
      scheme: 'exact',
      network: 'starknet-sepolia',
      amount: '1000',
      payTo: '0xabc',
      asset: '0xtoken',
      maxTimeoutSeconds: 300,
    },
    payload: {
      from: '0xsender',
      to: '0xabc',
      token: '0xtoken',
      amount: '1000',
      outsideExecution: {
        typedData: { some: 'data' },
        signature: ['0xr', '0xs'],
      },
    },
    ...overrides,
  };
}

function encode(obj: unknown): string {
  return Buffer.from(JSON.stringify(obj)).toString('base64');
}

describe('decodeAndValidate', () => {
  it('returns payload for a valid header', () => {
    const header = encode(makePayload());
    const result = decodeAndValidate(header);
    expect('payload' in result).toBe(true);
    if ('payload' in result) {
      expect(result.payload.x402Version).toBe(2);
    }
  });

  it('returns error for garbage input', () => {
    const result = decodeAndValidate('not-valid');
    expect('error' in result).toBe(true);
    if ('error' in result) {
      expect(result.error.isValid).toBe(false);
      expect(result.error.invalidReason).toContain('malformed');
    }
  });

  it('returns error for payload missing required fields', () => {
    const header = encode({ x402Version: 2 }); // missing accepted, payload
    const result = decodeAndValidate(header);
    expect('error' in result).toBe(true);
  });

  it('returns error when signature is too short', () => {
    const p = makePayload();
    p.payload.outsideExecution.signature = ['0xr']; // needs >= 2
    const header = encode(p);
    const result = decodeAndValidate(header);
    expect('error' in result).toBe(true);
  });
});
