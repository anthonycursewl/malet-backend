/*
  Warnings:

  - You are about to drop the column `name` on the `verification_type` table. All the data in the column will be lost.
  - Added the required column `icon_url` to the `verification_type` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `verification_type` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "verification_type" DROP COLUMN "name",
ADD COLUMN     "icon_url" VARCHAR(500) NOT NULL,
ADD COLUMN     "type" VARCHAR(255) NOT NULL;
