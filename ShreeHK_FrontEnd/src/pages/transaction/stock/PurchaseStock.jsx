import TransactionStockTemplate, { defaultProductColumns } from './TransactionStockTemplate';
import { TRANSACTION_STOCK_KEYS } from '../../../api/services/transactionStockService';
import { ENDPOINTS } from '../../../api/endpoints';

const PurchaseStock = () => (
  <TransactionStockTemplate
    title="Purchase"
    invoiceTitle="Purchase Note"
    queryKey={TRANSACTION_STOCK_KEYS.purchase}
    listEndpoint={ENDPOINTS.transactionStock.purchase.list}
    deleteEndpoint={ENDPOINTS.transactionStock.inward.delete}
    entryPath="/transaction/purchase/entry"
    infiniteScroll
    productColumns={defaultProductColumns}
    typeFilterOptions={[
      { value: 'purchase', label: 'Purchase' },
      { value: 'import', label: 'Import' },
      { value: 'consign', label: 'Consign' },
    ]}
    actions={{
      showPrint: true,
      showDelete: true,
      showEdit: true,
      allowAddProductInEdit: false,
      showToPurchase: true,
      showToImport: true,
      toggleEndpoint: ENDPOINTS.transactionStock.purchase.toggleType,
      editGetEndpoint: ENDPOINTS.inward.getById,
      printType: 'purchase',
    }}
  />
);

export default PurchaseStock;
