import TransactionStockTemplate from './TransactionStockTemplate';
import { TRANSACTION_STOCK_KEYS } from '../../../api/services/transactionStockService';
import { ENDPOINTS } from '../../../constants/endpoints';
import { SkuLink } from '../../../hooks/useSkuModalAction';

const outMemoProductColumns = [
  { title: 'Parent SKU', dataIndex: 'parent_sku', key: 'parent_sku', width: 120, render: (_, row) => (row.parent_sku ? <SkuLink sku={row.parent_sku} record={row} /> : '-') },
  { title: 'SKU', dataIndex: 'sku', key: 'sku', width: 120, render: (text, record) => <SkuLink sku={text} record={record} /> },
  { title: 'D. No.', dataIndex: 'diamond_no', key: 'diamond_no', width: 100 },
  { title: 'Mfg. Code', dataIndex: 'mfg_code', key: 'mfg_code', width: 110 },
  { title: 'Pcs', dataIndex: 'polish_pcs', key: 'polish_pcs', width: 70, align: 'center' },
  { title: 'Carat', dataIndex: 'polish_carat', key: 'polish_carat', width: 90, align: 'center' },
  { title: 'Cost', dataIndex: 'cost', key: 'cost', width: 90, align: 'right' },
  { title: 'Price', dataIndex: 'sell_price', key: 'sell_price', width: 90, align: 'right', render: (v, row) => v || row.price },
  { title: 'Amount', dataIndex: 'sell_amount', key: 'sell_amount', width: 100, align: 'right', render: (v, row) => v || row.amount },
  { title: 'Lab', dataIndex: 'lab', key: 'lab', width: 80 },
  { title: 'LOC', dataIndex: 'location', key: 'location', width: 80 },
  { title: 'Remark', dataIndex: 'remark', key: 'remark', width: 120, ellipsis: true },
];

const OutMemoStock = () => (
  <TransactionStockTemplate
    title="Out Memo Stock"
    invoiceTitle="Out Memo Invoice"
    queryKey={TRANSACTION_STOCK_KEYS.outMemo}
    listEndpoint={ENDPOINTS.transactionStock.outward.list}
    stockType="memo"
    deleteEndpoint={ENDPOINTS.transactionStock.outward.delete}
    entryPath="/transaction/out-memo/entry"
    infiniteScroll
    productColumns={outMemoProductColumns}
    typeFilterOptions={[
      { value: 'memo', label: 'Memo' },
    ]}
    actions={{
      showReturn: true,
      showMemoToSale: true,
      showToConsign: true,
      showPrint: true,
      showDelete: true,
      showEdit: true,
      returnEndpoint: ENDPOINTS.transactionStock.outward.return,
      memoToSaleEndpoint: ENDPOINTS.transactionStock.outward.memoToSale,
      toExportEndpoint: ENDPOINTS.transactionStock.outward.toExport,
      printType: 'memo',
    }}
  />
);

export default OutMemoStock;
