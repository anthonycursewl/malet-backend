/*
  Warnings:

  - You are about to alter the column `currency` on the `accounts` table. The data in that column could be lost. The data in that column will be cast from `VarChar(255)` to `VarChar(10)`.
  - A unique constraint covering the columns `[index_id]` on the table `transactions` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "accounts" ALTER COLUMN "currency" SET DATA TYPE VARCHAR(10);

-- AlterTable
ALTER TABLE "transactions" ADD COLUMN     "index_id" BIGINT;

-- CreateIndex
CREATE UNIQUE INDEX "transactions_index_id_key" ON "transactions"("index_id");

-- CreateIndex
CREATE INDEX "transactions_index_id_idx" ON "transactions"("index_id");
