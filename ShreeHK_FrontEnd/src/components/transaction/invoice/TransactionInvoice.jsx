import React, { useMemo } from "react";
import { buildVenyaInvoiceBody, VENYA_PRINT_STYLES } from "../../../utils/venyaInvoiceTemplate";
import {
  buildGiaMemoConsignmentBody,
  isGiaMemoConsignmentDocument,
} from "../../../utils/giaMemoConsignmentTemplate";
import { isSaleInvoiceDocument } from "../../../utils/saleInvoiceTemplate";
import { APPROVAL_MEMO_STYLES } from "../../../utils/approvalMemoTemplate";
import SaleInvoice from "./SaleInvoice";
import styles from "../../../assets/scss/components/transaction/transactionInvoice.module.scss";
import "../../../assets/css/giaMemoInvoice.css";
import "../../../assets/css/invoiceA4.css";

const TransactionInvoice = ({
  printRootClassName = "",
  includeCustomerCopy = false,
  ...invoiceData
}) => {
  const isGiaMemo = isGiaMemoConsignmentDocument(invoiceData);
  const isSaleInvoice = isSaleInvoiceDocument(invoiceData);

  const html = useMemo(() => {
    if (isGiaMemo) {
      return buildGiaMemoConsignmentBody(invoiceData, { includeCustomerCopy });
    }
    if (!isSaleInvoice) {
      return buildVenyaInvoiceBody(invoiceData, { includeCustomerCopy });
    }
    return null;
  }, [invoiceData, includeCustomerCopy, isGiaMemo, isSaleInvoice]);

  const previewStyles = isSaleInvoice ? APPROVAL_MEMO_STYLES : VENYA_PRINT_STYLES;

  return (
    <div className={`${styles.pageShell} ${printRootClassName}`.trim()}>
      {!isGiaMemo ? <style>{previewStyles}</style> : null}
      <div className={styles.paper}>
        {isSaleInvoice ? (
          <SaleInvoice {...invoiceData} includeCustomerCopy={includeCustomerCopy} />
        ) : (
          <div dangerouslySetInnerHTML={{ __html: html }} />
        )}
      </div>
    </div>
  );
};

export default TransactionInvoice;
