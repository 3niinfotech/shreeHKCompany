import TransactionStockTemplate, { defaultProductColumns } from './TransactionStockTemplate';
import { TRANSACTION_STOCK_KEYS } from '../../../api/services/transactionStockService';
import { ENDPOINTS } from '../../../api/endpoints';

const GIAMemoStock = () => (
  <TransactionStockTemplate
    title="GIA Lab Stock"
    invoiceTitle="Consignment"
    queryKey={TRANSACTION_STOCK_KEYS.gia}
    listEndpoint={ENDPOINTS.transactionStock.gia.list}
    deleteEndpoint={ENDPOINTS.transactionStock.gia.delete}
    entryPath="/transaction/gia-memo/entry"
    infiniteScroll
    productColumns={defaultProductColumns}
    typeFilterOptions={[
      { value: 'lab', label: 'Lab' },
    ]}
    actions={{
      showReturn: true,
      showPrint: true,
      showDelete: true,
      showEdit: true,
      giaReturn: true,
      returnEndpoint: ENDPOINTS.transactionStock.gia.return,
      printType: 'gia',
      typeWidth: 110,
      referenceWidth: 80,
      entryWidth: 80,
      partyWidth: 160,
      invoiceWidth: 120,
      dateWidth: 85,
    }}
  />
);

export default GIAMemoStock;
