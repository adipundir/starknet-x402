import { describe, it, expect } from 'vitest';
import { buildTransferCall, ANY_CALLER } from '../../src/types/typed-data';

describe('buildTransferCall', () => {
  it('builds a correct ERC-20 transfer call', () => {
    const call = buildTransferCall('0xtoken', '0xrecipient', '1000');
    expect(call).toEqual({
      contractAddress: '0xtoken',
      entrypoint: 'transfer',
      calldata: ['0xrecipient', '1000', '0'],
    });
  });

  it('sets amount_high to 0', () => {
    const call = buildTransferCall('0xtoken', '0xrecipient', '999999999');
    expect(call.calldata[2]).toBe('0');
  });

  it('preserves exact address values', () => {
    const token = '0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7';
    const recipient = '0x0512feAc6339Ff7889822cb5aA2a86C848e9D392bB0E3E237C008674feeD8343';
    const call = buildTransferCall(token, recipient, '500');
    expect(call.contractAddress).toBe(token);
    expect(call.calldata[0]).toBe(recipient);
  });
});

describe('ANY_CALLER', () => {
  it('is the felt encoding of ANY_CALLER', () => {
    expect(ANY_CALLER).toBe('0x414e595f43414c4c4552');
  });
});
