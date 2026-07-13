import React from 'react';
import TransactionStockTemplate from './TransactionStockTemplate';
import { TRANSACTION_STOCK_KEYS } from '../../../api/services/transactionStockService';
import { ENDPOINTS } from '../../../constants/endpoints';

const InMemoStock = () => (
  <TransactionStockTemplate
    title="In Memo Stock"
    queryKey={TRANSACTION_STOCK_KEYS.inMemo}
    listEndpoint={ENDPOINTS.transactionStock.inward.list}
    deleteEndpoint={ENDPOINTS.transactionStock.inward.delete}
    entryPath="/transaction/in-memo/entry"
    actions={{
      showReturn: true,
      showMemoToPurchase: true,
      showPrint: true,
      showDelete: true,
      showEdit: true,
      returnEndpoint: ENDPOINTS.transactionStock.inward.return,
      memoToPurchaseEndpoint: ENDPOINTS.transactionStock.inward.memoToPurchase,
      printType: 'purchase',
    }}
  />
);

export default InMemoStock;
