import TransactionStockTemplate, { defaultProductColumns } from './TransactionStockTemplate';
import { TRANSACTION_STOCK_KEYS } from '../../../api/services/transactionStockService';
import { ENDPOINTS } from '../../../api/endpoints';
import styles from '../../../assets/scss/pages/outward.module.scss';

const inMemoProductColumns = defaultProductColumns.map((col) =>
  col.key === 'sku'
    ? { ...col, className: styles.childSkuCell, ellipsis: false }
    : col
);

const InMemoStock = () => (
  <TransactionStockTemplate
    title="In Memo Stock"
    invoiceTitle="Good Receive Note"
    queryKey={TRANSACTION_STOCK_KEYS.inMemo}
    listEndpoint={ENDPOINTS.transactionStock.inward.list}
    deleteEndpoint={ENDPOINTS.transactionStock.inward.delete}
    entryPath="/transaction/in-memo/entry"
    infiniteScroll
    productColumns={inMemoProductColumns}
    typeFilterOptions={[
      { value: 'memo', label: 'Memo' },
      { value: 'consign', label: 'Consign' },
    ]}
    actions={{
      showReturn: true,
      showMemoToPurchase: true,
      showPrint: true,
      showDelete: true,
      showEdit: true,
      allowAddProductInEdit: false,
      returnEndpoint: ENDPOINTS.transactionStock.inward.return,
      memoToPurchaseEndpoint: ENDPOINTS.transactionStock.inward.memoToPurchase,
      editGetEndpoint: ENDPOINTS.inward.getById,
      printType: 'purchase',
    }}
  />
);

export default InMemoStock;
