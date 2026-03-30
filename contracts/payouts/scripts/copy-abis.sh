#!/bin/bash

# Script to copy compiled ABIs to frontend
# Run this after: forge build

CONTRACTS_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_DIR="$CONTRACTS_DIR/../frontend"
BLOCKCHAIN_DIR="$FRONTEND_DIR/blockchain"
ABIS_DIR="$BLOCKCHAIN_DIR/abis"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📦 Copying contract ABIs to frontend...${NC}"

# Create directories if they don't exist
mkdir -p "$ABIS_DIR"

# Copy PayoutVault ABI
if [ -f "$CONTRACTS_DIR/out/PayoutVault.sol/PayoutVault.json" ]; then
    # Extract only the ABI from the full JSON
    jq '.abi' "$CONTRACTS_DIR/out/PayoutVault.sol/PayoutVault.json" > "$ABIS_DIR/PayoutVault.json"
    echo -e "${GREEN}✓${NC} Copied PayoutVault ABI"
else
    echo "❌ PayoutVault.json not found. Run 'forge build' first."
    exit 1
fi

echo -e "${GREEN}✅ ABIs copied successfully!${NC}"
echo -e "${BLUE}Location: $ABIS_DIR${NC}"

