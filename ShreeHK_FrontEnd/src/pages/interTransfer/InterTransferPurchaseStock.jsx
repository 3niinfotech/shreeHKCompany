import React from 'react';
import TransactionStockTemplate from '../transaction/stock/TransactionStockTemplate';
import { ENDPOINTS } from '../../api/endpoints';
import { SkuLink } from '../../hooks/useSkuModalAction';

const _purchaseProductColumns = [
  { title: 'SKU', dataIndex: 'sku', key: 'sku', width: 120, render: (text, record) => <SkuLink sku={text} record={record} /> },
  { title: 'D. No.', dataIndex: 'diamond_no', key: 'diamond_no', width: 100 },
  { title: 'Mfg. Code', dataIndex: 'mfg_code', key: 'mfg_code', width: 110 },
  { title: 'R.Pcs', dataIndex: 'rought_pcs', key: 'rought_pcs', width: 70, align: 'center' },
  { title: 'R.Carat', dataIndex: 'rought_carat', key: 'rought_carat', width: 90, align: 'center' },
  { title: 'P.Pcs', dataIndex: 'polish_pcs', key: 'polish_pcs', width: 70, align: 'center' },
  { title: 'P.Carat', dataIndex: 'polish_carat', key: 'polish_carat', width: 90, align: 'center' },
  { title: 'Cost', dataIndex: 'cost', key: 'cost', width: 90, align: 'right' },
  { title: 'Price', dataIndex: 'purchase_price', key: 'purchase_price', width: 90, align: 'right', render: (v, row) => v || row.price },
  { title: 'Amount', dataIndex: 'purchase_amount', key: 'purchase_amount', width: 100, align: 'right', render: (v, row) => v || row.amount },
  { title: 'Lab', dataIndex: 'lab', key: 'lab', width: 80 },
  { title: 'LOC', dataIndex: 'location', key: 'location', width: 80 },
];

const InterTransferPurchaseStock = () => (
  <TransactionStockTemplate
    title="Inter Transfer Purchase"
    invoiceTitle="Transfer Purchase Note"
    queryKey="INTER_TRANSFER_PURCHASE"
    listEndpoint={ENDPOINTS.transactionStock.purchase.list}
    stockType="inter_transfer"
    listPayload={{ stockType: 'inter_transfer' }}
    deleteEndpoint={ENDPOINTS.transactionStock.inward.delete}
    infiniteScroll
    productColumns={_purchaseProductColumns}
    actions={{
      showEdit: true,
      showPrint: true,
      showDelete: true,
      allowAddProductInEdit: false,
      editGetEndpoint: ENDPOINTS.inward.getById,
      editSaveEndpoint: ENDPOINTS.inward.update,
      printType: 'purchase',
    }}
  />
);

export default InterTransferPurchaseStock;
