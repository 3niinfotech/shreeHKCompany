import TransactionStockTemplate from '../transaction/stock/TransactionStockTemplate';
import { ENDPOINTS } from '../../api/endpoints';
import { SkuLink } from '../../hooks/useSkuModalAction';

const saleProductColumns = [
  { title: 'Parent SKU', dataIndex: 'parent_sku', key: 'parent_sku', width: 120, render: () => '-' },
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
];

const InterTransferSaleStock = () => (
  <TransactionStockTemplate
    title="Inter Transfer Sale"
    invoiceTitle="Transfer Sale Invoice"
    queryKey="INTER_TRANSFER_SALE"
    listEndpoint={ENDPOINTS.transactionStock.outward.list}
    stockType="inter_transfer"
    deleteEndpoint={ENDPOINTS.transactionStock.outward.delete}
    infiniteScroll
    productColumns={saleProductColumns}
    actions={{
      showReturn: true,
      returnBtnText: 'Sale Return',
      returnVariant: 'sale',
      returnEndpoint: ENDPOINTS.transactionStock.outward.return,
      showEdit: true,
      showPrint: true,
      showDelete: true,
      printType: 'sale',
    }}
  />
);

export default InterTransferSaleStock;
