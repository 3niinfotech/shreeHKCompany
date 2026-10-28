import React from 'react';
import TransactionStockTemplate, { defaultProductColumns } from '../transaction/stock/TransactionStockTemplate';
import { ENDPOINTS } from '../../api/endpoints';

const InterTransferPurchaseStock = () => (
  <TransactionStockTemplate
    title="Inter Transfer Purchase"
    invoiceTitle="Transfer Purchase Note"
    queryKey="INTER_TRANSFER_PURCHASE"
    listEndpoint={ENDPOINTS.transactionStock.purchase.list}
    stockType="inter_transfer"
    listPayload={{ stockType: 'inter_transfer' }}
    deleteEndpoint={ENDPOINTS.transactionStock.inward.delete}
    infiniteScroll
    productColumns={defaultProductColumns}
    actions={{
      showEdit: true,
      showPrint: true,
      showDelete: true,
      allowAddProductInEdit: false,
      editGetEndpoint: ENDPOINTS.inward.getById,
      editSaveEndpoint: ENDPOINTS.inward.update,
      printType: 'purchase',
    }}
  />
);

export default InterTransferPurchaseStock;
