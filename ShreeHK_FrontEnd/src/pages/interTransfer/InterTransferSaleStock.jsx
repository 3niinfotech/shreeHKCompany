import TransactionStockTemplate, { defaultProductColumns } from '../transaction/stock/TransactionStockTemplate';
import { ENDPOINTS } from '../../api/endpoints';

const InterTransferSaleStock = () => (
  <TransactionStockTemplate
    title="Inter Transfer Sale"
    invoiceTitle="Transfer Sale Invoice"
    queryKey="INTER_TRANSFER_SALE"
    listEndpoint={ENDPOINTS.transactionStock.outward.list}
    stockType="inter_transfer"
    listPayload={{ stockType: 'inter_transfer' }}
    deleteEndpoint={ENDPOINTS.transactionStock.outward.delete}
    infiniteScroll
    productColumns={defaultProductColumns}
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
