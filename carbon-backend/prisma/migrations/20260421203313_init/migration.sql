-- CreateTable
CREATE TABLE "RetirementEvent" (
    "id" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "ixIndex" INTEGER NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "amount" BIGINT NOT NULL,
    "note" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RetirementEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BatchMintEvent" (
    "id" TEXT NOT NULL,
    "signature" TEXT NOT NULL,
    "ixIndex" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "uri" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BatchMintEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RetirementEvent_walletAddress_idx" ON "RetirementEvent"("walletAddress");

-- CreateIndex
CREATE UNIQUE INDEX "RetirementEvent_signature_ixIndex_key" ON "RetirementEvent"("signature", "ixIndex");

-- CreateIndex
CREATE UNIQUE INDEX "BatchMintEvent_signature_ixIndex_key" ON "BatchMintEvent"("signature", "ixIndex");
