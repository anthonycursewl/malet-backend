-- Optimiza las estadísticas por cliente (filtran store_id + customer_id).
CREATE INDEX "store_sales_store_id_customer_id_idx" ON "store_sales"("store_id", "customer_id");
