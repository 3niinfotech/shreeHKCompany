import React, { useMemo } from "react";
import { Modal, Button } from "antd";
import { PrinterOutlined } from "@ant-design/icons";
import TransactionInvoice from "./TransactionInvoice";
import { mapTransactionToInvoice } from "../../../utils/mapTransactionToInvoice";
import { printTransactionInvoice } from "../../../utils/printTransactionInvoice";

const PRINT_ROOT_CLASS = "transaction-invoice-print-root";

const TransactionInvoicePreviewModal = ({
  open,
  onClose,
  record,
  invoiceTitle = "Purchase Invoice",
  printType,
  company = {},
  selectedProductIds = null,
}) => {
  const invoiceData = useMemo(() => {
    if (!record) return null;
    return mapTransactionToInvoice(record, {
      invoiceTitle,
      printType,
      company,
      productIds: selectedProductIds,
    });
  }, [record, invoiceTitle, printType, company, selectedProductIds]);

  const handlePrint = () => {
    if (!invoiceData) return;
    printTransactionInvoice(invoiceData);
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      width={920}
      centered
      destroyOnHidden
      title={
        invoiceData
          ? `${invoiceData.invoiceTitle} — ${invoiceData.invoiceNo}`
          : invoiceTitle
      }
      className="transaction-invoice-modal"
      wrapClassName="transaction-invoice-modal-wrap"
      footer={[
        <Button key="close" onClick={onClose}>
          Close
        </Button>,
        <Button
          key="print"
          type="primary"
          icon={<PrinterOutlined />}
          onClick={handlePrint}
          disabled={!invoiceData}
        >
          Print / PDF
        </Button>,
      ]}
      styles={{
        body: { padding: 0, background: "#f1f1f1" },
      }}
    >
      {invoiceData ? (
        <TransactionInvoice {...invoiceData} printRootClassName={PRINT_ROOT_CLASS} />
      ) : null}
    </Modal>
  );
};

export default TransactionInvoicePreviewModal;
