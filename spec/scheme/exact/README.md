# x402 v2 Exact Scheme on Starknet (SNIP-9)

## Payment Flow

1. Client requests protected resource → gets 402 with `PAYMENT-REQUIRED` header
2. Client builds `token.transfer(recipient, amount)` call
3. AVNU paymaster wraps it in an OutsideExecution (SNIP-9)
4. Client signs the OutsideExecution typed data (SNIP-12)
5. Client retries with `PAYMENT-SIGNATURE` header
6. Facilitator verifies: correct call, valid signature, sufficient balance
7. Facilitator submits to AVNU → `execute_from_outside_v2` on client's account
8. AVNU pays gas. Client's account executes `transfer`. No approval needed.
9. Client receives 200 + data + `PAYMENT-RESPONSE` header

## Trust Model

The signed OutsideExecution contains the exact `transfer` call. The facilitator cannot change the amount, recipient, or token. Nonce uniqueness is enforced on-chain by the account contract.

## Headers

| Header | Direction | Content |
|--------|-----------|---------|
| `PAYMENT-REQUIRED` | Server → Client | Base64 `PaymentRequiredResponse` |
| `PAYMENT-SIGNATURE` | Client → Server | Base64 `PaymentPayload` with OutsideExecution |
| `PAYMENT-RESPONSE` | Server → Client | Base64 settlement result |
