import React, { useMemo } from "react";
import { Modal, Button } from "antd";
import { PrinterOutlined } from "@ant-design/icons";
import TransactionInvoice from "./TransactionInvoice";
import { mapTransactionToInvoice } from "../../../utils/mapTransactionToInvoice";
import { printTransactionInvoice } from "../../../utils/printTransactionInvoice";
import { useFetchApi } from "../../../api/ApiFunction";
import { ENDPOINTS } from "../../../api/endpoints";

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
  const { data: partyOptionsRes } = useFetchApi(
    "GetCompany",
    ENDPOINTS.company.options,
    {},
    "GET",
    { enabled: !!open }
  );

  const { data: partiesRes } = useFetchApi(
    "allMasterParties",
    ENDPOINTS.company.list,
    { limit: 1000 },
    "GET",
    { enabled: !!open }
  );

  const allParties = useMemo(() => {
    const list1 = partyOptionsRes?.Data || partyOptionsRes?.data || [];
    const list2 = partiesRes?.Data || partiesRes?.data || [];
    const combined = [...(Array.isArray(list1) ? list1 : []), ...(Array.isArray(list2) ? list2 : [])];
    return combined;
  }, [partyOptionsRes, partiesRes]);

  const enrichedRecord = useMemo(() => {
    if (!record) return null;
    const rawParty = record.party && typeof record.party === "object" ? record.party : {};
    const partyId = String(rawParty.id || record.party || "").trim();
    const targetPartyName = String(record.party_name || rawParty.name || (typeof record.party === "string" ? record.party : "")).trim().toLowerCase();

    const matched = allParties.find(
      (p) =>
        (partyId && String(p.id) === partyId) ||
        (targetPartyName && String(p.name || "").trim().toLowerCase() === targetPartyName)
    );

    const baseParty = matched || rawParty;

    return {
      ...record,
      party_name: (record.party_name && record.party_name.trim()) || baseParty.name || (typeof record.party === "string" ? record.party : "") || "—",
      party_address: (record.party_address && record.party_address.trim()) || baseParty.address || "",
      party_pincode: (record.party_pincode && record.party_pincode.trim()) || baseParty.pincode || "",
      party_country: (record.party_country && record.party_country.trim()) || baseParty.country || "",
      party_contact: (record.party_contact && record.party_contact.trim()) || baseParty.contact_number || baseParty.contact || "",
      party_fax: (record.party_fax && record.party_fax.trim()) || baseParty.fax || "",
      contact_person: (record.contact_person && record.contact_person.trim()) || baseParty.contact_person || baseParty.contactPerson || "",
    };
  }, [record, allParties]);

  const invoiceData = useMemo(() => {
    if (!enrichedRecord) return null;
    return mapTransactionToInvoice(enrichedRecord, {
      invoiceTitle,
      printType,
      company,
      productIds: selectedProductIds,
    });
  }, [enrichedRecord, invoiceTitle, printType, company, selectedProductIds]);

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
