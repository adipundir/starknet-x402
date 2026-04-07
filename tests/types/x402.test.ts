import { describe, it, expect } from 'vitest';
import {
  X402_VERSION,
  PAYMENT_SIGNATURE_HEADER,
  PAYMENT_RESPONSE_HEADER,
  PAYMENT_REQUIRED_HEADER,
  SCHEMES,
  NETWORKS,
  TOKENS,
  decodePaymentHeader,
  validatePaymentPayload,
  encodeSettlementResponseHeader,
  buildSettleResponse,
  getPaymentHeader,
  isValidStarknetAddress,
  parseU256,
  getRequiredAmount,
  type PaymentPayload,
  type PaymentRequirements,
} from '../../src/types/x402';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe('constants', () => {
  it('X402_VERSION is 2', () => {
    expect(X402_VERSION).toBe(2);
  });

  it('header names are uppercase', () => {
    expect(PAYMENT_SIGNATURE_HEADER).toBe('PAYMENT-SIGNATURE');
    expect(PAYMENT_RESPONSE_HEADER).toBe('PAYMENT-RESPONSE');
    expect(PAYMENT_REQUIRED_HEADER).toBe('PAYMENT-REQUIRED');
  });

  it('SCHEMES has exact', () => {
    expect(SCHEMES.EXACT).toBe('exact');
  });

  it('NETWORKS has sepolia and mainnet', () => {
    expect(NETWORKS.STARKNET_SEPOLIA).toBe('starknet-sepolia');
    expect(NETWORKS.STARKNET_MAINNET).toBe('starknet-mainnet');
  });

  it('TOKENS are valid hex addresses', () => {
    for (const addr of Object.values(TOKENS)) {
      expect(addr).toMatch(/^0x[0-9a-fA-F]+$/);
    }
  });
});

// ---------------------------------------------------------------------------
// decodePaymentHeader / validatePaymentPayload
// ---------------------------------------------------------------------------

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

describe('decodePaymentHeader', () => {
  it('decodes a valid base64-encoded JSON payload', () => {
    const payload = makePayload();
    const header = encode(payload);
    expect(decodePaymentHeader(header)).toEqual(payload);
  });

  it('returns null for invalid base64', () => {
    expect(decodePaymentHeader('not-valid-base64!!!')).toBeNull();
  });

  it('returns null for valid base64 but invalid JSON', () => {
    const header = Buffer.from('not json').toString('base64');
    expect(decodePaymentHeader(header)).toBeNull();
  });
});

