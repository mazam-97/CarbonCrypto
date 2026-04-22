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

// Helper: Ensure BigInt conversion is safe for Postgres
function toBigIntU64(value: unknown): bigint {
  try {
    if (value === null || value === undefined) return BigInt(0);
    return BigInt(String(value));
  } catch {
    return BigInt(0);
  }
}

// --- Webhook Handlers (Separated Logic) ---

async function handleRetirement(tx: any, instruction: any, ixIndex: number) {
  const signature = tx.signature;
  const amountRaw = instruction.data?.amount;
  const note = String(instruction.data?.note || "");
  const user = tx.feePayer;

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
  const signature = tx.signature;
  const { name, symbol, uri } = instruction.data || {};
  
  console.log(`📦 [NEW BATCH] Minted: ${signature}`);

  return prisma.batchMintEvent.upsert({
    where: { signature_ixIndex: { signature, ixIndex } },
    create: { signature, ixIndex, name: String(name), symbol: String(symbol), uri: String(uri) },
    update: { name: String(name), symbol: String(symbol), uri: String(uri) },
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

app.listen(PORT, () => {
  console.log(`🚀 Carbon Rails Backend running on port ${PORT}`);
  console.log(`🔌 Cluster: DEVNET | Program: ${PROGRAM_ID}`);
});