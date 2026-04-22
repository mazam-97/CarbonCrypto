-- AlterTable
ALTER TABLE "BatchMintEvent"
ADD COLUMN "walletAddress" TEXT,
ADD COLUMN "nftMint" TEXT,
ADD COLUMN "slot" BIGINT;

-- CreateIndex
CREATE INDEX "BatchMintEvent_walletAddress_idx" ON "BatchMintEvent"("walletAddress");

-- CreateIndex
CREATE INDEX "BatchMintEvent_nftMint_idx" ON "BatchMintEvent"("nftMint");