describe('validatePaymentPayload', () => {
  it('returns true for a valid payload', () => {
    expect(validatePaymentPayload(makePayload())).toBe(true);
  });

  it('returns false for null', () => {
    expect(validatePaymentPayload(null)).toBe(false);
  });

  it('returns false if x402Version is missing', () => {
    expect(validatePaymentPayload(makePayload({ x402Version: 0 }))).toBe(false);
  });

  it('returns false if accepted.scheme is missing', () => {
    const p = makePayload();
    p.accepted.scheme = '';
    expect(validatePaymentPayload(p)).toBe(false);
  });

  it('returns false if payload.from is missing', () => {
    const p = makePayload();
    p.payload.from = '';
    expect(validatePaymentPayload(p)).toBe(false);
  });

  it('returns false if signature has fewer than 2 elements', () => {
    const p = makePayload();
    p.payload.outsideExecution.signature = ['0xr'];
    expect(validatePaymentPayload(p)).toBe(false);
  });

  it('returns false if outsideExecution.typedData is missing', () => {
    const p = makePayload();
    p.payload.outsideExecution.typedData = null;
    expect(validatePaymentPayload(p)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// encodeSettlementResponseHeader
// ---------------------------------------------------------------------------

describe('encodeSettlementResponseHeader', () => {
  it('round-trips through base64', () => {
    const encoded = encodeSettlementResponseHeader('0xhash', 'starknet-sepolia', '0xpayer', '1000');
    const decoded = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
    expect(decoded).toEqual({
      transaction: '0xhash',
      network: 'starknet-sepolia',
      payer: '0xpayer',
      amount: '1000',
    });
  });

  it('works without optional fields', () => {
    const encoded = encodeSettlementResponseHeader('0xhash', 'starknet-sepolia');
    const decoded = JSON.parse(Buffer.from(encoded, 'base64').toString('utf8'));
    expect(decoded.transaction).toBe('0xhash');
    expect(decoded.payer).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// buildSettleResponse
// ---------------------------------------------------------------------------

describe('buildSettleResponse', () => {
  it('builds a success response', () => {
    const res = buildSettleResponse({
      success: true,
      transaction: '0xhash',
      network: 'starknet-sepolia',
      payer: '0xpayer',
      amount: '1000',
    });
    expect(res.success).toBe(true);
    expect(res.transaction).toBe('0xhash');
    expect(res.errorReason).toBeNull();
  });

  it('builds a failure response with defaults', () => {
    const res = buildSettleResponse({ success: false, errorReason: 'oops' });
    expect(res.success).toBe(false);
    expect(res.transaction).toBeNull();
    expect(res.network).toBeNull();
    expect(res.errorReason).toBe('oops');
  });
});

// ---------------------------------------------------------------------------
// getPaymentHeader
// ---------------------------------------------------------------------------

describe('getPaymentHeader', () => {
  it('reads the PAYMENT-SIGNATURE header', () => {
    const headers = new Headers({ 'PAYMENT-SIGNATURE': 'abc' });
    expect(getPaymentHeader(headers)).toBe('abc');
  });

  it('returns null when header is absent', () => {
    const headers = new Headers();
    expect(getPaymentHeader(headers)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// isValidStarknetAddress
// ---------------------------------------------------------------------------

describe('isValidStarknetAddress', () => {
  it('accepts a valid hex address', () => {
    expect(isValidStarknetAddress('0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7')).toBe(true);
  });

  it('accepts address without 0x prefix', () => {
    expect(isValidStarknetAddress('abc123')).toBe(true);
  });

  it('rejects empty string', () => {
    expect(isValidStarknetAddress('')).toBe(false);
  });

  it('rejects non-hex characters', () => {
    expect(isValidStarknetAddress('0xGHIJKL')).toBe(false);
  });

  it('rejects address longer than 64 hex chars', () => {
    expect(isValidStarknetAddress('0x' + 'a'.repeat(65))).toBe(false);
  });

  it('rejects null/undefined', () => {
    expect(isValidStarknetAddress(null as any)).toBe(false);
    expect(isValidStarknetAddress(undefined as any)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// parseU256
// ---------------------------------------------------------------------------

describe('parseU256', () => {
  it('parses low + high into a single bigint', () => {
    // low = 100, high = 0 → 100
    expect(parseU256(['100', '0'])).toBe(100n);
  });

  it('handles high bits', () => {
    // low = 0, high = 1 → 2^128
    expect(parseU256(['0', '1'])).toBe(1n << 128n);
  });

  it('combines low and high', () => {
    expect(parseU256(['5', '2'])).toBe(5n + (2n << 128n));
  });

  it('returns 0n for empty/missing input', () => {
    expect(parseU256([])).toBe(0n);
    expect(parseU256(null as any)).toBe(0n);
  });
});

// ---------------------------------------------------------------------------
// getRequiredAmount
// ---------------------------------------------------------------------------

describe('getRequiredAmount', () => {
  it('converts amount string to bigint', () => {
    const req: PaymentRequirements = {
      scheme: 'exact',
      network: 'starknet-sepolia',
      amount: '5000000',
      payTo: '0xabc',
      asset: '0xtoken',
      maxTimeoutSeconds: 300,
    };
    expect(getRequiredAmount(req)).toBe(5000000n);
  });
});
