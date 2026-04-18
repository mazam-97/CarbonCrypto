import { useState, useCallback, useMemo, useEffect } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { Connection, Keypair, PublicKey, SystemProgram } from '@solana/web3.js';

const SYSVAR_RENT = new PublicKey('SysvarRent111111111111111111111111111111111');
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  MINT_SIZE,
  createAssociatedTokenAccountInstruction,
  createInitializeMintInstruction,
  getAssociatedTokenAddress,
} from '@solana/spl-token';
import BN from 'bn.js';
import toast from 'react-hot-toast';

import { PROGRAM_ID, IDL } from '../config/program';
import { Batch, BatchStatus } from '../types';

/** Byte offset of `nft_mint` in a serialized `Batch` account (after Anchor discriminator). */
const BATCH_NFT_MINT_MEMCMP_OFFSET = 8;

/**
 * Resolve batch account by NFT mint.
 *
 * Current program uses PDA seeds `["batch", nft_mint]`.
 * Some earlier client logic assumed `["batch", token_id]`.
 * We support both by trying current PDA first, then falling back to memcmp scan.
 */
async function resolveBatchFromNftMint(
  connection: Connection,
  programId: PublicKey,
  nftMint: PublicKey
): Promise<{ tokenId: BN; batchPda: PublicKey }> {
  // 1) Current program layout: ["batch", nft_mint]
  const [batchPdaFromMint] = PublicKey.findProgramAddressSync(
    [Buffer.from('batch'), nftMint.toBuffer()],
    programId
  );
  const batchAccountInfo = await connection.getAccountInfo(batchPdaFromMint);
  if (batchAccountInfo?.data) {
    const tokenId = new BN(
      Buffer.from(batchAccountInfo.data.subarray(8 + 32, 8 + 32 + 8)),
      'le'
    );
    return { tokenId, batchPda: batchPdaFromMint };
  }

  // 2) Fallback: scan by `nft_mint` for legacy layouts.
  const accounts = await connection.getProgramAccounts(programId, {
    filters: [
      { memcmp: { offset: BATCH_NFT_MINT_MEMCMP_OFFSET, bytes: nftMint.toBase58() } },
    ],
  });

  if (accounts.length === 0) {
    throw new Error('No batch found for this NFT mint. Check cluster and mint address.');
  }

  const raw = accounts[0].account.data;
  const tokenId = new BN(Buffer.from(raw.subarray(8 + 32, 8 + 32 + 8)), 'le');
  return { tokenId, batchPda: accounts[0].pubkey };
}

async function resolveSourceNftTokenAccount(
  connection: Connection,
  nftMint: PublicKey,
  owner: PublicKey
): Promise<PublicKey> {
  // Prefer ATA if it exists.
  const ata = await getAssociatedTokenAddress(nftMint, owner);
  const ataInfo = await connection.getAccountInfo(ata);
  if (ataInfo) {
    return ata;
  }

  // Fallback: any token account for this mint owned by the connected wallet.
  const ownedTokenAccounts = await connection.getTokenAccountsByOwner(owner, {
    mint: nftMint,
  });
  if (ownedTokenAccounts.value.length > 0) {
    return ownedTokenAccounts.value[0].pubkey;
  }

  throw new Error(
    'No initialized token account found for this NFT in the connected wallet. Switch to the wallet that holds the batch NFT and try again.'
  );
}

/**
 * Derive a deterministic Keypair for the fractional SPL mint from the batch NFT mint.
 * Using this convention means both confirmBatch and fractionalizeBatch resolve the same
 * account without storing state, as long as they're called from the same NFT mint.
 */
function deriveSplMintKeypair(nftMint: PublicKey): Keypair {
  const mintBytes = nftMint.toBuffer();
  const prefix = new TextEncoder().encode('fractional_mint:'); // 16 bytes
  const seed = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    seed[i] = mintBytes[i] ^ (prefix[i % prefix.length] ?? 0);
  }
  return Keypair.fromSeed(seed);
}

/** Metaplex Token Metadata program (metadata + master edition PDAs). */
const TOKEN_METADATA_PROGRAM_ID = new PublicKey(
  'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s'
);

function metadataPda(mint: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('metadata'),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
    ],
    TOKEN_METADATA_PROGRAM_ID
  );
  return pda;
}

function masterEditionPda(mint: PublicKey): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('metadata'),
      TOKEN_METADATA_PROGRAM_ID.toBuffer(),
      mint.toBuffer(),
      Buffer.from('edition'),
    ],
    TOKEN_METADATA_PROGRAM_ID
  );
  return pda;
}

