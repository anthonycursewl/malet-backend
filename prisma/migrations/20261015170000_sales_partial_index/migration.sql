-- Índice parcial para los reportes: excluye las ventas eliminadas, así el
-- planner usa un índice más pequeño para /summary y /series.
CREATE INDEX "store_sales_active_store_sold_at_idx"
  ON "store_sales"("store_id", "sold_at")
  WHERE "deleted_at" IS NULL;
