import React from 'react';
import TransactionStockTemplate from './TransactionStockTemplate';
import { TRANSACTION_STOCK_KEYS } from '../../../api/services/transactionStockService';
import { ENDPOINTS } from '../../../constants/endpoints';

const GIAMemoStock = () => (
  <TransactionStockTemplate
    title="GIA Lab Stock"
    invoiceTitle="Consignment"
    queryKey={TRANSACTION_STOCK_KEYS.gia}
    listEndpoint={ENDPOINTS.transactionStock.gia.list}
    deleteEndpoint={ENDPOINTS.transactionStock.gia.delete}
    entryPath="/transaction/gia-memo/entry"
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
    }}
  />
);

export default GIAMemoStock;
