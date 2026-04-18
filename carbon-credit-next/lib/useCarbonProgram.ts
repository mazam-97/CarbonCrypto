'use client';

import { useCallback, useMemo, useState } from 'react';
import { AnchorProvider, Program } from '@coral-xyz/anchor';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  MINT_SIZE,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
  createInitializeMintInstruction,
  getAssociatedTokenAddress,
} from '@solana/spl-token';
import BN from 'bn.js';
import { Keypair, PublicKey, SystemProgram } from '@solana/web3.js';
import toast from 'react-hot-toast';
import { IDL, PROGRAM_ID } from './program';
import type { BatchInfo, BatchStatus } from './types';

const SYSVAR_RENT = new PublicKey('SysvarRent111111111111111111111111111111111');
const TOKEN_METADATA_PROGRAM_ID = new PublicKey('metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s');
const READONLY_WALLET = {
  publicKey: Keypair.generate().publicKey,
  signTransaction: async () => { throw new Error('Wallet not connected'); },
  signAllTransactions: async () => { throw new Error('Wallet not connected'); },
};

function statusFromEnum(value: any): BatchStatus {
  const key = value && typeof value === 'object' ? String(Object.keys(value)[0] || '').toLowerCase() : '';
  if (key === 'confirmed') return 'confirmed';
  if (key === 'rejected') return 'rejected';
  if (key === 'fractionalized') return 'fractionalized';
  return 'pending';
}

function metadataPda(mint: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('metadata'), TOKEN_METADATA_PROGRAM_ID.toBuffer(), mint.toBuffer()],
    TOKEN_METADATA_PROGRAM_ID
  );
  return pda;
}

function masterEditionPda(mint: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [Buffer.from('metadata'), TOKEN_METADATA_PROGRAM_ID.toBuffer(), mint.toBuffer(), Buffer.from('edition')],
    TOKEN_METADATA_PROGRAM_ID
  );
  return pda;
}

function deriveSplMintKeypair(nftMint: PublicKey): Keypair {
  const mintBytes = nftMint.toBuffer();
  const prefix = new TextEncoder().encode('fractional_mint:');
  const seed = new Uint8Array(32);
  for (let i = 0; i < 32; i++) seed[i] = mintBytes[i] ^ (prefix[i % prefix.length] ?? 0);
  return Keypair.fromSeed(seed);
}

async function findBatchPdaByNft(connection: any, nftMint: PublicKey): Promise<PublicKey> {
  const [batchPda] = PublicKey.findProgramAddressSync([Buffer.from('batch'), nftMint.toBuffer()], PROGRAM_ID);
  const info = await connection.getAccountInfo(batchPda);
  if (!info) throw new Error('Batch not found for NFT mint');
  return batchPda;
}

async function resolveNftTokenAccount(connection: any, nftMint: PublicKey, owner: PublicKey): Promise<PublicKey> {
  const ata = await getAssociatedTokenAddress(nftMint, owner);
  const ataInfo = await connection.getAccountInfo(ata);
  if (ataInfo) return ata;

  const owned = await connection.getTokenAccountsByOwner(owner, { mint: nftMint });
  if (owned.value.length > 0) return owned.value[0].pubkey;

  throw new Error('No initialized NFT token account found for this wallet and mint');
}

