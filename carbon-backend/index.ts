import dotenv from "dotenv";
// 1. CRITICAL: Load envs BEFORE any other imports use them
dotenv.config();

import type { Request, Response } from "express";
import express from "express";
import { createHelius } from "helius-sdk";
import cors from "cors";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const app = express();

// --- Configuration ---
const PORT = process.env.PORT || 3000;
const HELIUS_API_KEY = process.env.HELIUS_API_KEY || "";
const HELIUS_AUTH_SECRET = process.env.HELIUS_AUTH_SECRET || "";
const PROGRAM_ID = "F1pN8uizaEUJhc6t5SGaoyVDz8Tf29t9Z37jQCdhe7Kd";
const HELIUS_RPC_URL = `https://devnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

app.use(express.json());
app.use(cors());

// Initialize Helius with explicit devnet cluster
const helius = createHelius(HELIUS_API_KEY as any);

type IndexedBatchRow = {
  signature: string;
  ixIndex: number;
  walletAddress: string | null;
  name: string;
  symbol: string;
  uri: string;
  nftMint: string | null;
  slot: bigint | null;
  createdAt: Date;
};

type IndexedRetirementRow = {
  signature: string;
  ixIndex: number;
  walletAddress: string;
  amount: bigint;
  note: string;
  createdAt: Date;
};

// Helper: Ensure BigInt conversion is safe for Postgres
function toBigIntU64(value: unknown): bigint {
  try {
    if (value === null || value === undefined) return BigInt(0);
    return BigInt(String(value));
  } catch {
    return BigInt(0);
  }
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) return value;
  }
  return null;
}

function extractNftMint(tx: any, instruction: any): string | null {
  const fromInstruction = firstString(
    instruction?.accounts?.mint,
    instruction?.accounts?.nftMint,
    instruction?.accounts?.nft_mint,
    instruction?.data?.nftMint,
    instruction?.data?.mint,
    instruction?.data?.nft_mint
  );
  if (fromInstruction) return fromInstruction;

  const nftTransfer = Array.isArray(tx?.tokenTransfers)
    ? tx.tokenTransfers.find((transfer: any) => {
        const amount = Number(transfer?.tokenAmount ?? transfer?.rawTokenAmount?.tokenAmount ?? 0);
        const decimals = Number(transfer?.rawTokenAmount?.decimals ?? 0);
        return amount === 1 && decimals === 0 && typeof transfer?.mint === "string";
      })
    : null;

  return firstString(tx?.events?.nft?.mint, nftTransfer?.mint);
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function getEventData(candidate: unknown): Record<string, unknown> | null {
  const rec = asRecord(candidate);
  if (!rec) return null;

  const direct = asRecord(rec.data);
  if (direct) return direct;

  const nested = asRecord(rec.event);
  if (nested) {
    const nestedData = asRecord(nested.data);
    return nestedData ?? nested;
  }
  return rec;
}

function collectProgramEventCandidates(tx: any): unknown[] {
  const candidates: unknown[] = [];
  const roots = [tx?.events, tx?.programEvents, tx?.parsedEvents, tx];

  for (const root of roots) {
    const rec = asRecord(root);
    if (!rec) continue;
    for (const key of ["program", "programEvents", "events", "instructions"]) {
      const value = rec[key];
      if (Array.isArray(value)) candidates.push(...value);
    }
  }

  return candidates;
}

function findBatchMintedEventData(tx: any): Record<string, unknown> | null {
  const candidates = collectProgramEventCandidates(tx);
  for (const candidate of candidates) {
    const rec = asRecord(candidate);
    const name = String(rec?.name ?? rec?.eventType ?? rec?.type ?? "").toLowerCase();
    if (!name.includes("batch") || !name.includes("mint")) continue;
    const data = getEventData(candidate);
    if (!data) continue;
    if (data.name != null || data.symbol != null || data.uri != null || data.nft_mint != null || data.nftMint != null) {
      return data;
    }
  }
  return null;
}

function findRetirementEventData(tx: any): Record<string, unknown> | null {
  const candidates = collectProgramEventCandidates(tx);
  for (const candidate of candidates) {
    const rec = asRecord(candidate);
    const name = String(rec?.name ?? rec?.eventType ?? rec?.type ?? "").toLowerCase();
    if (!name.includes("retire")) continue;
    const data = getEventData(candidate);
    if (!data) continue;
    if (data.amount != null || data.total_retired != null || data.totalRetired != null || data.note != null) {
      return data;
    }
  }
  return null;
}

async function fetchMintMetadataFromDas(mint: string): Promise<{ name: string; symbol: string; uri: string } | null> {
  try {
    const response = await fetch(HELIUS_RPC_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        jsonrpc: "2.0",
        id: "carbon-rails-get-asset",
        method: "getAsset",
        params: { id: mint },
      }),
    });
    const body = (await response.json()) as any;
    const asset = body?.result;
    if (!asset) return null;

    const metadata = asset?.content?.metadata ?? {};
    return {
      name: String(metadata?.name ?? ""),
      symbol: String(metadata?.symbol ?? ""),
      uri: String(asset?.content?.json_uri ?? ""),
    };
  } catch (error) {
    console.warn("Failed to fetch DAS metadata for mint:", mint, error);
    return null;
  }
}

// --- Webhook Handlers (Separated Logic) ---

async function handleRetirement(tx: any, instruction: any, ixIndex: number) {
  const eventData = findRetirementEventData(tx);
  const signature = tx.signature;
  const amountRaw = eventData?.amount ?? instruction.data?.amount;
  const note = String(eventData?.note ?? instruction.data?.note ?? "");
  const user = firstString(eventData?.user, tx.feePayer, tx.signer) ?? "";

  console.log(`🌱 [RETIREMENT] ${user} | Amount: ${amountRaw}`);

  return prisma.retirementEvent.upsert({
    where: { signature_ixIndex: { signature, ixIndex } },
    create: {
      signature,
      ixIndex,
      walletAddress: user,
      amount: toBigIntU64(amountRaw),
      note,
    },
    update: { amount: toBigIntU64(amountRaw), note },
  });
}

async function handleBatchMint(tx: any, instruction: any, ixIndex: number) {
  const eventData = findBatchMintedEventData(tx);
  const signature = tx.signature;
  const { name, symbol, uri } = instruction.data || {};
  const walletAddress = firstString(
    eventData?.owner,
    instruction?.accounts?.payer,
    tx?.feePayer,
    tx?.signer
  );
  console.log(`eventData ${eventData}`);
  const nftMint = extractNftMint(tx, instruction);
  const slot = tx?.slot != null ? toBigIntU64(tx.slot) : null;
  const metadataFromDas =
    nftMint && (!name || !symbol || !uri) ? await fetchMintMetadataFromDas(nftMint) : null;
  const resolvedName = String(eventData?.name ?? name ?? metadataFromDas?.name ?? "");
  const resolvedSymbol = String(eventData?.symbol ?? symbol ?? metadataFromDas?.symbol ?? "");
  const resolvedUri = String(eventData?.uri ?? uri ?? metadataFromDas?.uri ?? "");
  const resolvedMint =
    firstString(eventData?.nft_mint, eventData?.nftMint, instruction?.accounts?.mint, nftMint) ?? null;

  console.log(
    `📦 [NEW BATCH] ${signature} mint=${resolvedMint ?? "unknown"} name=${resolvedName} symbol=${resolvedSymbol}`
  );
  console.log(`📦 [NEW BATCH] Minted: ${signature}`);

  return (prisma.batchMintEvent as any).upsert({
    where: { signature_ixIndex: { signature, ixIndex } },
    create: {
      signature,
      ixIndex,
      walletAddress,
      name: resolvedName,
      symbol: resolvedSymbol,
      uri: resolvedUri,
      nftMint: resolvedMint,
      slot,
    },
    update: {
      walletAddress,
      name: resolvedName,
      symbol: resolvedSymbol,
      uri: resolvedUri,
      nftMint: resolvedMint,
      slot,
    },
  });
}

// --- ROUTES ---

/**
 * Helius Webhook Receiver
 */
// Define the route clearly
app.post("/webhooks", async (req: Request, res: Response) => {
    const authHeader = req.headers["authorization"];
    
    // 1. Log to verify connectivity
    console.log(`📡 Webhook hit! Auth: ${authHeader}`);
  
    if (authHeader !== HELIUS_AUTH_SECRET) {
      console.error("❌ Auth mismatch!");
      return res.status(401).json({ error: "Unauthorized" });
    }
  
    const transactions = req.body;
    console.log(`request ${JSON.stringify(transactions)}`)
    if (!Array.isArray(transactions)) return res.sendStatus(400);
  
    try {
      for (const tx of transactions) {
        // 2. Identify the transaction type from the Helius payload
        const isMint = tx.type === "TOKEN_MINT";
        
        const relevantIxs = (tx.instructions || []).filter(
          (ix: any) => ix.programId === PROGRAM_ID
        );
  
        for (const [ixIndex, ix] of relevantIxs.entries()) {
          // Fallback: If name is missing, use the transaction type
          if (ix.name === "retire_pool_tokens") {
              await handleRetirement(tx, ix, ixIndex);
          } else if (ix.name === "mint_batch_nft" || isMint) {
              console.log("✅ Match found: Minting batch...");
              await handleBatchMint(tx, ix, ixIndex);
          }
        }
      }
      res.status(200).send("OK");
    } catch (err) {
      console.error("🔥 Processing error:", err);
      res.status(500).send("Internal Error");
    }
  });

/**
 * Fetch User Assets (DAS API)
 * Using a direct fetch fallback to bypass SDK 401 issues if they persist
 */
app.get("/api/user-assets/:wallet", async (req: Request, res: Response) => {
  const { wallet } = req.params;

  try {
    // Attempt using the SDK first
    const assets = await helius.getAssetsByOwner({
      ownerAddress: wallet as any,
      page: 1,
      limit: 100,
      sortBy: { sortBy: "created", sortDirection: "desc" },
    });
    return res.json(assets);

  } catch (error) {
    console.warn("SDK failed, falling back to direct RPC call...");
    
    try {
      const response = await fetch(HELIUS_RPC_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 'carbon-rails-fetch',
          method: 'getAssetsByOwner',
          params: {
            ownerAddress: wallet,
            page: 1,
            limit: 100,
            displayOptions: { showFungible: true } // Helpful for Carbon Pools
          },
        }),
      });

      const result = await response.json() as any;
      if (result.error) throw new Error(result.error.message);
      
      res.json(result.result);
    } catch (fallbackError: any) {
      console.error("DAS API Complete Failure:", fallbackError.message);
      res.status(500).json({ error: "Could not fetch assets from Solana" });
    }
  }
});

app.get("/api/indexer/batches", async (req: Request, res: Response) => {
  const wallet = typeof req.query.wallet === "string" ? req.query.wallet : undefined;
  const nftMint = typeof req.query.nftMint === "string" ? req.query.nftMint : undefined;
  const takeRaw = Number(req.query.limit ?? 50);
  const take = Number.isFinite(takeRaw) ? Math.max(1, Math.min(200, Math.trunc(takeRaw))) : 50;

  try {
    const rows = (await (prisma.batchMintEvent as any).findMany({
      where: {
        walletAddress: wallet,
        nftMint,
      },
      orderBy: { createdAt: "desc" },
      take,
    })) as IndexedBatchRow[];

    return res.json({
      count: rows.length,
      items: rows.map((row) => ({
        signature: row.signature,
        ixIndex: row.ixIndex,
        walletAddress: row.walletAddress,
        name: row.name,
        symbol: row.symbol,
        uri: row.uri,
        nftMint: row.nftMint,
        slot: row.slot?.toString() ?? null,
        createdAt: row.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Indexer batches query failed:", error);
    return res.status(500).json({ error: "Failed to fetch indexed batches" });
  }
});

app.get("/api/indexer/wallet-holdings/:wallet", async (req: Request, res: Response) => {
  const wallet = String(req.params.wallet || "").trim();
  if (!wallet) return res.status(400).json({ error: "Wallet is required" });

  try {
    const [batchRows, retirementRows] = await Promise.all([
      (prisma.batchMintEvent as any).findMany({
        where: { walletAddress: wallet },
        orderBy: { createdAt: "desc" },
        take: 100,
      }) as Promise<IndexedBatchRow[]>,
      prisma.retirementEvent.findMany({
        where: { walletAddress: wallet },
        orderBy: { createdAt: "desc" },
        take: 100,
      }) as Promise<IndexedRetirementRow[]>,
    ]);

    const uniqueMints = new Set(
      batchRows.map((row) => row.nftMint).filter((mint): mint is string => Boolean(mint))
    );
    const totalRetiredRaw = retirementRows.reduce((acc, row) => acc + row.amount, BigInt(0));

    return res.json({
      wallet,
      summary: {
        mintedCount: batchRows.length,
        uniqueMintCount: uniqueMints.size,
        retirementsCount: retirementRows.length,
        totalRetiredRaw: totalRetiredRaw.toString(),
      },
      latestMints: batchRows.slice(0, 10).map((row) => ({
        signature: row.signature,
        ixIndex: row.ixIndex,
        nftMint: row.nftMint,
        name: row.name,
        symbol: row.symbol,
        uri: row.uri,
        createdAt: row.createdAt.toISOString(),
      })),
      latestRetirements: retirementRows.slice(0, 10).map((row) => ({
        signature: row.signature,
        ixIndex: row.ixIndex,
        amountRaw: row.amount.toString(),
        note: row.note,
        createdAt: row.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Wallet holdings query failed:", error);
    return res.status(500).json({ error: "Failed to fetch wallet holdings" });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Carbon Rails Backend running on port ${PORT}`);
  console.log(`🔌 Cluster: DEVNET | Program: ${PROGRAM_ID}`);
});