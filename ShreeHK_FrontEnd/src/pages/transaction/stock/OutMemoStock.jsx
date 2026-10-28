import TransactionStockTemplate, { defaultProductColumns } from './TransactionStockTemplate';
import { TRANSACTION_STOCK_KEYS } from '../../../api/services/transactionStockService';
import { ENDPOINTS } from '../../../api/endpoints';

const OutMemoStock = () => (
  <TransactionStockTemplate
    title="Out Memo"
    invoiceTitle="Out Memo Invoice"
    queryKey={TRANSACTION_STOCK_KEYS.outMemo}
    listEndpoint={ENDPOINTS.transactionStock.outward.list}
    stockType="memo"
    deleteEndpoint={ENDPOINTS.transactionStock.outward.delete}
    infiniteScroll
    showSkuFilter
    productColumns={defaultProductColumns}
    typeFilterOptions={[
      { value: 'memo', label: 'Memo' },
      { value: 'consign', label: 'Consign' },
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
      typeWidth: 110,
      referenceWidth: 80,
      entryWidth: 80,
      partyWidth: 160,
      invoiceWidth: 80,
      dateWidth: 100,
      operationsWidth: 230,
    }}
  />
);

export default OutMemoStock;
