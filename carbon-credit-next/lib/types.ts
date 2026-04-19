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
