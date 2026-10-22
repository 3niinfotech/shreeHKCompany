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
    { all: "1" },
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

  const operatingCompanies = useMemo(() => {
    const list = partyOptionsRes?.operatingCompanies || [];
    return Array.isArray(list) ? list : [];
  }, [partyOptionsRes]);

  const allParties = useMemo(() => {
    const list1 = partyOptionsRes?.Data || partyOptionsRes?.data || [];
    const list2 = partiesRes?.Data || partiesRes?.data || [];
    const combined = [...(Array.isArray(list1) ? list1 : []), ...(Array.isArray(list2) ? list2 : [])];
    return combined;
  }, [partyOptionsRes, partiesRes]);

  const resolvedCompany = useMemo(() => {
    const recCompId =
      record?.company != null && record?.company !== ""
        ? String(record.company).trim()
        : null;
    const recCompName = String(record?.company_name || "").trim().toLowerCase();

    const matchedComp = operatingCompanies.find(
      (c) =>
        (recCompId && String(c.id) === recCompId) ||
        (recCompName && String(c.name || "").trim().toLowerCase() === recCompName) ||
        (recCompName && String(c.shortcutName || "").trim().toLowerCase() === recCompName)
    );

    const base = company || {};
    const effectiveComp = matchedComp || {};

    return {
      ...base,
      ...effectiveComp,
      name:
        record?.company_name ||
        effectiveComp.name ||
        base.name ||
        base.company_name ||
        "Shree International (HK) Ltd",
      company_name:
        record?.company_name ||
        effectiveComp.name ||
        base.company_name ||
        base.name ||
        "Shree International (HK) Ltd",
      shortcutName: effectiveComp.shortcutName || base.shortcutName,
      address:
        record?.company_address ||
        effectiveComp.address ||
        base.address ||
        base.companyAddress,
      companyAddress:
        record?.company_address ||
        effectiveComp.address ||
        base.companyAddress ||
        base.address,
      city: record?.company_city || effectiveComp.city || base.city || base.companyCity,
      companyCity:
        record?.company_city || effectiveComp.city || base.companyCity || base.city,
      state:
        record?.company_state ||
        effectiveComp.state ||
        base.state ||
        base.companyState,
      companyState:
        record?.company_state ||
        effectiveComp.state ||
        base.companyState ||
        base.state,
      pincode:
        record?.company_pincode ||
        effectiveComp.pincode ||
        base.pincode ||
        base.companyPincode,
      companyPincode:
        record?.company_pincode ||
        effectiveComp.pincode ||
        base.companyPincode ||
        base.pincode,
      country:
        record?.company_country ||
        effectiveComp.country ||
        base.country ||
        base.companyCountry,
      companyCountry:
        record?.company_country ||
        effectiveComp.country ||
        base.companyCountry ||
        base.country,
      number:
        record?.company_number ||
        effectiveComp.number ||
        base.number ||
        base.companyNumber,
      companyNumber:
        record?.company_number ||
        effectiveComp.number ||
        base.companyNumber ||
        base.number,
      email:
        record?.company_email ||
        effectiveComp.email ||
        base.email ||
        base.companyEmail,
      companyEmail:
        record?.company_email ||
        effectiveComp.email ||
        base.companyEmail ||
        base.email,
      website:
        record?.company_website ||
        effectiveComp.website ||
        base.website ||
        base.companyWebsite,
      companyWebsite:
        record?.company_website ||
        effectiveComp.website ||
        base.companyWebsite ||
        base.website,
      logo:
        record?.company_logo ||
        effectiveComp.logo ||
        base.logo ||
        base.logoUrl,
      logoUrl:
        record?.company_logo ||
        effectiveComp.logo ||
        base.logoUrl ||
        base.logo,
    };
  }, [record, operatingCompanies, company]);

  const enrichedRecord = useMemo(() => {
    if (!record) return null;
    const rawParty = record.party && typeof record.party === "object" ? record.party : {};

    const rawPartyId = rawParty.id || (record.party && !isNaN(Number(record.party)) ? record.party : "");
    const partyId = rawPartyId ? String(rawPartyId).trim() : "";

    const candidateName = String(
      (record.party_name && isNaN(Number(record.party_name)) ? record.party_name : "") ||
      rawParty.name ||
      (typeof record.party === "string" && isNaN(Number(record.party)) ? record.party : "")
    ).trim().toLowerCase();

    // 1. Try matching in dai_party
    let matched = allParties.find(
      (p) =>
        (partyId && String(p.id) === partyId) ||
        (candidateName && String(p.name || "").trim().toLowerCase() === candidateName)
    );

    // 2. If not found in dai_party, match in operating companies (for inter-company / branch parties)
    if (!matched) {
      const matchedComp = operatingCompanies.find(
        (c) =>
          (partyId && String(c.id) === partyId) ||
          (candidateName && String(c.name || "").trim().toLowerCase() === candidateName) ||
          (candidateName && String(c.shortcutName || "").trim().toLowerCase() === candidateName)
      );
      if (matchedComp) {
        matched = {
          id: matchedComp.id,
          name: matchedComp.name,
          address: matchedComp.address,
          city: matchedComp.city,
          state: matchedComp.state,
          pincode: matchedComp.pincode,
          country: matchedComp.country,
          contact_number: matchedComp.number,
          contact_person: matchedComp.partner,
          email: matchedComp.email,
        };
      }
    }

    const baseParty = matched || rawParty;

    const resolvedPartyName =
      (record.party_name && isNaN(Number(record.party_name)) && record.party_name.trim()) ||
      baseParty.name ||
      (typeof record.party === "string" && isNaN(Number(record.party)) ? record.party : "") ||
      "—";

    return {
      ...record,
      party_name: resolvedPartyName,
      party_address: (record.party_address && record.party_address.trim()) || baseParty.address || "",
      party_pincode: (record.party_pincode && record.party_pincode.trim()) || baseParty.pincode || "",
      party_country: (record.party_country && record.party_country.trim()) || baseParty.country || "",
      party_contact: (record.party_contact && record.party_contact.trim()) || baseParty.contact_number || baseParty.contact || "",
      party_fax: (record.party_fax && record.party_fax.trim()) || baseParty.fax || "",
      contact_person: (record.contact_person && record.contact_person.trim()) || baseParty.contact_person || baseParty.contactPerson || "",
    };
  }, [record, allParties, operatingCompanies]);

  const invoiceData = useMemo(() => {
    if (!enrichedRecord) return null;
    return mapTransactionToInvoice(enrichedRecord, {
      invoiceTitle,
      printType,
      company: resolvedCompany,
      productIds: selectedProductIds,
    });
  }, [enrichedRecord, invoiceTitle, printType, resolvedCompany, selectedProductIds]);

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
      closable={false}
      maskClosable={false}
      mask={{ closable: false }}
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
