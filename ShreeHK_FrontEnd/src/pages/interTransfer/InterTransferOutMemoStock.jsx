import React from 'react';
import TransactionStockTemplate from '../transaction/stock/TransactionStockTemplate';
import { ENDPOINTS } from '../../api/endpoints';
import { SkuLink } from '../../hooks/useSkuModalAction';

const outMemoProductColumns = [
  { title: 'Sr No', key: 'srNo', width: 70, align: 'center', render: (_, __, index) => index + 1 },
  { title: 'Parent SKU', dataIndex: 'parent_sku', key: 'parent_sku', width: 120, render: (_, row) => (row.parent_sku ? <SkuLink sku={row.parent_sku} record={row} /> : '-') },
  { title: 'SKU', dataIndex: 'sku', key: 'sku', width: 120, render: (text, record) => <SkuLink sku={text} record={record} /> },
  { title: 'Pcs', dataIndex: 'polish_pcs', key: 'polish_pcs', width: 60, align: 'center' },
  { title: 'Carat', dataIndex: 'polish_carat', key: 'polish_carat', width: 90, align: 'center' },
  { title: 'Lab', dataIndex: 'lab', key: 'lab', width: 80, render: (v) => v || '-' },
  { title: 'Certificate', dataIndex: 'report_no', key: 'report_no', width: 130, render: (v, row) => v || row.certificate || '-' },
  { title: 'Location', dataIndex: 'location', key: 'location', width: 100, render: (v) => v || '-' },
  { title: 'Price', dataIndex: 'sell_price', key: 'sell_price', width: 90, align: 'right', render: (v, row) => v || row.price },
  { title: 'Amount', dataIndex: 'sell_amount', key: 'sell_amount', width: 100, align: 'right', render: (v, row) => v || row.amount },
  { title: 'Label', dataIndex: 'label', key: 'label', width: 400, ellipsis: true, render: (v) => v || '-' },
  { title: 'Remark', dataIndex: 'remark', key: 'remark', width: 650, ellipsis: true, render: (v) => v || '-' },
];

const InterTransferOutMemoStock = () => (
  <TransactionStockTemplate
    title="Inter Transfer Out Memo"
    invoiceTitle="Transfer Out Memo Invoice"
    queryKey="INTER_TRANSFER_OUT_MEMO"
    listEndpoint={ENDPOINTS.transactionStock.outward.list}
    stockType="inter_memo"
    listPayload={{ stockType: 'inter_memo' }}
    deleteEndpoint={ENDPOINTS.transactionStock.outward.delete}
    infiniteScroll
    showSkuFilter
    productColumns={outMemoProductColumns}
    actions={{
      showReturn: true,
      showMemoToSale: true,
      showPrint: true,
      showDelete: true,
      showEdit: true,
      returnEndpoint: ENDPOINTS.transactionStock.outward.return,
      memoToSaleEndpoint: ENDPOINTS.transactionStock.outward.memoToSale,
      printType: 'memo',
    }}
  />
);

export default InterTransferOutMemoStock;