export const useAnchorProgram = () => {
  const { connection } = useConnection();
  const { publicKey, signTransaction, signAllTransactions } = useWallet();
  const [isRegistryAdmin, setIsRegistryAdmin] = useState(false);
  const [loading, setLoading] = useState(false);

  // Anchor 0.30+: Program(idl, provider) — program id is read from IDL `address` (do not pass PROGRAM_ID here).
  const program = useMemo(() => {
    if (!publicKey || !signTransaction || !signAllTransactions) return null;

    try {
      const wallet = {
        publicKey,
        signTransaction,
        signAllTransactions,
      };

      const provider = new AnchorProvider(connection, wallet, {
        commitment: 'confirmed',
        preflightCommitment: 'confirmed',
      });

      // Loose cast: generic `Idl` + Anchor’s method builders otherwise hit “excessively deep” types.
      return new Program(IDL, provider) as any;
    } catch (error: any) {
      console.error('Error creating program:', error);
      return null;
    }
  }, [connection, publicKey, signTransaction, signAllTransactions]);

  // Utility function to find PDA
  const findPDA = useCallback(async (seeds: (Buffer | Uint8Array)[]) => {
    return await PublicKey.findProgramAddress(seeds, PROGRAM_ID);
  }, []);

  // Check if current wallet is registry admin
  const checkRegistryAdmin = useCallback(async () => {
    if (!program || !publicKey) {
      setIsRegistryAdmin(false);
      return;
    }

    try {
      const [registryPDA] = await findPDA([Buffer.from('registry')]);
      const registryAccount = await program.account.registry.fetch(registryPDA) as any;
      setIsRegistryAdmin(registryAccount.authority.toString() === publicKey.toString());
    } catch (error) {
      // If registry doesn't exist yet, allow the current wallet to initialize it
      setIsRegistryAdmin(true);
    }
  }, [program, publicKey, findPDA]);

  // Check registry admin status when program becomes available
  useEffect(() => {
    if (program && publicKey) {
      checkRegistryAdmin();
    }
  }, [program, publicKey, checkRegistryAdmin]);

  // Initialize Registry
  const initializeRegistry = useCallback(async () => {
    if (!program || !publicKey) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    try {
      const [registryPDA] = await findPDA([Buffer.from('registry')]);

      // Check if registry already exists
      try {
        await program.account.registry.fetch(registryPDA);
        toast.success('Registry already exists!');
        setIsRegistryAdmin(true);
        return;
      } catch {
        // Registry doesn't exist, proceed with initialization
      }

      const tx = await program.methods
        .initialize()
        .accounts({
          registry: registryPDA,
          authority: publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      toast.success(`Registry initialized! TX: ${tx.slice(0, 8)}...`);
      setIsRegistryAdmin(true);
      return tx;
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [program, publicKey, findPDA]);

  /** Matches on-chain `mint_batch_nft`: new SPL mint + Metaplex metadata + batch PDA. */
  const mintBatchNft = useCallback(
    async (name: string, symbol: string, uri: string) => {
      if (!program || !publicKey) {
        throw new Error('Wallet not connected');
      }

      // Validate symbol length (Metaplex limit: 10 characters max)
      if (symbol.length > 10) {
        throw new Error('NFT symbol must be 10 characters or less');
      }

      setLoading(true);
      try {
        const mintKeypair = Keypair.generate();
        const nftMint = mintKeypair.publicKey;

        const [registryPDA] = await findPDA([Buffer.from('registry')]);
        const nftTokenAccount = await getAssociatedTokenAddress(nftMint, publicKey);
        const metadata = metadataPda(nftMint);
        const masterEdition = masterEditionPda(nftMint);
        const [batchData] = await PublicKey.findProgramAddress(
          [Buffer.from('batch'), nftMint.toBuffer()],
          PROGRAM_ID
        );

        const tx = await program.methods
          .mintBatchNft(name, symbol, uri)
          .accounts({
            owner: publicKey,
            nftMint,
            nftTokenAccount,
            metadata,
            masterEdition,
            batchData,
            registry: registryPDA,
            systemProgram: SystemProgram.programId,
            tokenProgram: TOKEN_PROGRAM_ID,
            associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
            tokenMetadataProgram: TOKEN_METADATA_PROGRAM_ID,
            rent: SYSVAR_RENT,
          })
          .signers([mintKeypair])
          .rpc();

        toast.success(
          `Batch NFT minted! Mint: ${nftMint.toBase58().slice(0, 8)}… TX: ${tx.slice(0, 8)}…`
        );
        return { tx, nftMint };
      } catch (error: any) {
        toast.error(`Error: ${error.message}`);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [program, publicKey, findPDA]
  );

  // Update Batch Data
  const updateBatchData = useCallback(async (
    batchNftMint: string,
    serialNumber: string,
    quantity: string,
    uri: string
  ) => {
    if (!program || !publicKey) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    try {
      const mintPk = new PublicKey(batchNftMint);
      const { batchPda: batchPDA } = await resolveBatchFromNftMint(
        connection,
        PROGRAM_ID,
        mintPk
      );

      const tx = await program.methods
        .updateBatchWithData(serialNumber, new BN(quantity), uri)
        .accounts({
          batch: batchPDA,
          owner: publicKey,
        })
        .rpc();

      toast.success(`Batch updated! TX: ${tx.slice(0, 8)}...`);
      return tx;
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [program, publicKey, connection]);

  // Link with Vintage
  const linkWithVintage = useCallback(async (batchNftMint: string, vintageId: string) => {
    if (!program || !publicKey) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    try {
      const mintPk = new PublicKey(batchNftMint);
      const { batchPda: batchPDA } = await resolveBatchFromNftMint(
        connection,
        PROGRAM_ID,
        mintPk
      );

      let tx: string;
      try {
        tx = await (program.methods as any)
          .linkWithVintage(new BN(vintageId))
          .accounts({
            batch: batchPDA,
            owner: publicKey,
          })
          .rpc();
      } catch (error: any) {
        const msg = String(error?.message || '');
        if (msg.toLowerCase().includes('already been processed')) {
          // Transaction landed — verify on-chain that vintage was set.
          try {
            const batchAccount = await program.account.batch.fetch(batchPDA) as any;
            const onChainId = batchAccount?.projectVintageId?.toString?.() ?? '0';
            if (onChainId !== '0' && onChainId === new BN(vintageId).toString()) {
              toast.success(`Batch already linked to vintage ${vintageId}!`);
              return 'already-processed';
            }
          } catch { /* fall through */ }
        }
        throw error;
      }

      toast.success(`Batch linked to vintage ${vintageId}! TX: ${tx.slice(0, 8)}...`);
      return tx;
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [program, publicKey, connection]);

  // Confirm Batch
  const confirmBatch = useCallback(async (batchNftMint: string) => {
    if (!program || !publicKey) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    try {
      const [registryPDA] = await findPDA([Buffer.from('registry')]);
      const mintPk = new PublicKey(batchNftMint);
      const { batchPda: batchPDA } = await resolveBatchFromNftMint(
        connection,
        PROGRAM_ID,
        mintPk
      );

      // Derive the deterministic SPL mint for this batch.
      // The same keypair is reused at fractionalize time.
      const splMintKeypair = deriveSplMintKeypair(mintPk);
      const splMint = splMintKeypair.publicKey;

      // Create & initialize the SPL mint if it doesn't exist yet.
      const splMintInfo = await connection.getAccountInfo(splMint);
      const preInstructions = [];
      const signers: Keypair[] = [];
      if (!splMintInfo) {
        const mintRent = await connection.getMinimumBalanceForRentExemption(MINT_SIZE);
        preInstructions.push(
          SystemProgram.createAccount({
            fromPubkey: publicKey,
            newAccountPubkey: splMint,
            lamports: mintRent,
            space: MINT_SIZE,
            programId: TOKEN_PROGRAM_ID,
          }),
          // Initialize with connected wallet as authority;
          // confirm_batch transfers it to the registry PDA.
          createInitializeMintInstruction(splMint, 9, publicKey, publicKey)
        );
        signers.push(splMintKeypair);
      }

      const tx = await program.methods
        .confirmBatch()
        .preInstructions(preInstructions)
        .accounts({
          registry: registryPDA,
          batch: batchPDA,
          splMint,
          owner: publicKey,
          verifier: publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers(signers)
        .rpc();

      toast.success(`Batch confirmed! TX: ${tx.slice(0, 8)}...`);
      return tx;
    } catch (error: any) {
      toast.error(`Error: ${error.message}`);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [program, publicKey, findPDA, connection]);

  // Reject Batch
  // NOTE: reject_batch is not present in the currently deployed IDL.
  // Rebuild + redeploy the program with the reject_batch instruction to enable this.
  const rejectBatch = useCallback(async (_batchNftMint: string, _comment: string) => {
    const err = new Error('reject_batch is not available in the currently deployed program. Rebuild and redeploy to enable it.');
    toast.error(err.message);
    throw err;
  }, []);

  // Fractionalize Batch
  const fractionalizeBatch = useCallback(async (
    batchNftMint: string,
    tokenName: string,
    tokenSymbol: string
  ) => {
    if (!program || !publicKey) {
      throw new Error('Wallet not connected');
    }

    setLoading(true);
    let batchPDA: PublicKey | null = null;
    try {
      const [registryPDA] = await findPDA([Buffer.from('registry')]);
      const mintPk = new PublicKey(batchNftMint);
      const { batchPda } = await resolveBatchFromNftMint(
        connection,
        PROGRAM_ID,
        mintPk
      );
      batchPDA = batchPda;

      // Reuse the same deterministic SPL mint that was created during confirmBatch.
      const splMint = deriveSplMintKeypair(mintPk).publicKey;
      const splMetadata = metadataPda(splMint);
      const userSplTokenAccount = await getAssociatedTokenAddress(splMint, publicKey);
      const nftTokenAccount = await resolveSourceNftTokenAccount(
        connection,
        mintPk,
        publicKey
      );

      // Create user ATA for SPL tokens if it doesn't exist yet.
      const ataInfo = await connection.getAccountInfo(userSplTokenAccount);
      const preInstructions = [];
      if (!ataInfo) {
        preInstructions.push(
          createAssociatedTokenAccountInstruction(
            publicKey,
            userSplTokenAccount,
            publicKey,
            splMint
          )
        );
      }

      const tx = await program.methods
        .fractionalizeBatch(tokenName, tokenSymbol)
        .preInstructions(preInstructions)
        .accounts({
          owner: publicKey,
          registry: registryPDA,
          batch: batchPDA,
          nftMint: mintPk,
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

      toast.success(`Batch fractionalized! TX: ${tx.slice(0, 8)}...`);
      return tx;
    } catch (error: any) {
      const message = String(error?.message || '');
      const alreadyProcessed = message.toLowerCase().includes('already been processed');
      if (alreadyProcessed && batchPDA) {
        try {
          const batchAccount = await program.account.batch.fetch(batchPDA) as any;
          const isFractionalized =
            !!batchAccount?.status &&
            typeof batchAccount.status === 'object' &&
            ('fractionalized' in batchAccount.status || 'Fractionalized' in batchAccount.status);

          if (isFractionalized) {
            toast.success('Batch already fractionalized on-chain.');
            return 'already-processed';
          }
        } catch {
          // fall through to default error handling
        }
      }
      toast.error(`Error: ${error.message}`);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [program, publicKey, findPDA, connection]);

  /** `batchNftMint` is the batch NFT mint pubkey (base58). Batch PDA resolves from mint. */
  const queryBatchInfo = useCallback(async (batchNftMint: string): Promise<Batch> => {
    if (!program) {
      throw new Error('Program not initialized');
    }

    try {
      const mintPk = new PublicKey(batchNftMint);
      const { batchPda: batchPDA } = await resolveBatchFromNftMint(
        connection,
        PROGRAM_ID,
        mintPk
      );

      const batchAccount = await program.account.batch.fetch(batchPDA) as any;

      let status = BatchStatus.Pending;
      if (batchAccount.status && typeof batchAccount.status === 'object') {
        if ('pending' in batchAccount.status) status = BatchStatus.Pending;
        else if ('confirmed' in batchAccount.status) status = BatchStatus.Confirmed;
        else if ('fractionalized' in batchAccount.status) status = BatchStatus.Fractionalized;
        else {
          const statusKeys = Object.keys(batchAccount.status);
          if (statusKeys.length > 0) {
            const statusKey = statusKeys[0].toLowerCase();
            switch (statusKey) {
              case 'pending':
                status = BatchStatus.Pending;
                break;
              case 'confirmed':
                status = BatchStatus.Confirmed;
                break;
              case 'fractionalized':
                status = BatchStatus.Fractionalized;
                break;
              default:
                status = BatchStatus.Pending;
            }
          }
        }
      }

      return {
        nftMint: batchAccount.nftMint as PublicKey,
        tokenId: batchAccount.tokenId as BN,
        owner: batchAccount.owner as PublicKey,
        status,
        quantity: batchAccount.quantity as BN,
        serialNumber: (batchAccount.serialNumber as string) || '',
        projectVintageId: (batchAccount.projectVintageId as BN) || new BN(0),
        uri: (batchAccount.uri as string) || '',
      };
    } catch (error: any) {
      const errorMessage = error.message || 'Unknown error';
      toast.error(`Error: Batch not found or ${errorMessage}`);
      throw error;
    }
  }, [program, connection]);

  return {
    program,
    isRegistryAdmin,
    loading,
    checkRegistryAdmin,
    initializeRegistry,
    mintBatchNft,
    updateBatchData,
    linkWithVintage,
    confirmBatch,
    rejectBatch,
    fractionalizeBatch,
    queryBatchInfo,
  };
};
