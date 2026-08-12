import React, { useMemo } from "react";
import dayjs from "dayjs";
import { Modal, Tag, Table } from "antd";
import { SkeletonDetail, SkeletonList } from "../common/skeleton";
import { DollarCircleOutlined, ExperimentOutlined, InfoCircleOutlined, HistoryOutlined } from "@ant-design/icons";
import { useFetchApi } from "../../api/ApiFunction";
import { ENDPOINTS } from "../../constants/endpoints";
import LocationWithFlag from "./LocationWithFlag";
import styles from "../../assets/scss/components/inventoryStoneDetailModal.module.scss";
import { cssVar } from "../../theme";

const toDisplay = (value, fallback = "-") => {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
};

const toCurrency = (value) => {
  if (value === null || value === undefined || value === "") return "-";
  const amount = Number(value);
  if (Number.isNaN(amount)) return "-";
  return `$${amount.toLocaleString()}`;
};

const formatHoldDate = (value) => {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric" });
};

const isEmptyValue = (value) => {
  if (value === null || value === undefined || value === "") return true;
  if (typeof value === "string" && value.trim() === "-") return true;
  return false;
};

const filterFilledFields = (items) =>
  items.filter((item) => item.alwaysShow || !isEmptyValue(item.value));

const DetailGrid = ({ items, wide = false }) => {
  const visible = filterFilledFields(items);
  if (!visible.length) {
    return <p className={styles.emptyHint}>No details available</p>;
  }
  return (
    <div className={`${styles.grid} ${wide ? styles.gridWide : ""}`}>
      {visible.map((item) => (
        <div key={item.label} className={styles.item}>
          <span className={styles.label}>{item.label}</span>
          <span className={`${styles.value} ${item.accent ? styles[`accent_${item.accent}`] : ""}`}>
            {item.value}
          </span>
        </div>
      ))}
    </div>
  );
};

