/**
 * Nonce tracking for SNIP-9 Outside Execution.
 *
 * With SNIP-9, nonce uniqueness is enforced on-chain by the account contract.
 * The paymaster generates nonces during buildTransaction().
 * This module is retained for optional server-side duplicate request detection.
 */

const processedPayloads = new Set<string>();
const MAX_SIZE = 100_000;

/**
 * Check if a payment payload hash has already been processed.
 * Returns true if this is a new (unprocessed) payload.
 */
export function isNewPayload(payloadHash: string): boolean {
  return !processedPayloads.has(payloadHash);
}

/**
 * Mark a payload hash as processed.
 */
export function markProcessed(payloadHash: string): void {
  if (processedPayloads.size >= MAX_SIZE) {
    const iterator = processedPayloads.values();
    for (let i = 0; i < MAX_SIZE / 10; i++) {
      const entry = iterator.next();
      if (entry.done) break;
      processedPayloads.delete(entry.value);
    }
  }
  processedPayloads.add(payloadHash);
}
