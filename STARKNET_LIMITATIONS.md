# Starknet Account Abstraction Limitations for x402

## The Challenge

The user requested: *"The user signs the transaction for transfer and then the facilitator verifies the transaction and then the settler will settle/submit it onchain, with the funds and gas paid by the client."*

## Why This Doesn't Work on Starknet

### On Ethereum (EVM):
✅ You can create a raw signed transaction and broadcast it
✅ Anyone can submit someone else's signed transaction  
✅ The original signer pays the gas from their account

### On Starknet (Account Abstraction):
❌ Every account is a smart contract
❌ Transactions must be submitted BY the account that signs them
❌ You cannot broadcast someone else's signed transaction
❌ The account submitting the transaction pays the gas

## The Available Solutions

### Solution 1: `transfer_from` (Current Implementation)
- **How it works**: Client approves facilitator once → Facilitator calls `transfer_from` → Funds move from client to recipient
- **Who pays gas**: Facilitator (NOT the client)
- **Pros**: Standard ERC20 pattern, works on all Starknet accounts
- **Cons**: Facilitator pays gas (not what user wanted)

### Solution 2: Pre-signed Multicall (Complex)
- **How it works**: Client creates account multicall with payment + actual transaction → Signs the multicall → Facilitator verifies → Client submits it themselves
- **Who pays gas**: Client
- **Pros**: Client pays gas (what user wanted!)
- **Cons**: Client must submit the transaction themselves (defeats purpose of facilitator)

### Solution 3: Meta-transactions (Custom Contract)
- **How it works**: Deploy a custom relayer contract that accepts signed payment authorizations
- **Who pays gas**: Facilitator initially, but reimburses from client's payment
- **Pros**: Can be designed to extract gas costs from payment
- **Cons**: Requires custom smart contract deployment, complex implementation

## Recommended Approach

**Use Solution 1 (`transfer_from`)** because:
1. It's the standard, battle-tested pattern
2. Works with all ERC20 tokens
3. Simple to implement and verify
4. The facilitator paying gas is acceptable since they're providing a service

## Current Implementation Status

The implementation is using `transfer_from` but hitting technical issues with:
1. ✅ Signature generation and verification - WORKING
2. ❌ Transaction submission - "Cannot convert undefined to a BigInt" error
3. The error is related to Starknet.js transaction version compatibility

## Next Steps

The "Cannot convert undefined to a BigInt" error suggests that the Starknet.js library version or the account contract version is incompatible with the transaction format being used. Possible solutions:

1. Update Starknet.js to the latest version
2. Check the account contract's Cairo version  
3. Ensure the account is properly deployed and funded
4. Use a different account type (Argent vs OpenZeppelin)

---

**Bottom line**: On Starknet, the facilitator MUST pay the gas for `transfer_from`. The user's requirement for "client pays gas" is fundamentally incompatible with how Starknet works unless the client submits the transaction themselves (which defeats the purpose of having a facilitator).

