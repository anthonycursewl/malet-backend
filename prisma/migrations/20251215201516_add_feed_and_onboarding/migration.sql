-- CreateTable
CREATE TABLE "interest_category" (
    "id" VARCHAR(255) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "description" VARCHAR(500),
    "icon" VARCHAR(50),
    "color" VARCHAR(20),
    "order" INTEGER NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interest_category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_interest" (
    "id" VARCHAR(255) NOT NULL,
    "user_id" VARCHAR(255) NOT NULL,
    "category_id" VARCHAR(255) NOT NULL,
    "weight" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "source" VARCHAR(50) NOT NULL DEFAULT 'onboarding',
    "created_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_interest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "community_interest" (
    "community_id" VARCHAR(255) NOT NULL,
    "category_id" VARCHAR(255) NOT NULL,
    "relevance" DOUBLE PRECISION NOT NULL DEFAULT 1.0,

    CONSTRAINT "community_interest_pkey" PRIMARY KEY ("community_id","category_id")
);

-- CreateTable
CREATE TABLE "user_onboarding" (
    "id" VARCHAR(255) NOT NULL,
    "user_id" VARCHAR(255) NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "step_interests" BOOLEAN NOT NULL DEFAULT false,
    "step_communities" BOOLEAN NOT NULL DEFAULT false,
    "step_profile" BOOLEAN NOT NULL DEFAULT false,
    "skipped" BOOLEAN NOT NULL DEFAULT false,
    "completed_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_onboarding_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_interaction" (
    "id" VARCHAR(255) NOT NULL,
    "user_id" VARCHAR(255) NOT NULL,
    "community_id" VARCHAR(255) NOT NULL,
    "interaction" VARCHAR(50) NOT NULL,
    "metadata" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_interaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_community_score" (
    "user_id" VARCHAR(255) NOT NULL,
    "community_id" VARCHAR(255) NOT NULL,
    "score" DOUBLE PRECISION NOT NULL,
    "interest_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "popularity_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "freshness_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "engagement_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "reasons" TEXT,
    "calculated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "user_community_score_pkey" PRIMARY KEY ("user_id","community_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "interest_category_slug_key" ON "interest_category"("slug");

-- CreateIndex
CREATE INDEX "interest_category_is_active_idx" ON "interest_category"("is_active");

-- CreateIndex
CREATE INDEX "interest_category_order_idx" ON "interest_category"("order");

-- CreateIndex
CREATE INDEX "user_interest_user_id_idx" ON "user_interest"("user_id");

-- CreateIndex
CREATE INDEX "user_interest_category_id_idx" ON "user_interest"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_interest_user_id_category_id_key" ON "user_interest"("user_id", "category_id");

-- CreateIndex
CREATE INDEX "community_interest_category_id_idx" ON "community_interest"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_onboarding_user_id_key" ON "user_onboarding"("user_id");

-- CreateIndex
CREATE INDEX "user_interaction_user_id_idx" ON "user_interaction"("user_id");

-- CreateIndex
CREATE INDEX "user_interaction_community_id_idx" ON "user_interaction"("community_id");

-- CreateIndex
CREATE INDEX "user_interaction_interaction_idx" ON "user_interaction"("interaction");

-- CreateIndex
CREATE INDEX "user_interaction_created_at_idx" ON "user_interaction"("created_at");

-- CreateIndex
CREATE INDEX "user_community_score_score_idx" ON "user_community_score"("score");

-- CreateIndex
CREATE INDEX "user_community_score_calculated_at_idx" ON "user_community_score"("calculated_at");

-- CreateIndex
CREATE INDEX "community_member_count_idx" ON "community"("member_count");

-- AddForeignKey
ALTER TABLE "user_interest" ADD CONSTRAINT "user_interest_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_interest" ADD CONSTRAINT "user_interest_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "interest_category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_interest" ADD CONSTRAINT "community_interest_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "community_interest" ADD CONSTRAINT "community_interest_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "interest_category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_onboarding" ADD CONSTRAINT "user_onboarding_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_interaction" ADD CONSTRAINT "user_interaction_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_interaction" ADD CONSTRAINT "user_interaction_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "community"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_community_score" ADD CONSTRAINT "user_community_score_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_community_score" ADD CONSTRAINT "user_community_score_community_id_fkey" FOREIGN KEY ("community_id") REFERENCES "community"("id") ON DELETE CASCADE ON UPDATE CASCADE;
