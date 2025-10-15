# Scheme: `exact` on `Starknet`

## Summary

The `exact` scheme on Starknet uses off-chain signatures to authorize a transfer of a specific amount of an ERC20 token from the payer to the resource server. The approach leverages Starknet's native account abstraction and signature verification, ensuring the facilitator has no ability to direct funds anywhere but the address specified by the resource server in paymentRequirements.

## `X-Payment` header payload

The `payload` field of the `X-PAYMENT` header must contain the following fields:

- `from`: The payer's Starknet account address
- `to`: The recipient's Starknet account address (must match `paymentRequirements.payTo`)
- `token`: The ERC20 token contract address (must match `paymentRequirements.asset`)
- `amount`: The amount to transfer in the token's smallest unit (must be >= `paymentRequirements.maxAmountRequired`)
- `nonce`: A unique identifier to prevent replay attacks (hex string)
- `deadline`: Unix timestamp (seconds) after which the authorization expires
- `signature`: Starknet signature with `r` and `s` components

Example:

```json
{
  "from": "0x4467e53b112af30acd3cd62b029bea473dd364bd5c0211a929cb7da0f4b8f79",
  "to": "0x209693Bc6afc0C5328bA36FaF03C514EF312287C",
  "token": "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
  "amount": "10000000000000000",
  "nonce": "0xf3746613c2d920b5fdabc0856f2aeb2d4f88ee6037b8cc5d04a71a4462f13480",
  "deadline": 1740672154,
  "signature": {
    "r": "0x2d6a7588d6acca505cbf0d9a4a227e0c52c6c34008c8e8986a1283259764173",
    "s": "0x608a2ce6496642e377d6da8dbbf5836e9bd15092f9ecab05ded3d6293af148b5"
  }
}
```

Full `X-PAYMENT` header:

```json
{
  "x402Version": 1,
  "scheme": "exact",
  "network": "starknet-sepolia",
  "payload": {
    "from": "0x4467e53b112af30acd3cd62b029bea473dd364bd5c0211a929cb7da0f4b8f79",
    "to": "0x209693Bc6afc0C5328bA36FaF03C514EF312287C",
    "token": "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
    "amount": "10000000000000000",
    "nonce": "0xf3746613c2d920b5fdabc0856f2aeb2d4f88ee6037b8cc5d04a71a4462f13480",
    "deadline": 1740672154,
    "signature": {
      "r": "0x2d6a7588d6acca505cbf0d9a4a227e0c52c6c34008c8e8986a1283259764173",
      "s": "0x608a2ce6496642e377d6da8dbbf5836e9bd15092f9ecab05ded3d6293af148b5"
    }
  }
}
```

## Message Structure

