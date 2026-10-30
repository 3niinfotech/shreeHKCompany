import TransactionStockTemplate, { defaultProductColumns } from './TransactionStockTemplate';
import { TRANSACTION_STOCK_KEYS } from '../../../api/services/transactionStockService';
import { ENDPOINTS } from '../../../api/endpoints';

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
    productColumns={defaultProductColumns}
    typeFilterOptions={[
      { value: 'sale', label: 'Sale' },
      { value: 'export', label: 'Export' },
    ]}
    actions={{
      showReturn: true,
      returnBtnText: 'Sale Return',
      returnVariant: 'sale',
      returnEndpoint: ENDPOINTS.transactionStock.outward.return,
      showPrint: true,
      showDelete: true,
      showEdit: true,
      showToExport: true,
      toExportEndpoint: ENDPOINTS.transactionStock.outward.toExport,
      printType: 'sale',
      typeWidth: 80,
      referenceWidth: 160,
    }}
  />
);

export default SaleStock;
