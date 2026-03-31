/**
 * In-memory nonce tracker for replay protection.
 *
 * Tracks used nonces to prevent double-spending. In production,
 * replace with Redis or on-chain nonce queries for persistence
 * across restarts and horizontal scaling.
 */

const usedNonces = new Set<string>();

/** Maximum nonces to track before evicting oldest entries. */
const MAX_NONCES = 100_000;

/**
 * Check whether a nonce has already been used.
 * Returns true if the nonce is fresh (not yet used).
 */
export function isNonceFresh(nonce: string): boolean {
  return !usedNonces.has(nonce);
}

/**
 * Mark a nonce as used. Call this after successful settlement.
 */
export function markNonceUsed(nonce: string): void {
  if (usedNonces.size >= MAX_NONCES) {
    // Evict oldest entries (Sets iterate in insertion order)
    const iterator = usedNonces.values();
    for (let i = 0; i < MAX_NONCES / 10; i++) {
      const entry = iterator.next();
      if (entry.done) break;
      usedNonces.delete(entry.value);
    }
  }
  usedNonces.add(nonce);
}

/**
 * Check if nonce is fresh, and if so atomically mark it as used.
 * Returns true if the nonce was fresh and is now reserved.
 */
export function reserveNonce(nonce: string): boolean {
  if (usedNonces.has(nonce)) return false;
  markNonceUsed(nonce);
  return true;
}
