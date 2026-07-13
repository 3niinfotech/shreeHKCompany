import React from 'react';
import TransactionStockTemplate from './TransactionStockTemplate';
import { TRANSACTION_STOCK_KEYS } from '../../../api/services/transactionStockService';
import { ENDPOINTS } from '../../../constants/endpoints';

const saleProductColumns = [
  { title: 'Parent SKU', dataIndex: 'parent_sku', key: 'parent_sku', width: 120, render: () => '-' },
  { title: 'SKU', dataIndex: 'sku', key: 'sku', width: 120 },
  { title: 'D. No.', dataIndex: 'diamond_no', key: 'diamond_no', width: 100 },
  { title: 'Mfg. Code', dataIndex: 'mfg_code', key: 'mfg_code', width: 110 },
  { title: 'Pcs', dataIndex: 'polish_pcs', key: 'polish_pcs', width: 70, align: 'center' },
  { title: 'Carat', dataIndex: 'polish_carat', key: 'polish_carat', width: 90, align: 'center' },
  { title: 'Cost', dataIndex: 'cost', key: 'cost', width: 90, align: 'right' },
  { title: 'Price', dataIndex: 'sell_price', key: 'sell_price', width: 90, align: 'right', render: (v, row) => v || row.price },
  { title: 'Amount', dataIndex: 'sell_amount', key: 'sell_amount', width: 100, align: 'right', render: (v, row) => v || row.amount },
  { title: 'Lab', dataIndex: 'lab', key: 'lab', width: 80 },
  { title: 'LOC', dataIndex: 'location', key: 'location', width: 80 },
];

const SaleStock = () => (
  <TransactionStockTemplate
    title="Sale Stock"
    invoiceTitle="Sale Invoice"
    queryKey={TRANSACTION_STOCK_KEYS.sale}
    listEndpoint={ENDPOINTS.transactionStock.outward.list}
    stockType="sale"
    deleteEndpoint={ENDPOINTS.transactionStock.outward.delete}
    entryPath="/transaction/sale/entry"
    infiniteScroll
    productColumns={saleProductColumns}
    actions={{
      showPrint: true,
      showDelete: true,
      showEdit: true,
      showToExport: true,
      toExportEndpoint: ENDPOINTS.transactionStock.outward.toExport,
      printType: 'sale',
    }}
  />
);

export default SaleStock;
