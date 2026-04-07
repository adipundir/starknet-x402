# Scheme: `exact` on `Starknet`

## Summary

The `exact` scheme on Starknet transfers a specific amount of a token (such as USDC) from the payer to the resource server using SNIP-9 Outside Execution. Instead of requiring ERC-20 approvals, the payer signs a typed-data message (SNIP-12) that authorizes the facilitator to execute a `transfer` call from the payer's account. The signed OutsideExecution contains the exact transfer calldata — the facilitator cannot alter the recipient, amount, or token. Nonce uniqueness is enforced on-chain by the account contract.

**Version Support:** This specification supports x402 v2 protocol only.

## Protocol Sequencing

The protocol flow for `exact` on Starknet is client-driven. When the facilitator supports sponsorship, it uses the AVNU paymaster to submit the transaction with sponsored gas — neither the client nor the resource server pays gas fees.

1. Client makes a request to a `resource server` and receives a `402 Payment Required` response. The response includes a `PAYMENT-REQUIRED` header containing base64-encoded `PaymentRequiredResponse` with one or more `PaymentRequirements`.
2. Client constructs a `transfer(recipient, amount)` call targeting the token contract.
3. Client sends the transfer call to the AVNU paymaster, which wraps it in a SNIP-9 `OutsideExecution` and returns typed data (SNIP-12) for signing.
4. Client signs the typed data using their Starknet account (`account.signMessage`), producing a signature `[r, s]`.
5. Client packages the signed OutsideExecution into a `PaymentPayload`, base64-encodes it, and resends the request to the `resource server` with the `PAYMENT-SIGNATURE` header.
6. `resource server` passes the payment payload to the `facilitator` for verification (`/verify`).
7. `facilitator` validates the transaction structure, signature (on-chain via `is_valid_signature`), balance, and payment details.
8. `resource server` does the work to fulfill the request.
9. `resource server` requests settlement from the `facilitator` (`/settle`).
10. `facilitator` submits the OutsideExecution to the AVNU paymaster, which calls `execute_from_outside_v2` on the client's account contract. Gas is sponsored by the paymaster.
11. `facilitator` waits for on-chain confirmation (`ACCEPTED_ON_L2` or `ACCEPTED_ON_L1`) and reports the transaction hash back to the `resource server`.
12. `resource server` returns the response to the client with the `PAYMENT-RESPONSE` header containing the settlement result.

**Security Note:** The signed OutsideExecution contains the exact `transfer` calldata. The facilitator cannot change the amount, recipient, or token — any modification would invalidate the client's signature. The AVNU paymaster only sponsors gas; it has no ability to alter the transaction payload. Nonce uniqueness is enforced on-chain by the account contract, preventing replay attacks.

## Network Format

Network identifiers use the following format:

- **Mainnet:** `starknet-mainnet`
- **Testnet:** `starknet-sepolia`

## `PaymentRequirements` for `exact`

In addition to the standard x402 `PaymentRequirements` fields, the `exact` scheme on Starknet uses the following:

```json
{
  "scheme": "exact",
  "network": "starknet-sepolia",
  "amount": "10000",
  "asset": "0x0512feAc6339Ff7889822cb5aA2a86C848e9D392bB0E3E237C008674feeD8343",
  "payTo": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  "maxTimeoutSeconds": 300,
  "extra": {}
}
```

### Field Descriptions

- `scheme`: Always `"exact"` for this scheme.
- `network`: Network identifier — `starknet-mainnet` or `starknet-sepolia`.
- `amount`: The exact amount to transfer in the token's smallest unit (e.g., `"10000"` = 0.01 USDC, since USDC has 6 decimals). Represented as a string.
- `asset`: The Starknet contract address of the token (hex string with `0x` prefix, up to 64 hex characters).
- `payTo`: The recipient's Starknet address (hex string with `0x` prefix).
- `maxTimeoutSeconds`: Maximum time in seconds before the payment expires. Default is `300` (5 minutes).
- `extra`: Optional object for protocol extensions. Currently unused but reserved for future use.

### Supported Tokens

| Token | Network | Contract Address |
|-------|---------|-----------------|
| USDC | Sepolia | `0x0512feAc6339Ff7889822cb5aA2a86C848e9D392bB0E3E237C008674feeD8343` |
| USDC | Mainnet | `0x033068F6539f8e6e6b131e6B2B814e6c34A5224bC66947c47DaB9dFeE93b35fb` |
| STRK | Sepolia | `0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d` |
| ETH | Both | `0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7` |

## PaymentPayload `payload` Field

The `payload` field of the `PaymentPayload` is a `StarknetExactPayload` containing the signed OutsideExecution:

