import type BN from 'bn.js';
import type { PublicKey } from '@solana/web3.js';

export type BatchStatus = 'pending' | 'confirmed' | 'rejected' | 'fractionalized';

export type BatchInfo = {
  pda: PublicKey;
  nftMint: PublicKey;
  owner: PublicKey;
  serialNumber: string;
  quantity: BN;
  uri: string;
  projectVintageId: BN;
  status: BatchStatus;
};

export type CarbonPoolInfo = {
  pda: PublicKey;
  poolMint: PublicKey;
  minVintage: BN;
  totalDeposited: BN;
  bump: number;
};

export type RetirementStatsInfo = {
  pda: PublicKey;
  totalRetired: BN;
};

export type IndexedBatchMint = {
  signature: string;
  ixIndex: number;
  walletAddress: string | null;
  name: string;
  symbol: string;
  uri: string;
  nftMint: string | null;
  slot: string | null;
  createdAt: string;
};

export type IndexedWalletHoldings = {
  wallet: string;
  summary: {
    mintedCount: number;
    uniqueMintCount: number;
    retirementsCount: number;
    totalRetiredRaw: string;
  };
  latestMints: Array<{
    signature: string;
    ixIndex: number;
    nftMint: string | null;
    name: string;
    symbol: string;
    uri: string;
    createdAt: string;
  }>;
  latestRetirements: Array<{
    signature: string;
    ixIndex: number;
    amountRaw: string;
    note: string;
    createdAt: string;
  }>;
};
