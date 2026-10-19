const connection = require("../../connection.js");

const CREATE_TRANSFER_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS dai_company_transfer (
  id INT AUTO_INCREMENT PRIMARY KEY,
  transfer_no VARCHAR(50) NOT NULL,
  from_company_id INT NOT NULL,
  to_company_id INT NOT NULL,
  transfer_date DATE NOT NULL,
  from_party VARCHAR(255) NULL,
  to_party VARCHAR(255) NULL,
  source_outward_id INT NULL,
  source_invoice_no VARCHAR(100) NULL,
  target_inward_id INT NULL,
  target_invoice_no VARCHAR(100) NULL,
  total_pcs DECIMAL(12,2) DEFAULT 0,
  total_carat DECIMAL(12,4) DEFAULT 0,
  total_amount DECIMAL(15,2) DEFAULT 0,
  currency VARCHAR(10) DEFAULT 'USD',
  status ENUM('transferred', 'returned') DEFAULT 'transferred',
  return_date DATE NULL,
  notes TEXT NULL,
  created_by INT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_from_comp (from_company_id),
  INDEX idx_to_comp (to_company_id),
  INDEX idx_date (transfer_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

const CREATE_TRANSFER_ITEM_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS dai_company_transfer_item (
  id INT AUTO_INCREMENT PRIMARY KEY,
  transfer_id INT NOT NULL,
  source_product_id INT NOT NULL,
  target_product_id INT NULL,
  source_sku VARCHAR(100) NULL,
  sku VARCHAR(100) NOT NULL,
  pcs DECIMAL(12,2) DEFAULT 1,
  carat DECIMAL(12,4) DEFAULT 0,
  price DECIMAL(12,2) DEFAULT 0,
  amount DECIMAL(15,2) DEFAULT 0,
  status ENUM('transferred', 'returned') DEFAULT 'transferred',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_transfer_id (transfer_id),
  INDEX idx_sku (sku)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

async function ensureCompanyTransferSchema() {
  return new Promise((resolve, reject) => {
    connection.query(CREATE_TRANSFER_TABLE_SQL, (err1) => {
      if (err1) return reject(err1);
      connection.query(CREATE_TRANSFER_ITEM_TABLE_SQL, (err2) => {
        if (err2) return reject(err2);
        // Check if source_sku column exists
        connection.query("SHOW COLUMNS FROM dai_company_transfer_item LIKE 'source_sku'", (err3, cols) => {
          if (!err3 && (!cols || cols.length === 0)) {
            connection.query("ALTER TABLE dai_company_transfer_item ADD COLUMN source_sku VARCHAR(100) NULL AFTER target_product_id", () => {
              resolve(true);
            });
          } else {
            resolve(true);
          }
        });
      });
    });
  });
}

module.exports = { ensureCompanyTransferSchema };