export function useCarbonProgram() {
  const { connection } = useConnection();
  const { publicKey, signAllTransactions, signTransaction } = useWallet();
  const [loading, setLoading] = useState(false);

  const program = useMemo(() => {
    const provider = new AnchorProvider(connection, publicKey && signAllTransactions && signTransaction
      ? { publicKey, signAllTransactions, signTransaction }
      : READONLY_WALLET as any, {
      commitment: 'confirmed',
      preflightCommitment: 'confirmed',
    });
    return new Program(IDL, provider) as any;
  }, [connection, publicKey, signAllTransactions, signTransaction]);

  const mintBatchNft = useCallback(async (name: string, symbol: string, uri: string) => {
    if (!program || !publicKey) throw new Error('Wallet not connected');
    setLoading(true);
    try {
      const mintKeypair = Keypair.generate();
      const nftMint = mintKeypair.publicKey;
      const [registryPda] = PublicKey.findProgramAddressSync([Buffer.from('registry')], PROGRAM_ID);
      const [batchData] = PublicKey.findProgramAddressSync([Buffer.from('batch'), nftMint.toBuffer()], PROGRAM_ID);
      const nftTokenAccount = await getAssociatedTokenAddress(nftMint, publicKey);

      const tx = await program.methods
        .mintBatchNft(name, symbol, uri)
        .accounts({
          owner: publicKey,
          registry: registryPda,
          nftMint,
          nftTokenAccount,
          metadata: metadataPda(nftMint),
          masterEdition: masterEditionPda(nftMint),
          batchData,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
          rent: SYSVAR_RENT,
        })
        .signers([mintKeypair])
        .rpc();

      toast.success(`Minted batch NFT: ${tx.slice(0, 8)}...`);
      return tx;
    } finally {
      setLoading(false);
    }
  }, [program, publicKey]);

  const updateBatchWithData = useCallback(async (nftMint: string, serialNumber: string, quantity: string, uri: string) => {
    if (!program || !publicKey) throw new Error('Wallet not connected');
    setLoading(true);
    try {
      const batch = await findBatchPdaByNft(connection, new PublicKey(nftMint));
      const tx = await program.methods
        .updateBatchWithData(serialNumber, new BN(quantity), uri)
        .accounts({ batch, owner: publicKey })
        .rpc();
      toast.success(`Updated batch: ${tx.slice(0, 8)}...`);
      return tx;
    } finally {
      setLoading(false);
    }
  }, [program, publicKey, connection]);

  const linkWithVintage = useCallback(async (nftMint: string, vintageId: string) => {
    if (!program || !publicKey) throw new Error('Wallet not connected');
    setLoading(true);
    try {
      const batch = await findBatchPdaByNft(connection, new PublicKey(nftMint));
      let tx: string;
      try {
        tx = await program.methods
          .linkWithVintage(new BN(vintageId))
          .accounts({ batch, owner: publicKey })
          .rpc();
      } catch (e: any) {
        const msg = String(e?.message || '').toLowerCase();
        if (!msg.includes('already been processed')) throw e;

        const fresh = await program.account.batch.fetch(batch) as any;
        const id = fresh.projectVintageId?.toString?.() ?? '0';
        if (id === new BN(vintageId).toString()) {
          toast.success('Vintage link already processed on-chain.');
          return 'already-processed';
        }
        throw e;
      }
      toast.success(`Linked vintage: ${tx.slice(0, 8)}...`);
      return tx;
    } finally {
      setLoading(false);
    }
  }, [program, publicKey, connection]);

  const getPendingBatches = useCallback(async (): Promise<BatchInfo[]> => {
    if (!program) throw new Error('Program not initialized');
    const rows = await program.account.batch.all();
    return rows
      .map((r: any) => {
        const acc = r.account;
        return {
          pda: r.publicKey as PublicKey,
          nftMint: acc.nftMint as PublicKey,
          owner: acc.owner as PublicKey,
          serialNumber: String(acc.serialNumber || ''),
          quantity: acc.quantity as BN,
          uri: String(acc.uri || ''),
          projectVintageId: acc.projectVintageId as BN,
          status: statusFromEnum(acc.status),
        } as BatchInfo;
      })
      .filter((b: BatchInfo) => b.status === 'pending');
  }, [program]);

  const queryBatchInfo = useCallback(async (nftMint: string): Promise<BatchInfo> => {
    if (!program) throw new Error('Program not initialized');
    const nftMintPk = new PublicKey(nftMint);
    const batch = await findBatchPdaByNft(connection, nftMintPk);
    const acc = await program.account.batch.fetch(batch) as any;

    return {
      pda: batch,
      nftMint: acc.nftMint as PublicKey,
      owner: acc.owner as PublicKey,
      serialNumber: String(acc.serialNumber || ''),
      quantity: acc.quantity as BN,
      uri: String(acc.uri || ''),
      projectVintageId: acc.projectVintageId as BN,
      status: statusFromEnum(acc.status),
    };
  }, [program, connection]);

  const confirmBatch = useCallback(async (nftMint: string) => {
    if (!program || !publicKey) throw new Error('Wallet not connected');
    setLoading(true);
    try {
      const nftMintPk = new PublicKey(nftMint);
      const batch = await findBatchPdaByNft(connection, nftMintPk);
      const [registry] = PublicKey.findProgramAddressSync([Buffer.from('registry')], PROGRAM_ID);

      const splMintKeypair = deriveSplMintKeypair(nftMintPk);
      const splMint = splMintKeypair.publicKey;

      const preInstructions = [] as any[];
      const signers: Keypair[] = [];
      const mintInfo = await connection.getAccountInfo(splMint);
      if (!mintInfo) {
        const rent = await connection.getMinimumBalanceForRentExemption(MINT_SIZE);
        preInstructions.push(
          SystemProgram.createAccount({
            fromPubkey: publicKey,
            newAccountPubkey: splMint,
            lamports: rent,
            space: MINT_SIZE,
            programId: TOKEN_PROGRAM_ID,
          }),
          createInitializeMintInstruction(splMint, 9, publicKey, publicKey)
        );
        signers.push(splMintKeypair);
      }

      const tx = await program.methods
        .confirmBatch()
        .preInstructions(preInstructions)
        .accounts({
          registry,
          batch,
          splMint,
          owner: publicKey,
          verifier: publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers(signers)
        .rpc();

      toast.success(`Confirmed batch: ${tx.slice(0, 8)}...`);
      return tx;
    } finally {
      setLoading(false);
    }
  }, [program, publicKey, connection]);

  const fractionalizeBatch = useCallback(async (nftMint: string, tokenName: string, tokenSymbol: string) => {
    if (!program || !publicKey) throw new Error('Wallet not connected');
    setLoading(true);
    try {
      const nftMintPk = new PublicKey(nftMint);
      const batch = await findBatchPdaByNft(connection, nftMintPk);
      const [registry] = PublicKey.findProgramAddressSync([Buffer.from('registry')], PROGRAM_ID);

      const splMint = deriveSplMintKeypair(nftMintPk).publicKey;
      const splMetadata = metadataPda(splMint);
      const userSplTokenAccount = await getAssociatedTokenAddress(splMint, publicKey);
      const nftTokenAccount = await resolveNftTokenAccount(connection, nftMintPk, publicKey);

      const preInstructions = [] as any[];
      const userSplTokenInfo = await connection.getAccountInfo(userSplTokenAccount);
      if (!userSplTokenInfo) {
        preInstructions.push(
          createAssociatedTokenAccountInstruction(
            publicKey,
            userSplTokenAccount,
            publicKey,
            splMint
          )
        );
      }

      let tx: string;
      try {
        tx = await program.methods
          .fractionalizeBatch(tokenName, tokenSymbol)
          .preInstructions(preInstructions)
          .accounts({
            owner: publicKey,
            registry,
            batch,
            nftMint: nftMintPk,
            nftTokenAccount,
            splMint,
            splMetadata,
            userSplTokenAccount,
            tokenProgram: TOKEN_PROGRAM_ID,
            tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
            rent: SYSVAR_RENT,
          })
          .rpc();
      } catch (e: any) {
        const msg = String(e?.message || '').toLowerCase();
        if (!msg.includes('already been processed')) throw e;

        const fresh = await program.account.batch.fetch(batch) as any;
        const state = String(Object.keys(fresh?.status || {})[0] || '').toLowerCase();
        if (state === 'fractionalized') {
          toast.success('Batch already fractionalized on-chain.');
          return 'already-processed';
        }
        throw e;
      }

      toast.success(`Fractionalized batch: ${tx.slice(0, 8)}...`);
      return tx;
    } finally {
      setLoading(false);
    }
  }, [program, publicKey, connection]);

  return {
    loading,
    wallet: publicKey,
    mintBatchNft,
    updateBatchWithData,
    linkWithVintage,
    confirmBatch,
    fractionalizeBatch,
    getPendingBatches,
    queryBatchInfo,
  };
}
