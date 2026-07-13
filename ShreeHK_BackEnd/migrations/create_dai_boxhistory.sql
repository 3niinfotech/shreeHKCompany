-- Optional: run on DB if box/parcel transfer history is needed.
-- Stone detail & transfer-history APIs work without this table (empty transfer list).

CREATE TABLE IF NOT EXISTS `dai_boxhistory` (
  `id` int NOT NULL AUTO_INCREMENT,
  `product_id` int DEFAULT NULL,
  `date` date DEFAULT NULL,
  `party` varchar(50) DEFAULT NULL,
  `description` text,
  `user` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_product_id` (`product_id`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1 COMMENT='Box/parcel transfer history per stone';
