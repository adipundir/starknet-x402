# x402 Protocol Specification for Starknet (v2)

This directory contains the x402 payment protocol specification for the Starknet implementation.

## Documentation

### `scheme_exact_starknet.md` - Complete Specification

The single source of truth for implementing x402 payments on Starknet.

## v2 Changes from v1

| Area | v1 | v2 |
|------|----|----|
| Payment header | `X-PAYMENT` | `PAYMENT-SIGNATURE` |
| Response header | `X-Payment-Response` | `PAYMENT-RESPONSE` |
| 402 header | (none) | `PAYMENT-REQUIRED` |
| Amount field | `maxAmountRequired` | `amount` |
| Settle response | `txHash`, `error`, `networkId` | `transaction`, `errorReason`, `network` |
| Verify response | (no payer) | `payer` field added |
| Payment payload | (minimal) | `resource`, `accepted`, `extensions` fields |
| 402 body | (minimal) | `resource: ResourceInfo`, `extensions` added |
| Protocol version | `x402Version: 1` | `x402Version: 2` |

All v1 fields are kept as deprecated aliases for backward compatibility.

## Key Features

- **Starknet-Native**: Uses account abstraction and `is_valid_signature` for verification
- **USDC Default**: Circle native USDC (6 decimals) as default token
- **Gas Sponsoring**: AVNU paymaster integration for gasless settlement
- **Facilitator-Settled**: Facilitator handles `transfer_from` on-chain
- **Replay Protected**: In-memory nonce tracking
- **Trust-Minimized**: Users control approval amounts

## Quick Reference

**Client**: Read "PAYMENT-SIGNATURE header payload", "SNIP-12 Typed Data", "Client Implementation"

**Facilitator**: Read "Verification (12 steps)", "Settlement", "Facilitator API"

**Server**: Read "402 Response Format", "Middleware Implementation"

## Version

**Version 2.0** - March 2026