```json
{
  "from": "0xabc123...",
  "to": "0xdef456...",
  "amount": "10000",
  "token": "0x0512feAc6339Ff7889822cb5aA2a86C848e9D392bB0E3E237C008674feeD8343",
  "outsideExecution": {
    "typedData": { ... },
    "signature": ["0x1a2b3c...", "0x4d5e6f..."]
  }
}
```

### Payload Field Descriptions

- `from`: The payer's Starknet account address.
- `to`: The recipient's Starknet address (must match `payTo` in requirements).
- `amount`: The transfer amount as a string (must be >= `amount` in requirements).
- `token`: The token contract address (must match `asset` in requirements).
- `outsideExecution.typedData`: The SNIP-9 OutsideExecution typed data object returned by the AVNU paymaster. Contains the full OutsideExecution struct including the transfer call, nonce, caller, and execution time bounds.
- `outsideExecution.signature`: The client's signature over the typed data, as an array of two hex strings `[r, s]`.

### Full `PaymentPayload` Object

```json
{
  "x402Version": 2,
  "resource": {
    "url": "https://example.com/api/weather",
    "description": "Access to weather data",
    "mimeType": "application/json"
  },
  "accepted": {
    "scheme": "exact",
    "network": "starknet-sepolia",
    "amount": "10000",
    "asset": "0x0512feAc6339Ff7889822cb5aA2a86C848e9D392bB0E3E237C008674feeD8343",
    "payTo": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    "maxTimeoutSeconds": 300,
    "extra": {}
  },
  "payload": {
    "from": "0xabc123...",
    "to": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
    "amount": "10000",
    "token": "0x0512feAc6339Ff7889822cb5aA2a86C848e9D392bB0E3E237C008674feeD8343",
    "outsideExecution": {
      "typedData": { "...SNIP-9 typed data..." },
      "signature": ["0x1a2b3c...", "0x4d5e6f..."]
    }
  }
}
```

### Header Encoding

The `PaymentPayload` is JSON-serialized and base64-encoded before being placed in the `PAYMENT-SIGNATURE` header.

## `PaymentRequiredResponse`

When a resource server returns HTTP 402, the `PAYMENT-REQUIRED` header contains a base64-encoded JSON object:

```json
{
  "x402Version": 2,
  "accepts": [
    {
      "scheme": "exact",
      "network": "starknet-sepolia",
      "amount": "10000",
      "asset": "0x0512feAc6339Ff7889822cb5aA2a86C848e9D392bB0E3E237C008674feeD8343",
      "payTo": "0x1234...",
      "maxTimeoutSeconds": 300,
      "extra": {}
    }
  ],
  "resource": {
    "url": "https://example.com/api/weather",
    "description": "Access to weather data",
    "mimeType": "application/json"
  },
  "error": null,
  "extensions": {}
}
```

### Field Descriptions

- `x402Version`: Protocol version. Always `2`.
- `accepts`: Array of `PaymentRequirements` objects the server will accept. A client may choose any one to fulfill.
- `resource`: Metadata about the protected resource.
- `error`: Optional error message string.
- `extensions`: Optional object for protocol extensions.

## Verification

Steps to verify a payment for the `exact` scheme on Starknet:

1. **Parse payload**: Decode the base64 `PAYMENT-SIGNATURE` header and deserialize the JSON `PaymentPayload`.
2. **Version check**: Verify `x402Version` is `2`.
3. **Scheme & network match**: Verify `payload.accepted.scheme` and `payload.accepted.network` match the expected `PaymentRequirements`.
4. **Address normalization**: Normalize all addresses to lowercase hex for comparison.
5. **Recipient match**: Verify `payload.to` matches `requirements.payTo`.
6. **Token match**: Verify `payload.token` matches `requirements.asset`.
7. **Amount check**: Verify `payload.amount >= requirements.amount` (as BigInt comparison).
8. **OutsideExecution present**: Verify `outsideExecution.typedData` and `outsideExecution.signature` (array of 2 hex strings) are present.
9. **Single call enforcement**: Verify the OutsideExecution's `message.Calls` array contains exactly one call. This prevents payment smuggling — the signed message must authorize only the intended transfer.
10. **Call target**: Verify `Calls[0].To` equals the token contract address.
11. **Call selector**: Verify `Calls[0].Selector` equals the `transfer` selector (`starknet.hash.getSelectorFromName('transfer')`).
12. **Call data**: Verify `Calls[0].Calldata` matches `[recipient, amount_low, amount_high]` where `amount_low` is the lower 128 bits and `amount_high` is `'0'` for typical amounts.
13. **Deadline check**: Verify the `Execute Before` timestamp in the OutsideExecution has not expired. A buffer should be considered for network propagation.
14. **Signature verification**: Call `is_valid_signature` on the payer's account contract with the typed data hash and signature. The call must return `0x56414c4944` (felt encoding of `"VALID"`).
15. **Balance check**: Call `balanceOf` on the token contract for the payer's address. Parse the U256 result (`low + (high << 128)`) and verify it is >= the required amount.

