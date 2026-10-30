import React from 'react';
import TransactionStockTemplate from '../transaction/stock/TransactionStockTemplate';
import { ENDPOINTS } from '../../api/endpoints';
import { SkuLink } from '../../hooks/useSkuModalAction';

const inMemoProductColumns = [
  { title: 'SKU', dataIndex: 'sku', key: 'sku', width: 120, render: (text, record) => <SkuLink sku={text} record={record} /> },
  { title: 'D. No.', dataIndex: 'diamond_no', key: 'diamond_no', width: 100 },
  { title: 'Mfg. Code', dataIndex: 'mfg_code', key: 'mfg_code', width: 110 },
  { title: 'Pcs', dataIndex: 'polish_pcs', key: 'polish_pcs', width: 70, align: 'center' },
  { title: 'Carat', dataIndex: 'polish_carat', key: 'polish_carat', width: 90, align: 'center' },
  { title: 'Cost', dataIndex: 'cost', key: 'cost', width: 90, align: 'right', render: (v) => v || '-' },
  { title: 'Price', dataIndex: 'price', key: 'price', width: 90, align: 'right', render: (v) => v || '-' },
  { title: 'Amount', dataIndex: 'amount', key: 'amount', width: 100, align: 'right', render: (v) => v || 0 },
  { title: 'Lab', dataIndex: 'lab', key: 'lab', width: 80 },
  { title: 'LOC', dataIndex: 'location', key: 'location', width: 80 },
  { title: 'Remark', dataIndex: 'remark', key: 'remark', width: 650, ellipsis: true },
];

const InterTransferInMemoStock = () => (
  <TransactionStockTemplate
    title="Inter Transfer In Memo"
    invoiceTitle="Transfer In Memo Note"
    queryKey="INTER_TRANSFER_IN_MEMO"
    listEndpoint={ENDPOINTS.transactionStock.inward.list}
    stockType="inter_memo"
    listPayload={{ stockType: 'inter_memo' }}
    deleteEndpoint={ENDPOINTS.transactionStock.inward.delete}
    infiniteScroll
    productColumns={inMemoProductColumns}
    actions={{
      showReturn: true,
      showMemoToPurchase: true,
      showEdit: true,
      showPrint: true,
      showDelete: true,
      allowAddProductInEdit: false,
      returnEndpoint: ENDPOINTS.transactionStock.inward.return,
      memoToPurchaseEndpoint: ENDPOINTS.transactionStock.inward.memoToPurchase,
      editGetEndpoint: ENDPOINTS.inward.getById,
      editSaveEndpoint: ENDPOINTS.inward.update,
      printType: 'purchase',
    }}
  />
);

export default InterTransferInMemoStock;
