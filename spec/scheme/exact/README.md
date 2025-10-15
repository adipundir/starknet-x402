# x402 Protocol Specification for Starknet

This directory contains the complete x402 payment protocol specification for Starknet implementation.

## Documentation

### `scheme_exact_starknet.md` - **Complete Specification**

This is the **single source of truth** for implementing x402 payments on Starknet. It contains:

#### Core Protocol
- ✅ Payment payload structure with examples
- ✅ Message signing format (Starknet typed data)
- ✅ 12-step verification process
- ✅ Complete settlement flow (Approval + TransferFrom)

#### Payment Requirements
- ✅ 402 response format
- ✅ Required fields and validation rules

#### Facilitator API
- ✅ POST `/api/facilitator/verify` - Verify payment authorization
- ✅ POST `/api/facilitator/settle` - Execute payment on blockchain
- ✅ Request/response schemas with examples

#### Implementation Details
- ✅ Client implementation guide
- ✅ Facilitator implementation guide
- ✅ Resource server implementation guide
- ✅ Code examples for all components

#### Reference Information
- ✅ Supported networks (Sepolia, Mainnet)
- ✅ Supported assets (STRK, ETH, USDC with addresses)
- ✅ Complete error code list
- ✅ Security considerations
- ✅ Starknet-specific differences from EVM

## Quick Start

### For Developers

**Building a client?** → Read sections: "X-Payment header payload", "Message Structure", "Client Implementation"

**Building a facilitator?** → Read sections: "Verification", "Settlement", "Facilitator API", "Facilitator Implementation"

**Building a server?** → Read sections: "Payment Requirements Response", "Resource Server Implementation"

## Structure

The specification follows this logical flow:

```
1. Summary - Overview of the protocol
   ↓
2. Payload Structure - What to send in X-PAYMENT header
   ↓
3. Message Signing - How to sign payments
   ↓
4. Verification - 12 steps to verify a payment
   ↓
5. Payment Requirements - 402 response format
   ↓
6. Settlement - How facilitator executes payments
   ↓
7. Facilitator API - REST endpoints for verification/settlement
   ↓
8. Error Codes - Standard error messages
   ↓
9. Security - Nonce tracking, deadline enforcement, etc.
   ↓
10. Networks & Assets - Supported chains and tokens
   ↓
11. Implementation Notes - Guides for each role
   ↓
12. Appendix - Why this approach, future improvements
```

## Key Features

✅ **Starknet-Native**: Uses Starknet's account abstraction and signature schemes  
✅ **Gasless for Users**: After one-time approval, payments are gasless  
✅ **Facilitator-Settled**: Follows x402 principle (facilitator handles blockchain)  
✅ **Trust-Minimized**: Users control approval amounts  
✅ **Complete Specification**: Everything needed to build a working implementation  

## Version

**Version 1.0** - October 2025

This specification is production-ready and used by the starknet-x402 reference implementation.


