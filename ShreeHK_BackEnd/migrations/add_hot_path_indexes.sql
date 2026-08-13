-- Hot-path indexes for inventory / outward list filters.
-- Additive only: does not change query results.
-- Take a DB backup/snapshot before running this file.
-- Safe to re-run: skips indexes that already exist.

DELIMITER $$

DROP PROCEDURE IF EXISTS shreehk_add_index_if_missing $$
CREATE PROCEDURE shreehk_add_index_if_missing(
  IN p_table VARCHAR(64),
  IN p_index VARCHAR(64),
  IN p_columns VARCHAR(255)
)
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.statistics
    WHERE table_schema = DATABASE()
      AND table_name = p_table
      AND index_name = p_index
  ) THEN
    SET @ddl = CONCAT('CREATE INDEX `', p_index, '` ON `', p_table, '` (', p_columns, ')');
    PREPARE stmt FROM @ddl;
    EXECUTE stmt;
    DEALLOCATE PREPARE stmt;
  END IF;
END $$

DELIMITER ;

CALL shreehk_add_index_if_missing('dai_product', 'idx_dai_product_company_vis', 'company, visibility, outward, hold');
CALL shreehk_add_index_if_missing('dai_product', 'idx_dai_product_sku', 'sku');
CALL shreehk_add_index_if_missing('dai_product', 'idx_dai_product_mfg_code', 'mfg_code');
CALL shreehk_add_index_if_missing('dai_product_value', 'idx_dai_product_value_product_id', 'product_id');
CALL shreehk_add_index_if_missing('dai_outward', 'idx_dai_outward_company_status', 'company, type, status, date');

DROP PROCEDURE IF EXISTS shreehk_add_index_if_missing;