const InventoryStoneDetailModal = ({ open, onClose, stone }) => {
  const productId = stone?.id;
  const { data: holdResponse, isLoading: holdLoading } = useFetchApi(
    `holdDetail-${productId || "none"}`,
    ENDPOINTS.product.holdDetail,
    { productId },
    "GET",
    { enabled: Boolean(open && productId && stone?.hold) },
  );

  const { data: historyResponse, isLoading: historyLoading } = useFetchApi(
    `productHistory-${stone?.sku || "none"}`,
    ENDPOINTS.product.history,
    { sku: stone?.sku },
    "GET",
    { enabled: Boolean(open && stone?.sku) },
  );

  const holdInfo = holdResponse?.data;
  const historyRows = historyResponse?.History || [];

  const statusTags = useMemo(() => {
    if (!stone) return [];
    const tags = [];

    if (stone.hold) {
      tags.push({ label: "On Hold", color: "orange" });
    } else {
      tags.push({ label: "Available", color: "green" });
    }

    if (stone.outward) {
      tags.push({ label: toDisplay(stone.outward), color: "blue" });
    }

    if (stone.lab) {
      tags.push({ label: toDisplay(stone.lab), color: "purple" });
    }

    return tags;
  }, [stone]);

  const basicDetails = useMemo(
    () => [
      { label: "MFG Code", value: toDisplay(stone?.mfgCode) },
      { label: "SKU", value: toDisplay(stone?.sku) },
      { label: "Cert #", value: toDisplay(stone?.certificate) },
      { label: "Shape", value: toDisplay(stone?.shape) },
      { label: "Carat", value: toDisplay(stone?.polishCarat) },
      { label: "Color", value: toDisplay(stone?.color) },
      { label: "Clarity", value: toDisplay(stone?.clarity) },
      { label: "In-House Clarity", value: toDisplay(stone?.mainClarity) },
      { label: "Location", value: stone?.location ? <LocationWithFlag location={stone.location} /> : "-" },
      { label: "Package", value: toDisplay(stone?.package) },
    ],
    [stone],
  );

  const gradingDetails = useMemo(
    () => [
      { label: "Cut", value: toDisplay(stone?.cut) },
      { label: "Polish", value: toDisplay(stone?.polish) },
      { label: "Symmetry", value: toDisplay(stone?.symmetry) },
      { label: "Fluorescence", value: toDisplay(stone?.fluorescence) },
      { label: "Intensity", value: toDisplay(stone?.intensity) },
      { label: "Overtone", value: toDisplay(stone?.overTone) },
      { label: "Measurement", value: toDisplay(stone?.measurement) },
      { label: "Table %", value: toDisplay(stone?.table) },
      { label: "Depth %", value: toDisplay(stone?.depth) },
      { label: "Girdle", value: toDisplay(stone?.girdle) },
    ],
    [stone],
  );

  const pricingDetails = useMemo(
    () => [
      { label: "Rap Price", value: toCurrency(stone?.rapPrice), accent: "rap", alwaysShow: true },
      { label: "Price/Crt", value: toCurrency(stone?.price), accent: "price", alwaysShow: true },
      { label: "Amount", value: toCurrency(stone?.amount), accent: "amount", alwaysShow: true },
      { label: "BGM", value: toDisplay(stone?.bgm) },
      { label: "Eye Clean", value: toDisplay(stone?.eyeClean) },
      { label: "Main Group", value: toDisplay(stone?.group) },
      { label: "Sub Group", value: toDisplay(stone?.subGroup) },
    ],
    [stone],
  );

  const remarkText = toDisplay(stone?.remark, "");
  const showRemarks = Boolean(remarkText && remarkText !== "-");

  if (!stone) return null;

  return (
    <Modal
      className={styles.modal}
      open={open}
      onCancel={onClose}
      footer={null}
      centered
      width={820}
      destroyOnClose={false}
      maskClosable
      title={
        <div className={styles.header}>
          <div className={styles.headerMain}>
            <span className={styles.heading}>Stone Details</span>
            <div className={styles.badges}>
              {statusTags.map((tag) => (
                <Tag key={`${tag.label}-${tag.color}`} color={tag.color} className={styles.badge}>
                  {tag.label}
                </Tag>
              ))}
            </div>
          </div>
          <span className={styles.sku}>{toDisplay(stone.sku)}</span>
        </div>
      }
    >
      <div className={styles.content}>
        {stone?.hold ? (
          <section
            className={styles.panel}
            style={{ background: cssVar("color-bg-muted"), borderColor: cssVar("color-border-strong") }}
          >
            <div className={styles.panelTitle}>
              <InfoCircleOutlined />
              <span>Hold Information</span>
            </div>
            {holdLoading ? (
              <SkeletonDetail fields={3} />
            ) : holdInfo ? (
              <DetailGrid
                items={[
                  { label: "Hold By", value: toDisplay(holdInfo.user_name) },
                  { label: "Date", value: formatHoldDate(holdInfo.date) },
                  { label: "Description", value: toDisplay(holdInfo.description) },
                ]}
                wide
              />
            ) : (
              <p className={styles.emptyHint}>No scheduled hold record (flag only).</p>
            )}
          </section>
        ) : null}

        <div className={styles.sectionRow}>
          <section className={`${styles.panel} ${styles.panelCompact}`}>
            <div className={styles.panelTitle}>
              <InfoCircleOutlined />
              <span>Basic Information</span>
            </div>
            <DetailGrid items={basicDetails} />
          </section>

          <section className={`${styles.panel} ${styles.panelCompact}`}>
            <div className={styles.panelTitle}>
              <ExperimentOutlined />
              <span>Grading & Proportions</span>
            </div>
            <DetailGrid items={gradingDetails} />
          </section>
        </div>

        <section className={styles.panel}>
          <div className={styles.panelTitle}>
            <DollarCircleOutlined />
            <span>Pricing & Classification</span>
          </div>
          <DetailGrid items={pricingDetails} wide />
        </section>

        {showRemarks ? (
          <section className={styles.remarkPanel}>
            <div className={styles.panelTitle}>
              <InfoCircleOutlined />
              <span>Remarks</span>
            </div>
            <p className={styles.remarkText}>{remarkText}</p>
          </section>
        ) : null}

        <section className={styles.panel}>
          <div className={styles.panelTitle}>
            <HistoryOutlined />
            <span>Stone History</span>
          </div>
          {historyLoading ? (
            <SkeletonList rows={4} withAvatar={false} />
          ) : historyRows.length ? (
            <Table
              className={styles.historyTable}
              size="small"
              pagination={false}
              scroll={{ y: 120 }}
              rowKey={(r) => r.id}
              dataSource={historyRows}
              columns={[
                { title: "Date", dataIndex: "date", width: 96, render: (v) => (v && dayjs(v).isValid() ? dayjs(v).format("DD-MM-YYYY") : (v || "-")) },
                { title: "Action", dataIndex: "action", width: 88 },
                { title: "Description", dataIndex: "description", ellipsis: true },
                { title: "Carat", dataIndex: "carat", width: 62, align: "right" },
                { title: "Amount", dataIndex: "amount", width: 80, align: "right" },
              ]}
            />
          ) : (
            <p className={styles.emptyHint}>No history records found.</p>
          )}
        </section>
      </div>
    </Modal>
  );
};

export default InventoryStoneDetailModal;
