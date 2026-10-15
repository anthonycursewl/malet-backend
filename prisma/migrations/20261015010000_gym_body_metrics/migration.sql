-- CreateTable
CREATE TABLE "gym_body_metrics" (
    "id" VARCHAR(255) NOT NULL,
    "user_id" VARCHAR(255) NOT NULL,
    "date" DATE NOT NULL,
    "weight_kg" DECIMAL(6,2),
    "body_fat_pct" DECIMAL(5,2),
    "muscle_mass_kg" DECIMAL(6,2),
    "height_cm" DECIMAL(5,2),
    "measurements" JSONB,
    "notes" VARCHAR(1000),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "gym_body_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "gym_body_metrics_deleted_at_idx" ON "gym_body_metrics"("deleted_at");

-- CreateIndex
CREATE UNIQUE INDEX "gym_body_metrics_user_id_date_key" ON "gym_body_metrics"("user_id", "date");

-- AddForeignKey
ALTER TABLE "gym_body_metrics" ADD CONSTRAINT "gym_body_metrics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

