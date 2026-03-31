/**
 * Transfer call construction for x402 payments.
 *
 * Builds the ERC-20 transfer Call that gets wrapped in an
 * OutsideExecution by the AVNU paymaster.
 */

export function buildTransferCall(
  token: string,
  recipient: string,
  amount: string,
): { contractAddress: string; entrypoint: string; calldata: string[] } {
  return {
    contractAddress: token,
    entrypoint: 'transfer',
    calldata: [
      recipient,  // to
      amount,     // amount low (u256)
      '0',        // amount high (u256)
    ],
  };
}

export const ANY_CALLER = '0x414e595f43414c4c4552';