## Settlement

Settlement is performed by submitting the OutsideExecution via the AVNU paymaster:

1. Facilitator receives the client-signed OutsideExecution (from the decoded `PaymentPayload`).
2. Facilitator creates a paymaster RPC client with the AVNU paymaster URL and API key.
3. Facilitator calls `paymaster.executeTransaction()` with:
   - `type`: `'invoke'`
   - `invoke.userAddress`: The payer's account address
   - `invoke.typedData`: The signed OutsideExecution typed data
   - `invoke.signature`: The client's `[r, s]` signature
   - `version`: `'0x1'`
   - `feeMode`: `{ mode: 'sponsored' }`
4. The paymaster calls `execute_from_outside_v2` on the payer's account contract, which executes the embedded `transfer` call. Gas is sponsored.
5. Facilitator extracts the `transaction_hash` from the paymaster response.
6. Facilitator waits for on-chain confirmation using `provider.waitForTransaction()`, expecting status `ACCEPTED_ON_L2` or `ACCEPTED_ON_L1`. A timeout of 120 seconds is enforced.
7. Facilitator returns the settlement result (success/failure, transaction hash, network, payer) to the resource server.

## `PAYMENT-RESPONSE` Header Payload

The `PAYMENT-RESPONSE` header is base64-encoded and returned to the client from the resource server.

Once decoded, the `PAYMENT-RESPONSE` is a JSON string following the `SettlementResponse` schema:

```json
{
  "success": true,
  "transaction": "0x1a2b3c4d5e6f7890abcdef1234567890abcdef1234567890abcdef1234567890",
  "network": "starknet-sepolia",
  "errorReason": null,
  "payer": "0xabc123...",
  "amount": "10000"
}
```

### Field Descriptions

- `success`: Boolean indicating whether the payment settlement was successful.
- `transaction`: The on-chain transaction hash (hex string with `0x` prefix), or `null` on failure.
- `network`: The network identifier where the transaction was executed.
- `errorReason`: Error message string if settlement failed, or `null` on success.
- `payer`: The payer's Starknet account address.
- `amount`: The amount transferred (as string).

Clients can use the transaction hash to look up full transaction details via any Starknet block explorer or RPC endpoint.

## Headers

| Header | Direction | Content |
|--------|-----------|---------|
| `PAYMENT-REQUIRED` | Server → Client | Base64-encoded `PaymentRequiredResponse` |
| `PAYMENT-SIGNATURE` | Client → Server | Base64-encoded `PaymentPayload` with signed OutsideExecution |
| `PAYMENT-RESPONSE` | Server → Client | Base64-encoded `SettlementResponse` with transaction hash |

## Facilitator Endpoints

The facilitator exposes three endpoints:

### `POST /verify`

Validates a payment signature before the resource server fulfills the request.

**Request:**
```json
{
  "x402Version": 2,
  "paymentHeader": "<base64-encoded PaymentPayload>",
  "paymentRequirements": { "...PaymentRequirements..." }
}
```

**Response:**
```json
{
  "isValid": true,
  "invalidReason": null,
  "payer": "0xabc123..."
}
```

### `POST /settle`

Executes the payment on-chain after the resource server has fulfilled the request.

**Request:**
```json
{
  "x402Version": 2,
  "paymentHeader": "<base64-encoded PaymentPayload>",
  "paymentRequirements": { "...PaymentRequirements..." }
}
```

**Response:**
```json
{
  "success": true,
  "transaction": "0x1a2b3c...",
  "network": "starknet-sepolia",
  "errorReason": null,
  "payer": "0xabc123...",
  "amount": "10000"
}
```

### `GET /supported`

Returns the schemes and networks the facilitator supports.

**Response:**
```json
{
  "kinds": [
    {
      "x402Version": 2,
      "scheme": "exact",
      "network": "starknet-sepolia",
      "extra": { "sponsored": true }
    },
    {
      "x402Version": 2,
      "scheme": "exact",
      "network": "starknet-mainnet",
      "extra": { "sponsored": true }
    }
  ]
}
```

## Appendix

### SNIP-9 Outside Execution

