-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('resident', 'collector');

-- CreateEnum
CREATE TYPE "CollectionStatus" AS ENUM ('scheduled', 'pending', 'assigned', 'in_service', 'completed', 'cancelled', 'integration_failed');

-- CreateEnum
CREATE TYPE "MaterialType" AS ENUM ('paper', 'plastic', 'glass', 'metal', 'electronics', 'other');

-- CreateEnum
CREATE TYPE "MaterialUnit" AS ENUM ('kg', 'units', 'bags');

-- CreateEnum
CREATE TYPE "CollectionPointKind" AS ENUM ('habitual', 'additional');

-- CreateEnum
CREATE TYPE "RewardTransactionKind" AS ENUM ('credit', 'debit');

-- CreateEnum
CREATE TYPE "RewardTransactionReason" AS ENUM ('collection_completed', 'reward_redeemed', 'adjustment');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuthSession" (
    "id" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "userId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuthSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Collector" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "ecorotaCollectorId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Collector_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionPoint" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "CollectionPointKind" NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CollectionPoint_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Collection" (
    "id" UUID NOT NULL,
    "residentId" UUID NOT NULL,
    "collectorId" UUID,
    "collectionPointId" UUID NOT NULL,
    "status" "CollectionStatus" NOT NULL,
    "scheduledAt" TIMESTAMP(3),
    "notes" TEXT,
    "externalReference" TEXT NOT NULL,
    "ecorotaRequestId" UUID,
    "dispatchLockedAt" TIMESTAMP(3),
    "nextAttemptAt" TIMESTAMP(3),
    "lastSyncedAt" TIMESTAMP(3),
    "integrationError" TEXT,
    "pointsAwarded" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Collection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CollectionMaterial" (
    "id" UUID NOT NULL,
    "collectionId" UUID NOT NULL,
    "type" "MaterialType" NOT NULL,
    "quantity" DECIMAL(12,3) NOT NULL,
    "unit" "MaterialUnit" NOT NULL,
    "description" TEXT,

    CONSTRAINT "CollectionMaterial_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Reward" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "pointsCost" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Reward_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RewardTransaction" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "collectionId" UUID,
    "kind" "RewardTransactionKind" NOT NULL,
    "amount" INTEGER NOT NULL,
    "reason" "RewardTransactionReason" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RewardTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AuthSession_tokenHash_key" ON "AuthSession"("tokenHash");

-- CreateIndex
CREATE UNIQUE INDEX "Collector_userId_key" ON "Collector"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Collector_ecorotaCollectorId_key" ON "Collector"("ecorotaCollectorId");

-- CreateIndex
CREATE UNIQUE INDEX "Collection_externalReference_key" ON "Collection"("externalReference");

-- CreateIndex
CREATE UNIQUE INDEX "Collection_ecorotaRequestId_key" ON "Collection"("ecorotaRequestId");

-- CreateIndex
CREATE INDEX "Collection_residentId_createdAt_id_idx" ON "Collection"("residentId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "Collection_status_scheduledAt_idx" ON "Collection"("status", "scheduledAt");

-- CreateIndex
CREATE INDEX "RewardTransaction_userId_createdAt_id_idx" ON "RewardTransaction"("userId", "createdAt", "id");

-- CreateIndex
CREATE UNIQUE INDEX "RewardTransaction_collectionId_reason_key" ON "RewardTransaction"("collectionId", "reason");

-- AddForeignKey
ALTER TABLE "AuthSession" ADD CONSTRAINT "AuthSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Collector" ADD CONSTRAINT "Collector_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_residentId_fkey" FOREIGN KEY ("residentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_collectorId_fkey" FOREIGN KEY ("collectorId") REFERENCES "Collector"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Collection" ADD CONSTRAINT "Collection_collectionPointId_fkey" FOREIGN KEY ("collectionPointId") REFERENCES "CollectionPoint"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CollectionMaterial" ADD CONSTRAINT "CollectionMaterial_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardTransaction" ADD CONSTRAINT "RewardTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RewardTransaction" ADD CONSTRAINT "RewardTransaction_collectionId_fkey" FOREIGN KEY ("collectionId") REFERENCES "Collection"("id") ON DELETE SET NULL ON UPDATE CASCADE;
