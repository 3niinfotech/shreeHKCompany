import { ENDPOINTS } from "../../constants/endpoints";

export const TRANSACTION_STOCK_KEYS = {
  gia: "TransactionGiaStock",
  inMemo: "TransactionInMemoStock",
  outMemo: "TransactionOutMemoStock",
  sale: "TransactionSaleStock",
  purchase: "TransactionPurchaseStock",
};

export const TRANSACTION_STOCK_ENDPOINTS = {
  giaList: ENDPOINTS.transactionStock.gia.list,
  giaReturn: ENDPOINTS.transactionStock.gia.return,
  giaDelete: ENDPOINTS.transactionStock.gia.delete,
  inwardList: ENDPOINTS.transactionStock.inward.list,
  inwardReturn: ENDPOINTS.transactionStock.inward.return,
  inwardMemoToPurchase: ENDPOINTS.transactionStock.inward.memoToPurchase,
  inwardDelete: ENDPOINTS.transactionStock.inward.delete,
  purchaseList: ENDPOINTS.transactionStock.purchase.list,
  purchaseToggle: ENDPOINTS.transactionStock.purchase.toggleType,
  outwardList: ENDPOINTS.transactionStock.outward.list,
  outwardReturn: ENDPOINTS.transactionStock.outward.return,
  outwardMemoToSale: ENDPOINTS.transactionStock.outward.memoToSale,
  outwardToExport: ENDPOINTS.transactionStock.outward.toExport,
  outwardDelete: ENDPOINTS.transactionStock.outward.delete,
  print: ENDPOINTS.transactionStock.print,
};
