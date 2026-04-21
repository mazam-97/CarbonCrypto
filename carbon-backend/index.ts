import type { Request, Response } from "express";
import express from "express";
import { createHelius } from "helius-sdk";
import cors from "cors";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

dotenv.config();

const prisma = new PrismaClient();
const app = express();
app.use(express.json());
app.use(cors());

const HELIUS_API_KEY = process.env.HELIUS_API_KEY || "";
const HELIUS_AUTH_SECRET = process.env.HELIUS_AUTH_SECRET || "";
const PROGRAM_ID = "F1pN8uizaEUJhc6t5SGaoyVDz8Tf29t9Z37jQCdhe7Kd";

const helius = createHelius(HELIUS_API_KEY as any);

function toBigIntU64(value: unknown): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number" && Number.isFinite(value)) return BigInt(Math.trunc(value));
  if (typeof value === "string" && value.trim() !== "") return BigInt(value);
  return BigInt(String(value));
}

// --- HELIUS WEBHOOK ENDPOINT ---
app.post("/webhooks/helius", async (req: Request, res: Response) => {
  const authHeader = req.headers["authorization"];
  if (authHeader !== HELIUS_AUTH_SECRET) {
    return res.status(401).send("Unauthorized: Invalid Secret");
  }

  const transactions = req.body;
  if (!Array.isArray(transactions)) {
    return res.status(400).send("Expected a JSON array of transactions");
  }

  try {
    for (const tx of transactions) {
      const instructions = Array.isArray(tx.instructions) ? tx.instructions : [];
      const relevantIxs = instructions.filter((ix: { programId?: string }) => ix.programId === PROGRAM_ID);

      for (const [ixIndex, ix] of relevantIxs.entries()) {
        const instruction = ix as { name?: string; data?: Record<string, unknown> };
        const signature = String(tx.signature ?? "");

        if (instruction.name === "retire_pool_tokens") {
          const amountRaw = instruction.data?.amount;
          const note = instruction.data?.note != null ? String(instruction.data.note) : "";
          const user = String(tx.feePayer ?? "");

          console.log(`🌱 [RETIREMENT] User: ${user} | Amount: ${String(amountRaw)} | Note: ${note}`);

          await prisma.retirementEvent.upsert({
            where: {
              signature_ixIndex: { signature, ixIndex },
            },
            create: {
              signature,
              ixIndex,
              walletAddress: user,
              amount: toBigIntU64(amountRaw),
              note,
            },
            update: {
              walletAddress: user,
              amount: toBigIntU64(amountRaw),
              note,
            },
          });
        }

        if (instruction.name === "mint_batch_nft") {
          const name = instruction.data?.name != null ? String(instruction.data.name) : "";
          const symbol = instruction.data?.symbol != null ? String(instruction.data.symbol) : "";
          const uri = instruction.data?.uri != null ? String(instruction.data.uri) : "";

          console.log(`📦 [NEW BATCH] Minted: ${signature}`);

          await prisma.batchMintEvent.upsert({
            where: {
              signature_ixIndex: { signature, ixIndex },
            },
            create: {
              signature,
              ixIndex,
              name,
              symbol,
              uri,
            },
            update: { name, symbol, uri },
          });
        }
      }
    }

    res.status(200).send("OK");
  } catch (err) {
    console.error("Webhook persistence error:", err);
    res.status(500).send("Failed to persist indexed events");
  }
});

// --- API FOR FRONTEND ---
app.get("/api/user-assets/:wallet", async (req: Request, res: Response) => {
  try {
    const { wallet } = req.params;

    const assets = await helius.getAssetsByOwner({
      ownerAddress: wallet as any,
      page: 1,
      limit: 100,
      sortBy: { sortBy: "created", sortDirection: "desc" },
    });

    res.json(assets);
  } catch (error) {
    console.error("DAS API Error:", error);
    res.status(500).json({ error: "Failed to fetch assets from DAS API" });
  }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`🚀 Carbon Rails Backend running on port ${PORT}`));
