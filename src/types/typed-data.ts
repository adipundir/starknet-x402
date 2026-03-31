/**
 * Transfer call construction for x402 payments.
 *
 * Builds the ERC-20 transfer Call that gets wrapped in an
 * OutsideExecution by the AVNU paymaster.
 */

/**
 * Build an ERC-20 transfer Call for use in OutsideExecution.
 * This is the actual on-chain call the client's account will execute.
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

/** ANY_CALLER constant for OutsideExecution — allows anyone to submit */
export const ANY_CALLER = '0x414e595f43414c4c4552';
