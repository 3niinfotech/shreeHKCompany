import React, { useMemo } from "react";
import { buildVenyaInvoiceBody, VENYA_PRINT_STYLES } from "../../../utils/venyaInvoiceTemplate";
import {
  buildGiaMemoConsignmentBody,
  isGiaMemoConsignmentDocument,
} from "../../../utils/giaMemoConsignmentTemplate";
import styles from "../../../assets/scss/components/transaction/transactionInvoice.module.scss";
import "../../../assets/css/giaMemoInvoice.css";
import "../../../assets/css/invoiceA4.css";

const TransactionInvoice = ({
  printRootClassName = "",
  includeCustomerCopy = false,
  ...invoiceData
}) => {
  const isGiaMemo = isGiaMemoConsignmentDocument(invoiceData);

  const html = useMemo(() => {
    if (isGiaMemo) {
      return buildGiaMemoConsignmentBody(invoiceData, { includeCustomerCopy });
    }
    return buildVenyaInvoiceBody(invoiceData, { includeCustomerCopy });
  }, [invoiceData, includeCustomerCopy, isGiaMemo]);

  return (
    <div className={`${styles.pageShell} ${printRootClassName}`.trim()}>
      {!isGiaMemo ? <style>{VENYA_PRINT_STYLES}</style> : null}
      <div className={styles.paper}>
        <div dangerouslySetInnerHTML={{ __html: html }} />
      </div>
    </div>
  );
};

export default TransactionInvoice;
