import React, { useEffect, useMemo, useState } from "react";
import { Button, Input, InputNumber, Select, Space } from "antd";
import { CheckOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { BaseModal } from "../../common/modals";
import { useFetchApi } from "../../../api/ApiFunction";
import { ENDPOINTS, QUERY_KEYS } from "../../../api/endpoints";
import styles from "../../../assets/scss/pages/outward.module.scss";

const { TextArea } = Input;

const formatEntryNo = (record) => {
  const raw = record?.entryno != null && record.entryno !== ""
    ? String(record.entryno)
    : (record?.id != null ? String(record.id) : "");
  if (!raw) return "—";
  if (/^outward[-\s]?/i.test(raw)) return raw;
  return `Outward-${raw}`;
};

/**
 * Convert To Export / Convert To Consign
 * (shipping / origin / charge / CIF / narration).
 */
const ConvertToExportModal = ({
  open,
  record,
  convertType = "export",
  loading = false,
  onClose,
  onConfirm,
}) => {
  const isConsign = convertType === "consign";
  const modalTitle = isConsign ? "Convert To Consign" : "Convert To Export";
  const [shippingName, setShippingName] = useState(undefined);
  const [originOf, setOriginOf] = useState(undefined);
  const [charge, setCharge] = useState(null);
  const [cif, setCif] = useState("");
  const [narration, setNarration] = useState("");

  const { data: shippingData } = useFetchApi(
    [QUERY_KEYS.shipping, "convert-export"],
    ENDPOINTS.shipping.list,
    { limit: 500 },
    "GET",
    { enabled: open },
  );
  const { data: originData } = useFetchApi(
    [QUERY_KEYS.origins, "convert-export"],
    ENDPOINTS.origin.list,
    { limit: 500 },
    "GET",
    { enabled: open },
  );

  const shippingOptions = useMemo(() => {
    const d = shippingData?.Data || shippingData?.data || shippingData;
    const list = Array.isArray(d) ? d : [];
    return list.map((item) => ({
      label: item.name || item.shipping_name || String(item.id),
      value: String(item.id),
    }));
  }, [shippingData]);

  const originOptions = useMemo(() => {
    const d = originData?.Data || originData?.data || originData;
    const list = Array.isArray(d) ? d : [];
    return list.map((item) => ({
      label: item.name || item.origin_name || String(item.id),
      value: String(item.id),
    }));
  }, [originData]);

  useEffect(() => {
    if (!open || !record) {
      setShippingName(undefined);
      setOriginOf(undefined);
      setCharge(null);
      setCif("");
      setNarration("");
      return;
    }
    setShippingName(
      record.shipping_name != null && record.shipping_name !== ""
        ? String(record.shipping_name)
        : undefined,
    );
    setOriginOf(
      record.origin_of != null && record.origin_of !== ""
        ? String(record.origin_of)
        : undefined,
    );
    setCharge(
      record.shipping_charge != null && record.shipping_charge !== ""
        ? Number(record.shipping_charge)
        : null,
    );
    setCif(record.cif != null ? String(record.cif) : "");
    setNarration(record.narretion || record.narration || "");
  }, [open, record]);

  const formatDate = (value) => {
    if (!value) return "—";
    const d = dayjs(value);
    return d.isValid() ? d.format("DD-MM-YYYY") : String(value);
  };

  const handleSave = () => {
    onConfirm?.({
      id: record?.id,
      type: isConsign ? "consign" : "export",
      shipping_name: shippingName || "",
      origin_of: originOf || "",
      shipping_charge: Number(charge) || 0,
      cif: cif || "",
      narretion: narration || "",
    });
  };

  const partyLabel = record?.party_name || record?.party || "—";

  return (
    <BaseModal
      isOpen={open}
      onClose={onClose}
      title={modalTitle}
      width={780}
      closable={false}
      className={`convert-export-modal ${styles.convertExportModal}`}
      rootClassName={`convert-export-modal-root ${styles.convertExportModalRoot}`}
      classNames={{
        container: "convert-export-modal-container",
        header: styles.convertExportPadHeader,
        body: styles.convertExportPadBody,
        footer: styles.convertExportPadFooter,
      }}
      styles={{
        container: { paddingTop: 4, paddingBottom: 4, height: "auto" },
        header: { padding: "4px 0", minHeight: "auto" },
        body: { padding: "4px 0", flex: "none" },
        footer: { padding: "4px 0", borderTop: "none" },
      }}
      footer={(
        <div className={styles.convertExportFooter}>
          <Space size={10}>
            <Button
              type="primary"
              icon={<CheckOutlined />}
              loading={loading}
              className={styles.convertExportSaveBtn}
              onClick={handleSave}
            >
              Save Data
            </Button>
            <Button
              danger
              className={styles.convertExportCloseBtn}
              onClick={onClose}
            >
              Close
            </Button>
          </Space>
        </div>
      )}
      content={(
        <div className={styles.convertExportBody}>
          <div className={styles.convertExportMeta}>
            <div className={styles.convertExportBadge}>
              <span className={styles.convertExportBadgeLbl}>Party</span>
              <span className={styles.convertExportBadgeVal}>{partyLabel}</span>
            </div>
            <div className={styles.convertExportBadge}>
              <span className={styles.convertExportBadgeLbl}>Entry No.</span>
              <span className={styles.convertExportBadgeVal}>{formatEntryNo(record)}</span>
            </div>
            <div className={styles.convertExportBadge}>
              <span className={styles.convertExportBadgeLbl}>Invoice</span>
              <span className={styles.convertExportBadgeVal}>{record?.invoiceno || "—"}</span>
            </div>
            <div className={styles.convertExportBadge}>
              <span className={styles.convertExportBadgeLbl}>Date</span>
              <span className={styles.convertExportBadgeVal}>
                {formatDate(record?.date || record?.invoicedate)}
              </span>
            </div>
            <div className={styles.convertExportBadge}>
              <span className={styles.convertExportBadgeLbl}>Reference</span>
              <span className={styles.convertExportBadgeVal}>{record?.reference || "—"}</span>
            </div>
          </div>

          <div className={styles.convertExportForm}>
            <div className={styles.convertExportFormRow}>
              <div className={styles.convertExportField}>
                <label>Shipping</label>
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  placeholder="Select Shipping"
                  options={shippingOptions}
                  value={shippingName}
                  onChange={setShippingName}
                />
              </div>
              <div className={styles.convertExportField}>
                <label>Origin of</label>
                <Select
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  placeholder="Select Origin"
                  options={originOptions}
                  value={originOf}
                  onChange={setOriginOf}
                />
              </div>
            </div>
            <div className={styles.convertExportFormRow}>
              <div className={styles.convertExportField}>
                <label>Charge</label>
                <InputNumber
                  min={0}
                  step={0.01}
                  precision={2}
                  value={charge}
                  onChange={setCharge}
                  placeholder="0.00"
                />
              </div>
              <div className={styles.convertExportField}>
                <label>C.I.F</label>
                <Input
                  value={cif}
                  onChange={(e) => setCif(e.target.value)}
                />
              </div>
            </div>
          </div>

          <div className={styles.convertExportNarration}>
            <label className={styles.convertExportNarrationLbl}>Narration</label>
            <TextArea
              rows={3}
              value={narration}
              onChange={(e) => setNarration(e.target.value)}
              placeholder="Enter Narration"
            />
          </div>
        </div>
      )}
    />
  );
};

export default ConvertToExportModal;