[SNIP-9](https://github.com/starknet-io/SNIPs/blob/main/SNIPS/snip-9.md) defines Outside Execution for Starknet account contracts. It allows a user to sign a message authorizing a specific set of calls, which any third party can then submit for execution on the user's behalf by calling `execute_from_outside_v2` on the user's account contract.

Key properties:
- **Caller restriction**: The OutsideExecution can restrict which address is allowed to submit it.
- **Time bounds**: `Execute After` and `Execute Before` timestamps define a validity window.
- **Nonce**: A unique nonce prevents replay. Enforced on-chain by the account contract.
- **Calls**: An array of calls to execute. For x402 `exact`, this is always exactly one `transfer` call.

The typed data follows the SNIP-12 standard for structured data hashing and signing on Starknet.

### AVNU Paymaster Integration

The AVNU paymaster provides two key capabilities for the x402 protocol:

**Transaction Building (`buildTransaction`):**
The client sends a transfer call to the paymaster, which wraps it in a SNIP-9 OutsideExecution and returns typed data for the client to sign. This abstracts the complexity of constructing the OutsideExecution struct.

**Transaction Execution (`executeTransaction`):**
The facilitator sends the signed OutsideExecution to the paymaster, which submits it on-chain with sponsored gas. The paymaster calls `execute_from_outside_v2` on the payer's account contract.

**Paymaster URLs:**
- Sepolia: `https://sepolia.paymaster.avnu.fi`
- Mainnet: `https://starknet.paymaster.avnu.fi`

**Authentication:** Requires an `x-paymaster-api-key` header.

**Fee Mode:** The protocol uses `{ mode: 'sponsored' }`, meaning gas is fully subsidized by the paymaster. Neither the client nor the resource server pays gas.

### Why No ERC-20 Approvals

Traditional ERC-20 payment flows require the payer to first call `approve(spender, amount)` on the token contract, granting permission for another address to call `transferFrom`. This has several problems:

1. **Extra transaction**: Approval is a separate on-chain transaction the user must sign and pay gas for.
2. **Over-approval risk**: Users often approve unlimited amounts for convenience, creating a security risk if the spender is compromised.
3. **UX friction**: Two-step flows (approve + transfer) are confusing for users.

SNIP-9 Outside Execution eliminates all of these. The payer signs a single message authorizing the exact transfer. The facilitator submits it — no approval transaction, no over-approval risk, no extra gas cost.

### U256 Amount Handling

Starknet represents token amounts as U256 (256-bit unsigned integers), stored as two felt252 values:

```
amount = low + (high << 128)
```

- `low`: The lower 128 bits of the amount.
- `high`: The upper 128 bits of the amount.

For typical payment amounts (< 2^128), `high` is `0`. The transfer calldata is structured as `[recipient, amount_low, amount_high]`.

When reading balances via `balanceOf`, the result is returned as `[low, high]` and must be reconstructed: `BigInt(low) + (BigInt(high) << 128n)`.

### Signature Verification

Starknet account contracts implement `is_valid_signature(hash, signature)` as defined in [SNIP-6](https://github.com/starknet-io/SNIPs/blob/main/SNIPS/snip-6.md). The facilitator uses this to verify that the payer actually signed the OutsideExecution:

1. Compute the typed data hash from the OutsideExecution typed data.
2. Call `is_valid_signature(hash, [r, s])` on the payer's account contract.
3. The call returns `0x56414c4944` (the felt252 encoding of `"VALID"`) if the signature is valid.

This is an on-chain verification — it works with any account contract implementation (standard accounts, multisig, hardware wallets, etc.), as long as the account implements SNIP-6.

### Account Addresses

Starknet account addresses are felt252 values, represented as hex strings with a `0x` prefix. Addresses may be up to 64 hex characters (256 bits). All address comparisons in the protocol are performed after normalizing to lowercase hex.

### Error Types

The facilitator uses typed errors for clear failure reporting:

| Error Code | Description |
|------------|-------------|
| `VERIFICATION_ERROR` | Payment verification failed (invalid signature, insufficient balance, wrong recipient, etc.) |
| `SETTLEMENT_ERROR` | On-chain settlement failed (transaction rejected, timeout, paymaster error, etc.) |

## Recommendation

- Use the spec defined above and only support payments of specific amounts.
- Implement sponsored transactions via AVNU paymaster to enable gasless payments for clients (recommended for production).
- Use the `starknet-x402` SDK (`npm i starknet-x402`) for client and middleware integration with full TypeScript support.
- Leverage Starknet.js v7+ for transaction construction, typed data signing, and RPC interaction.
- Future versions could explore multi-call payments, streaming payments, or usage-based billing as Starknet's execution model evolves.
