-- AlterTable
ALTER TABLE "user" ADD COLUMN     "verification_type_id" VARCHAR(255),
ADD COLUMN     "verified" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "verification_type" (
    "id" VARCHAR(255) NOT NULL,
    "name" VARCHAR(255) NOT NULL,

    CONSTRAINT "verification_type_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "verification_type_id" FOREIGN KEY ("verification_type_id") REFERENCES "verification_type"("id") ON DELETE CASCADE ON UPDATE CASCADE;
