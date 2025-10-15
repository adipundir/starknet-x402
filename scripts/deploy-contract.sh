#!/bin/bash

# x402 PaymentProcessor Contract Deployment Script
# This script deploys the PaymentProcessor Cairo contract to Starknet

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}x402 Contract Deployment Script${NC}"
echo "=================================="
echo ""

# Check if network is provided
if [ -z "$1" ]; then
    echo -e "${RED}Error: Network not specified${NC}"
    echo "Usage: ./deploy-contract.sh [sepolia|mainnet]"
    exit 1
fi

NETWORK=$1

# Validate network
if [ "$NETWORK" != "sepolia" ] && [ "$NETWORK" != "mainnet" ]; then
    echo -e "${RED}Error: Invalid network. Use 'sepolia' or 'mainnet'${NC}"
    exit 1
fi

# Configuration
CONTRACT_PATH="src/contracts/PaymentProcessor.cairo"
ACCOUNT_FILE="~/.starknet_accounts/deployer.json"
OWNER_ADDRESS=${OWNER_ADDRESS:-"0x0"}
FEE_BASIS_POINTS=${FEE_BASIS_POINTS:-"10"} # 0.1% default

echo -e "${YELLOW}Configuration:${NC}"
echo "  Network: $NETWORK"
echo "  Contract: $CONTRACT_PATH"
echo "  Owner: $OWNER_ADDRESS"
echo "  Fee: $FEE_BASIS_POINTS basis points ($(echo "scale=2; $FEE_BASIS_POINTS/100" | bc)%)"
echo ""

# Check if owner address is set
if [ "$OWNER_ADDRESS" == "0x0" ]; then
    echo -e "${RED}Error: OWNER_ADDRESS environment variable not set${NC}"
    echo "Set it with: export OWNER_ADDRESS=0x..."
    exit 1
fi

# Confirmation for mainnet
if [ "$NETWORK" == "mainnet" ]; then
    echo -e "${RED}WARNING: You are about to deploy to MAINNET${NC}"
    read -p "Are you sure? (yes/no): " confirm
    if [ "$confirm" != "yes" ]; then
        echo "Deployment cancelled"
        exit 0
    fi
fi

# Step 1: Compile contract (if using Scarb)
echo -e "${GREEN}Step 1: Compiling contract...${NC}"
if command -v scarb &> /dev/null; then
    scarb build
    echo -e "${GREEN}✓ Contract compiled${NC}"
else
    echo -e "${YELLOW}⚠ Scarb not found, skipping compilation${NC}"
fi
echo ""

# Step 2: Declare contract
echo -e "${GREEN}Step 2: Declaring contract...${NC}"
DECLARE_OUTPUT=$(starkli declare $CONTRACT_PATH \
    --account $ACCOUNT_FILE \
    --network $NETWORK 2>&1)

CLASS_HASH=$(echo "$DECLARE_OUTPUT" | grep -oP 'Class hash: \K0x[a-fA-F0-9]+' || echo "")

if [ -z "$CLASS_HASH" ]; then
    echo -e "${RED}✗ Failed to declare contract${NC}"
    echo "$DECLARE_OUTPUT"
    exit 1
fi

echo -e "${GREEN}✓ Contract declared${NC}"
echo "  Class Hash: $CLASS_HASH"
echo ""

# Step 3: Deploy contract
echo -e "${GREEN}Step 3: Deploying contract...${NC}"
DEPLOY_OUTPUT=$(starkli deploy $CLASS_HASH \
    --account $ACCOUNT_FILE \
    --network $NETWORK \
    $OWNER_ADDRESS \
    $FEE_BASIS_POINTS 2>&1)

CONTRACT_ADDRESS=$(echo "$DEPLOY_OUTPUT" | grep -oP 'Contract address: \K0x[a-fA-F0-9]+' || echo "")

if [ -z "$CONTRACT_ADDRESS" ]; then
    echo -e "${RED}✗ Failed to deploy contract${NC}"
    echo "$DEPLOY_OUTPUT"
    exit 1
fi

echo -e "${GREEN}✓ Contract deployed${NC}"
echo "  Contract Address: $CONTRACT_ADDRESS"
echo ""

# Step 4: Verify deployment
echo -e "${GREEN}Step 4: Verifying deployment...${NC}"
VERIFY_OUTPUT=$(starkli call $CONTRACT_ADDRESS get_nonce $OWNER_ADDRESS \
    --network $NETWORK 2>&1 || echo "")

if [ -n "$VERIFY_OUTPUT" ]; then
    echo -e "${GREEN}✓ Contract verified and callable${NC}"
else
    echo -e "${YELLOW}⚠ Could not verify contract call${NC}"
fi
echo ""

# Step 5: Save deployment info
DEPLOYMENT_FILE="deployments/$NETWORK-deployment.json"
mkdir -p deployments

cat > $DEPLOYMENT_FILE << EOF
{
  "network": "$NETWORK",
  "classHash": "$CLASS_HASH",
  "contractAddress": "$CONTRACT_ADDRESS",
  "owner": "$OWNER_ADDRESS",
  "feeBasisPoints": $FEE_BASIS_POINTS,
  "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
  "deployer": "$(whoami)"
}
EOF

echo -e "${GREEN}✓ Deployment info saved to $DEPLOYMENT_FILE${NC}"
echo ""

# Step 6: Update environment variable suggestions
echo -e "${GREEN}Deployment Complete!${NC}"
echo "=================================="
echo ""
echo -e "${YELLOW}Add these to your .env file:${NC}"
echo ""
echo "PAYMENT_PROCESSOR_ADDRESS=$CONTRACT_ADDRESS"
echo "NETWORK=$NETWORK"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Verify the contract on a block explorer"
echo "2. Test the contract with a small payment"
echo "3. Monitor the contract for any issues"
echo "4. Update your facilitator configuration"
echo ""
echo -e "${GREEN}Happy payments! 🚀${NC}"