The message to be signed follows this structure (using Starknet's typed data standard):

```typescript
{
  domain: {
    name: "x402 Payment",
    version: "1",
    chainId: "0x534e5f5345504f4c4941", // SN_SEPOLIA or SN_MAIN
  },
  types: {
    StarkNetDomain: [
      { name: "name", type: "felt" },
      { name: "version", type: "felt" },
      { name: "chainId", type: "felt" },
    ],
    Payment: [
      { name: "from", type: "felt" },
      { name: "to", type: "felt" },
      { name: "token", type: "felt" },
      { name: "amount", type: "felt" },
      { name: "nonce", type: "felt" },
      { name: "deadline", type: "felt" },
    ],
  },
  primaryType: "Payment",
  message: {
    from: "0x4467e53b112af30acd3cd62b029bea473dd364bd5c0211a929cb7da0f4b8f79",
    to: "0x209693Bc6afc0C5328bA36FaF03C514EF312287C",
    token: "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
    amount: "10000000000000000",
    nonce: "0xf3746613c2d920b5fdabc0856f2aeb2d4f88ee6037b8cc5d04a71a4462f13480",
    deadline: 1740672154,
  },
}
```

## Verification

Steps to verify a payment for the `exact` scheme on Starknet:

1. **Decode and parse** the `X-PAYMENT` header from base64
2. **Verify payload structure** - ensure all required fields are present
3. **Verify scheme and network** match the payment requirements
4. **Verify recipient address** (`payload.to`) matches `paymentRequirements.payTo`
5. **Verify token address** (`payload.token`) matches `paymentRequirements.asset`
6. **Verify amount** (`payload.amount`) is >= `paymentRequirements.maxAmountRequired`
7. **Verify deadline** - current timestamp must be <= `payload.deadline`
8. **Verify signature** - reconstruct the typed data message and verify the signature is valid for the `from` address
9. **Check token balance** - verify the payer has sufficient balance of the token
10. **Check allowance** - verify the payer has approved sufficient allowance to the facilitator
11. **Verify nonce** - ensure the nonce hasn't been used before (prevents replay attacks)
12. **Simulate transaction** - run a simulation to ensure the transfer_from would succeed on-chain

## Payment Requirements Response

When a client makes a request without payment, the server responds with a 402 Payment Required status and payment requirements:

```json
{
  "x402Version": 1,
  "error": "X-PAYMENT header is required",
  "accepts": [
    {
      "scheme": "exact",
      "network": "starknet-sepolia",
      "maxAmountRequired": "10000000000000000",
      "asset": "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
      "payTo": "0x4467e53b112af30acd3cd62b029bea473dd364bd5c0211a929cb7da0f4b8f79",
      "resource": "https://api.example.com/weather",
      "description": "Access to San Francisco weather data",
      "mimeType": "application/json",
      "outputSchema": null,
      "maxTimeoutSeconds": 300,
      "extra": null
    }
  ]
}
```

## Settlement

Settlement is performed by the facilitator executing a token `transfer_from` transaction on Starknet:

**Prerequisites:**
1. The user must first approve the facilitator to spend tokens (one-time setup)
2. The user signs an authorization message (off-chain, no gas cost)
3. The facilitator verifies the signature
4. The facilitator executes `transfer_from` to move tokens from user to recipient

### Settlement Flow

1. **One-Time Approval**: User approves facilitator to spend tokens
   ```typescript
   await userAccount.execute({
     contractAddress: tokenAddress,
     entrypoint: 'approve',
     calldata: [facilitatorAddress, approvalAmount, 0]
   });
   ```

2. **Payment Authorization**: User signs message (off-chain, gasless)
   ```typescript
   const signature = await userAccount.signMessage(typedData);
   ```

3. **Settlement Transaction**: Facilitator executes transfer_from
   ```typescript
   await facilitatorAccount.execute({
     contractAddress: payload.token,
     entrypoint: 'transfer_from',
     calldata: [
       payload.from,        // from (user's address)
       payload.to,          // to (recipient)
       payload.amount,      // amount (low)
       0,                   // amount (high) - for u256
     ]
   });
   ```

4. The facilitator waits for transaction confirmation (ACCEPTED_ON_L2 or ACCEPTED_ON_L1)
5. The transaction hash and network ID are returned in the settlement response

### Settlement Transaction Structure

```typescript
{
  contractAddress: payload.token, // ERC20 token address
  entrypoint: 'transfer_from',    // NOT 'transfer' - uses approval
  calldata: [
    payload.from,        // user's address (source of funds)
    payload.to,          // recipient address
    payload.amount,      // amount (low)
    0,                   // amount (high) - for u256
  ]
}
```

**Key Difference from EVM**: Unlike EIP-3009 which enables single-transaction authorization, Starknet requires:
1. Pre-approval transaction (one-time)
2. Signed authorization (gasless)
3. Facilitator executes transfer_from

This pattern:
- ✅ Keeps payment settlement gasless for users (after initial approval)
- ✅ Follows x402 principle (facilitator settles, not user)
- ✅ Maintains security (user controls approval amount)
- ✅ Enables trust-minimized payments

## Key Differences from EVM

### Account Abstraction
- Starknet has native account abstraction - all accounts are smart contracts
- Signatures are verified at the account level, not by a separate contract
- Different signature schemes (STARK-friendly Pedersen hash + ECDSA over Stark curve)

### Token Standard
- Uses Cairo ERC20 standard (similar to ERC20 but with Cairo-specific types)
- Amount is represented as `u256` (split into `low` and `high` for values > 2^128)
- Token addresses are felt252 values, not 20-byte addresses

### Signature Format
- Starknet signatures have `r` and `s` components (both felts)
- No `v` component like Ethereum
- Uses STARK-friendly elliptic curve cryptography

### Transaction Finality
- Starknet has multiple transaction states:
  - `RECEIVED`: Transaction received by sequencer
  - `ACCEPTED_ON_L2`: Accepted on Layer 2
  - `ACCEPTED_ON_L1`: Accepted and finalized on Ethereum L1
- The facilitator should wait for at least `ACCEPTED_ON_L2` before confirming settlement

## Facilitator API

The facilitator provides HTTP REST APIs for payment verification and settlement.

### POST /api/facilitator/verify

Verifies a payment authorization without executing the transaction on the blockchain.

**Request:**
```json
{
  "x402Version": 1,
  "paymentHeader": "base64_encoded_payment_payload",
  "paymentRequirements": {
    "scheme": "exact",
    "network": "starknet-sepolia",
    "maxAmountRequired": "10000000000000000",
    "resource": "https://api.example.com/weather",
    "description": "Access to weather data",
    "mimeType": "application/json",
    "payTo": "0x4467e53b112af30acd3cd62b029bea473dd364bd5c0211a929cb7da0f4b8f79",
    "maxTimeoutSeconds": 300,
    "asset": "0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d",
    "extra": null
  }
}
```

**Successful Response:**
```json
{
  "isValid": true,
  "invalidReason": null
}
```

**Error Response:**
```json
{
  "isValid": false,
  "invalidReason": "Insufficient amount: expected at least 10000000000000000, got 5000000000000000"
}
```

### POST /api/facilitator/settle

Executes a verified payment by broadcasting the transaction to the blockchain.

**Request:** Same as `/verify` endpoint

**Successful Response:**
```json
{
  "success": true,
  "error": null,
  "txHash": "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
  "networkId": "starknet-sepolia"
}
```

**Error Response:**
```json
{
  "success": false,
  "error": "Transaction execution failed",
  "txHash": null,
  "networkId": "starknet-sepolia"
}
```

## Error Codes

The x402 protocol defines standard error codes for Starknet:

- **`insufficient_funds`**: Client does not have enough tokens to complete the payment
- **`invalid_deadline`**: Payment authorization has expired (after deadline timestamp)
- **`invalid_amount`**: Payment amount is insufficient for the required payment
- **`invalid_signature`**: Payment authorization signature is invalid
- **`invalid_recipient_mismatch`**: Recipient address does not match payment requirements
- **`invalid_token_mismatch`**: Token address does not match payment requirements
- **`invalid_network`**: Specified blockchain network is not supported
- **`invalid_payload`**: Payment payload is malformed or contains invalid data
- **`invalid_payment_requirements`**: Payment requirements object is invalid
- **`invalid_scheme`**: Specified payment scheme is not supported
- **`invalid_x402_version`**: Protocol version is not supported
- **`invalid_transaction_state`**: Blockchain transaction failed or was rejected
- **`unexpected_verify_error`**: Unexpected error occurred during payment verification
- **`unexpected_settle_error`**: Unexpected error occurred during payment settlement

## Security Considerations

1. **Nonce Management**: Each nonce should be used only once. The facilitator must track used nonces to prevent replay attacks.

2. **Deadline Enforcement**: Always verify the deadline hasn't passed before attempting settlement.

3. **Amount Validation**: Ensure the authorized amount covers the required payment to prevent partial payment attacks.

4. **Signature Verification**: Use Starknet's native signature verification to ensure the signature is valid for the claimed account.

5. **Network Validation**: Verify the transaction is being settled on the correct network (sepolia vs mainnet).

6. **Gas Considerations**: The facilitator pays for gas to execute the transfer. This should be factored into the facilitator's fee structure.

## Supported Networks

- **`starknet-sepolia`**: Starknet Sepolia testnet
- **`starknet-mainnet`**: Starknet mainnet

## Supported Assets

- **STRK**: Native Starknet token (ERC20)
  - Sepolia: `0x04718f5a0fc34cc1af16a1cdee98ffb20c31f5cd61d6ab07201858f4287c938d`
- **ETH**: Ethereum on Starknet (ERC20)
  - Sepolia: `0x049d36570d4e46f48e99674bd3fcc84644ddd6b96f7c741b1562b82f9e004dc7`
- **USDC**: USD Coin (ERC20)
  - Sepolia: `0x053b40a647cedfca6ca84f542a0fe36736031905a9639a7f19a3c1e66bfd5080`
- **Custom ERC20 tokens**: Any ERC20-compliant token on Starknet

## Appendix

### Why This Approach for Starknet?

**Starknet Account Abstraction**: Unlike EVM chains where EOAs (Externally Owned Accounts) are separate from contracts, Starknet accounts are smart contracts by default. This enables flexible signature schemes and transaction authorization patterns.

**Approval Pattern**: Starknet ERC20 tokens use the standard `approve` and `transfer_from` pattern. Unlike EVM's EIP-3009 which enables single-transaction authorization, Starknet requires a one-time approval followed by signed authorizations for each payment. This maintains the x402 principle where the facilitator settles payments while keeping the user in control.

**STARK-Friendly Cryptography**: Starknet uses STARK-friendly signature schemes (Pedersen hash + ECDSA over the Stark curve), which are different from Ethereum's secp256k1 signatures.

### Future Improvements

1. **Meta-Transactions**: Leverage Starknet's account abstraction to enable gasless transactions where the facilitator covers gas costs transparently.

2. **Usage-Based Payments**: Implement an "up-to" scheme similar to EIP-2612 permits, allowing for usage-based pricing (e.g., per-token LLM generation).

3. **Batch Settlements**: Optimize by batching multiple payment settlements into a single transaction, reducing overall transaction costs.

4. **L1→L2 Messaging**: Enable cross-layer payment authorization where signatures on L1 can authorize L2 settlements.

5. **Cairo Payment Contract**: Deploy a dedicated Cairo contract for payment routing that provides additional guarantees and optimizations specific to the x402 protocol.

## Implementation Notes

### Client Implementation
Clients need to:
1. Generate a unique nonce for each payment
2. Set an appropriate deadline (typically current time + 5 minutes)
3. Construct the typed data message following Starknet standards
4. Sign the message using their Starknet account
5. Base64-encode the entire payment payload as the `X-PAYMENT` header

### Facilitator Implementation
Facilitators need to:
1. Validate all payment fields against requirements
2. Verify signature using Starknet signature verification
3. Check token balance and allowance
4. Execute the transfer transaction
5. Monitor transaction status until confirmation
6. Return transaction hash and network ID

### Resource Server Implementation
Resource servers need to:
1. Define payment requirements (amount, token, network)
2. Configure the x402 middleware with these requirements
3. Let the middleware handle all payment verification and settlement
4. Return the protected resource once payment is confirmed

