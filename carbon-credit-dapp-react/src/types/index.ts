import { PublicKey } from '@solana/web3.js';
import BN from 'bn.js';

export interface Registry {
  authority: PublicKey;
  batchCounter: BN;
  bump: number;
}

export enum BatchStatus {
  Pending = 'Pending',
  Confirmed = 'Confirmed',
  Rejected = 'Rejected',
  Fractionalized = 'Fractionalized',
}

export interface Batch {
  nftMint: PublicKey;
  tokenId: BN;
  owner: PublicKey;
  status: BatchStatus;
  quantity: BN;
  serialNumber: string;
  projectVintageId: BN;
  uri: string;
}

export interface BatchFormData {
  /** Batch NFT mint address (base58). */
  nftMint: string;
  /** Metaplex-style NFT metadata for `mint_batch_nft` */
  nftName?: string;
  nftSymbol?: string;
  serialNumber?: string;
  quantity?: string;
  uri?: string;
  vintageId?: string;
  comment?: string;
  /** Fractional SPL token metadata for `fractionalize_batch` */
  tokenName?: string;
  tokenSymbol?: string;
}

export interface WalletContextState {
  connected: boolean;
  publicKey: PublicKey | null;
  connecting: boolean;
  disconnecting: boolean;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
}

export type StatusType = 'success' | 'error' | 'info' | 'loading';
