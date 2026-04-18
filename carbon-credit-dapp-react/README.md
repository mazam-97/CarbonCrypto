# Carbon Credit Tokenizer - React dApp

A modern React TypeScript application for tokenizing and managing carbon credits on the Solana blockchain.

## Features

- **Wallet Integration**: Multi-wallet support (Phantom, Solflare, etc.)
- **Registry Management**: Initialize and manage carbon credit registry
- **Batch Operations**: 
  - Mint empty batches
  - Update batch metadata
  - Link with project vintages
  - Confirm/reject batches (admin only)
  - Fractionalize to SPL tokens
- **Query System**: Retrieve batch information
- **Admin Controls**: Registry authority management
- **Modern UI**: Responsive design with TailwindCSS

## Tech Stack

- **Frontend**: React 18+ with TypeScript
- **Build Tool**: Vite
- **Styling**: TailwindCSS
- **Blockchain**: Solana Web3.js, Anchor Framework
- **Wallet**: Solana Wallet Adapter
- **Tokens**: SPL Token support
- **Notifications**: React Hot Toast

## Prerequisites

- Node.js 16+ and npm
- A Solana wallet (Phantom, Solflare, etc.)
- Devnet SOL for testing

## Installation

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Open [http://localhost:5173](http://localhost:5173) in your browser

## Usage

1. **Connect Wallet**: Click "Connect Wallet" and select your preferred wallet
2. **Initialize Registry** (Admin only): Set up the carbon credit registry
3. **Mint Batches**: Create new carbon credit batches
4. **Manage Batches**: Update metadata, link vintages, confirm/reject
5. **Fractionalize**: Convert confirmed batches to SPL tokens
6. **Query**: Retrieve batch information

## Project Structure

```
src/
├── components/           # React components
├── hooks/               # Custom React hooks
├── types/               # TypeScript type definitions
├── config/              # Configuration files
└── main.tsx            # Application entry point
```

## Configuration

The app is configured for Solana Devnet by default. Update `src/config/program.ts` to change:
- Program ID
- Network endpoint
- IDL (Interface Definition Language)

## Building

```bash
npm run build
```

## Features Overview

### Wallet Connection
- Multi-wallet adapter support
- Auto-connect for returning users
- Admin role detection

### Batch Management
- Create empty batches with unique IDs
- Add metadata (serial number, quantity, URI)
- Link with project vintage IDs
- Status tracking (Pending, Confirmed, Rejected, Fractionalized)

### Admin Operations
- Registry initialization
- Batch confirmation/rejection
- Authority management

### Token Operations
- Fractionalize confirmed batches to SPL tokens
- Integration with Solana token programs

## Development

This project uses:
- TypeScript for type safety
- ESLint for code quality
- TailwindCSS for styling
- Vite for fast development

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License
