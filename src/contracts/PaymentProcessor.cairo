// SPDX-License-Identifier: MIT
// x402 Payment Processor Contract for Starknet
// This contract handles verification and execution of signed payment transfers

#[starknet::contract]
mod PaymentProcessor {
    use starknet::{
        ContractAddress, get_caller_address, get_block_timestamp,
        contract_address_const
    };
    use core::traits::Into;
    use core::option::OptionTrait;
    use core::array::ArrayTrait;

    // ============================================================================
    // Storage
    // ============================================================================

    #[storage]
    struct Storage {
        // Mapping of address => nonce for replay protection
        nonces: LegacyMap<ContractAddress, u256>,
        
        // Mapping of payment hash => execution status
        executed_payments: LegacyMap<felt252, bool>,
        
        // Contract owner (facilitator)
        owner: ContractAddress,
        
        // Fee percentage (in basis points, e.g., 10 = 0.1%)
        fee_basis_points: u16,
        
        // Accumulated fees by token
        accumulated_fees: LegacyMap<ContractAddress, u256>,
    }

    // ============================================================================
    // Events
    // ============================================================================

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        PaymentExecuted: PaymentExecuted,
        PaymentVerified: PaymentVerified,
        NonceIncremented: NonceIncremented,
        FeeCollected: FeeCollected,
    }

    #[derive(Drop, starknet::Event)]
    struct PaymentExecuted {
        #[key]
        from: ContractAddress,
        #[key]
        to: ContractAddress,
        #[key]
        token: ContractAddress,
        amount: u256,
        nonce: u256,
        tx_hash: felt252,
    }

    #[derive(Drop, starknet::Event)]
    struct PaymentVerified {
        #[key]
        from: ContractAddress,
        #[key]
        to: ContractAddress,
        amount: u256,
        nonce: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct NonceIncremented {
        #[key]
        account: ContractAddress,
        new_nonce: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct FeeCollected {
        #[key]
        token: ContractAddress,
        amount: u256,
    }

    // ============================================================================
    // Constructor
    // ============================================================================

    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress, fee_basis_points: u16) {
        self.owner.write(owner);
        self.fee_basis_points.write(fee_basis_points);
    }

    // ============================================================================
    // External Functions
    // ============================================================================

    #[external(v0)]
    fn verify_payment(
        self: @ContractState,
        from: ContractAddress,
        to: ContractAddress,
        token: ContractAddress,
        amount: u256,
        nonce: u256,
        deadline: u64,
        signature_r: felt252,
        signature_s: felt252,
    ) -> bool {
        // Check deadline
        let current_time = get_block_timestamp();
        if current_time > deadline {
            return false;
        }

        // Check nonce
        let current_nonce = self.nonces.read(from);
        if nonce != current_nonce {
            return false;
        }

        // Verify signature
        let message_hash = self.compute_payment_hash(
            from, to, token, amount, nonce, deadline
        );
        
        let is_valid = self.verify_signature(
            from, message_hash, signature_r, signature_s
        );

        is_valid
    }

    #[external(v0)]
    fn execute_payment(
        ref self: ContractState,
        from: ContractAddress,
        to: ContractAddress,
        token: ContractAddress,
        amount: u256,
        nonce: u256,
        deadline: u64,
        signature_r: felt252,
        signature_s: felt252,
    ) -> bool {
        // Verify the payment first
        let is_valid = self.verify_payment(
            from, to, token, amount, nonce, deadline, signature_r, signature_s
        );
        
        if !is_valid {
            return false;
        }

        // Check if already executed
        let payment_hash = self.compute_payment_hash(
            from, to, token, amount, nonce, deadline
        );
        
        if self.executed_payments.read(payment_hash) {
            return false;
        }

        // Mark as executed
        self.executed_payments.write(payment_hash, true);

        // Increment nonce
        let new_nonce = nonce + 1;
        self.nonces.write(from, new_nonce);

        // Calculate fee
        let fee_bp = self.fee_basis_points.read();
        let fee_amount = (amount * fee_bp.into()) / 10000_u256;
        let net_amount = amount - fee_amount;

        // Execute token transfer via the token contract
        let success = self.transfer_tokens(token, from, to, net_amount);
        
        if success && fee_amount > 0 {
            // Collect fee
            let owner = self.owner.read();
            let fee_success = self.transfer_tokens(token, from, owner, fee_amount);
            
            if fee_success {
                let current_fees = self.accumulated_fees.read(token);
                self.accumulated_fees.write(token, current_fees + fee_amount);
                
                self.emit(FeeCollected { token, amount: fee_amount });
            }
        }

        // Emit events
        self.emit(PaymentExecuted {
            from,
            to,
            token,
            amount: net_amount,
            nonce,
            tx_hash: payment_hash,
        });

        self.emit(NonceIncremented {
            account: from,
            new_nonce,
        });

        success
    }

    #[external(v0)]
    fn get_nonce(self: @ContractState, account: ContractAddress) -> u256 {
        self.nonces.read(account)
    }

    #[external(v0)]
    fn is_payment_executed(self: @ContractState, payment_hash: felt252) -> bool {
        self.executed_payments.read(payment_hash)
    }

    #[external(v0)]
    fn get_accumulated_fees(self: @ContractState, token: ContractAddress) -> u256 {
        self.accumulated_fees.read(token)
    }

    // ============================================================================
    // Internal Functions
    // ============================================================================

    #[generate_trait]
    impl InternalFunctions of InternalFunctionsTrait {
        fn compute_payment_hash(
            self: @ContractState,
            from: ContractAddress,
            to: ContractAddress,
            token: ContractAddress,
            amount: u256,
            nonce: u256,
            deadline: u64,
        ) -> felt252 {
            // Create a hash of the payment details
            // In production, use Pedersen hash or Poseidon hash
            let mut data = ArrayTrait::new();
            data.append(from.into());
            data.append(to.into());
            data.append(token.into());
            data.append(amount.low.into());
            data.append(amount.high.into());
            data.append(nonce.low.into());
            data.append(nonce.high.into());
            data.append(deadline.into());
            
            // Simplified hash - in production use proper cryptographic hash
            let hash: felt252 = starknet::syscalls::keccak_syscall(data.span()).unwrap_syscall();
            hash
        }

        fn verify_signature(
            self: @ContractState,
            signer: ContractAddress,
            message_hash: felt252,
            signature_r: felt252,
            signature_s: felt252,
        ) -> bool {
            // Call the account contract's is_valid_signature function
            // Starknet uses account abstraction, so we verify through the account
            
            let mut calldata = ArrayTrait::new();
            calldata.append(message_hash);
            calldata.append(signature_r);
            calldata.append(signature_s);
            
            // This would call the SNIP-6 is_valid_signature on the account
            // Simplified for this example
            true // In production, implement full SNIP-6 signature verification
        }

        fn transfer_tokens(
            self: @ContractState,
            token: ContractAddress,
            from: ContractAddress,
            to: ContractAddress,
            amount: u256,
        ) -> bool {
            // Call transferFrom on the ERC20 token contract
            // This requires the PaymentProcessor contract to have approval
            
            // In production, use the proper ERC20 dispatcher
            true // Simplified for this example
        }
    }
}

