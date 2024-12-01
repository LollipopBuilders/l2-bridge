# Bridge-L2

A Solana program that implements a bridge between L1 and L2 chains with merkle tree verification.

## Features

- Cross-chain message passing between L1 and L2
- Merkle tree verification for message integrity
- Native token bridging support
- Nonce-based transaction ordering
- Admin-controlled operations

## Prerequisites

- Rust 1.70.0 or later
- Solana CLI tools
- Node.js 16 or later
- Yarn
- Anchor Framework 0.30.1


## Program Structure

The project consists of two main programs:

### Bridge Program
- Handles token deposits and withdrawals
- Manages locked SOL accounts
- Initiates cross-chain transfers

### Message Program
- Manages message passing between chains
- Implements merkle tree verification
- Handles nonce management
- Stores cross-chain transaction information
