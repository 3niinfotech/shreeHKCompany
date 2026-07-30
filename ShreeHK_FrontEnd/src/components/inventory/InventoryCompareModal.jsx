import React, { useMemo } from "react";
import { Modal, Tag, Empty, Button } from "antd";
import { GitCompare, Gem } from "lucide-react";
import styles from "../../assets/scss/components/inventoryCompareModal.module.scss";

const fmt = (v) => (v == null || v === "" ? "—" : String(v));

const LAB_COLORS = {
  GIA: "blue",
  gia: "blue",
  IGI: "green",
  CGL: "orange",
  AGT: "purple",
};

const normalizeRow = (row = {}) => ({
  id: row.id,
  sku: row.sku,
  mfgCode: row.mfgCode ?? row.mfg_code,
  lab: row.lab,
  shape: row.shape,
  polishPcs: row.polishPcs ?? row.polish_pcs,
  polishCarat: Number(row.polishCarat ?? row.polish_carat ?? row.carat) || 0,
  mainColor: row.mainColor ?? row.main_color ?? row.color,
  clarity: row.clarity ?? row.mainClarity,
  rapPrice: Number(row.rapPrice ?? row.rap_price) || 0,
  price: Number(row.price) || 0,
  amount: Number(row.amount) || 0,
  cost: Number(row.cost) || 0,
  location: row.location ?? row.loc,
  reportNo: row.reportNo ?? row.report_no ?? row.certificate,
  groupType: row.groupType ?? row.group_type ?? row.type,
  outward: row.outward,
  hold: row.hold,
  size: row.size,
  cut: row.cut,
  polish: row.polish,
  symmetry: row.symmetry ?? row.symmentry,
  fluorescence: row.fluorescence ?? row.f_intensity,
  intensity: row.intensity,
  overTone: row.overTone ?? row.overtone,
  origin: row.origin,
  remark: row.remark,
});

const SECTIONS = [
  {
    key: "identity",
    title: "Identity",
    fields: [
      { key: "sku", label: "SKU" },
      { key: "mfgCode", label: "Mfg. Code" },
      { key: "lab", label: "Lab" },
      { key: "reportNo", label: "Certificate" },
      { key: "groupType", label: "Stone Type" },
    ],
  },
  {
    key: "grading",
    title: "Grading & Specs",
    fields: [
      { key: "shape", label: "Shape" },
      { key: "polishCarat", label: "Carat", type: "carat", best: "max" },
      { key: "polishPcs", label: "Pcs" },
      { key: "mainColor", label: "Color" },
      { key: "clarity", label: "Clarity" },
      { key: "size", label: "Size" },
      { key: "cut", label: "Cut" },
      { key: "polish", label: "Polish" },
      { key: "symmetry", label: "Symmetry" },
      { key: "fluorescence", label: "Fluorescence" },
      { key: "intensity", label: "Intensity" },
      { key: "overTone", label: "Overtone" },
    ],
  },
  {
    key: "pricing",
    title: "Pricing",
    fields: [
      { key: "rapPrice", label: "Rap", type: "money" },
      { key: "price", label: "Ask Price", type: "money", best: "min" },
      { key: "disc", label: "Disc %", type: "disc" },
      { key: "amount", label: "Amount", type: "money" },
      { key: "cost", label: "Cost", type: "money" },
    ],
  },
  {
    key: "status",
    title: "Stock Status",
    fields: [
      { key: "location", label: "Location" },
      { key: "outward", label: "Outward" },
      { key: "hold", label: "Hold", type: "bool" },
      { key: "origin", label: "Origin" },
      { key: "remark", label: "Remark" },
    ],
  },
];

function formatMoney(v) {
  const n = Number(v);
  if (!n) return "—";
  return `$${n.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function formatDisc(row) {
  const rap = Number(row.rapPrice) || 0;
  const price = Number(row.price) || 0;
  if (!rap || !price) return "—";
  return `${(((price * 100) / rap) - 100).toFixed(2)}%`;
}

function getFieldValue(row, field) {
  if (field.key === "disc") return formatDisc(row);
  if (field.type === "money") return formatMoney(row[field.key]);
  if (field.type === "carat") {
    const n = Number(row[field.key]) || 0;
    return n ? n.toFixed(2) : "—";
  }
  if (field.type === "bool") {
    if (row[field.key] === true || row[field.key] === 1 || row[field.key] === "1") return "Yes";
    return "No";
  }
  return fmt(row[field.key]);
}

function getRawComparable(row, field) {
  if (field.key === "disc") {
    const rap = Number(row.rapPrice) || 0;
    const price = Number(row.price) || 0;
    if (!rap || !price) return null;
    return ((price * 100) / rap) - 100;
  }
  if (field.type === "money" || field.type === "carat") {
    const n = Number(row[field.key]);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  const v = row[field.key];
  if (v == null || v === "") return null;
  return String(v).trim().toLowerCase();
}

function getCellClass(field, row, stones) {
  const values = stones.map((s) => getRawComparable(s, field)).filter((v) => v != null);
  if (values.length < 2) return "";

  const allSame = values.every((v) => v === values[0]);
  if (allSame) return "";

  const raw = getRawComparable(row, field);
  if (raw == null) return styles.valueCellMuted;

  const classes = [styles.valueCellDiff];

  if (field.best === "min") {
    const nums = stones.map((s) => getRawComparable(s, field)).filter((v) => typeof v === "number");
    if (nums.length && raw === Math.min(...nums)) classes.push(styles.valueCellBest);
  }

  if (field.best === "max") {
    const nums = stones.map((s) => getRawComparable(s, field)).filter((v) => typeof v === "number");
    if (nums.length && raw === Math.max(...nums)) classes.push(styles.valueCellBest);
  }

  return classes.join(" ");
}

function StoneSummaryCard({ stone, index }) {
  const labColor = LAB_COLORS[stone.lab] || "default";
  const specParts = [stone.shape, stone.polishCarat ? `${stone.polishCarat.toFixed(2)} ct` : null, stone.mainColor, stone.clarity]
    .filter(Boolean);

  return (
    <article className={styles.stoneCard}>
      <span className={styles.stoneCardIndex}>{index + 1}</span>
      <h3 className={styles.stoneSku}>{stone.sku || "—"}</h3>
      <div className={styles.stoneMeta}>
        {stone.lab ? (
          <Tag color={labColor} className={styles.labTag}>{stone.lab}</Tag>
        ) : null}
        {stone.groupType ? <Tag>{stone.groupType}</Tag> : null}
        {stone.hold ? <Tag color="orange">On Hold</Tag> : null}
        {stone.outward ? <Tag color="volcano">{stone.outward}</Tag> : null}
      </div>
      <p className={styles.specLine}>{specParts.join(" · ") || "—"}</p>
      <div className={styles.priceBlock}>
        <span className={styles.priceLabel}>Ask Price</span>
        <div>
          <div className={styles.priceValue}>{formatMoney(stone.price)}</div>
          {stone.rapPrice > 0 ? (
            <div className={styles.discValue}>{formatDisc(stone)} off Rap</div>
          ) : null}
        </div>
      </div>
    </article>
  );
}

const InventoryCompareModal = ({ open, rows = [], onClose }) => {
  const stones = useMemo(() => rows.map(normalizeRow).slice(0, 4), [rows]);

  const visibleSections = useMemo(() => SECTIONS.map((section) => ({
    ...section,
    fields: section.fields.filter((field) => {
      if (field.key === "disc" || field.key === "sku") return true;
      return stones.some((stone) => {
        const raw = stone[field.key];
        return raw != null && raw !== "" && raw !== 0 && raw !== false;
      });
    }),
  })).filter((section) => section.fields.length > 0), [stones]);

  const title = (
    <div className={styles.titleWrap}>
      <div className={styles.titleIcon}>
        <GitCompare size={22} />
      </div>
      <div className={styles.titleText}>
        <h2 className={styles.titleMain}>Compare Stones</h2>
        <p className={styles.titleSub}>
          Side-by-side view of {stones.length} selected stone{stones.length === 1 ? "" : "s"}.
          Differences are highlighted; best ask price and largest carat are marked in green.
        </p>
      </div>
    </div>
  );

  return (
    <Modal
      className={styles.modal}
      title={title}
      open={open}
      onCancel={onClose}
      width="min(1080px, calc(100vw - 24px))"
      centered
      destroyOnClose
      footer={(
        <Button danger className={styles.footerBtn} onClick={onClose}>
          Close
        </Button>
      )}
    >
      {!stones.length ? (
        <div className={styles.emptyWrap}>
          <Empty
            image={<Gem size={48} strokeWidth={1.2} opacity={0.35} />}
            description="Select 2–4 stones from inventory, then use Compare."
          />
        </div>
      ) : (
        <div className={styles.body}>
          <div className={styles.stoneCards}>
            {stones.map((stone, index) => (
              <StoneSummaryCard key={stone.id ?? stone.sku ?? index} stone={stone} index={index} />
            ))}
          </div>

          <div className={styles.legend}>
            <span className={styles.legendItem}>
              <span className={`${styles.legendSwatch} ${styles.legendSwatchDiff}`} />
              Different across stones
            </span>
            <span className={styles.legendItem}>
              <span className={`${styles.legendSwatch} ${styles.legendSwatchBest}`} />
              Best value (lowest price / highest carat)
            </span>
          </div>

          <div className={styles.matrixWrap}>
            <div className={styles.matrixScroll}>
              <div
                className={styles.matrix}
                style={{ "--stone-count": stones.length }}
              >
                <div className={styles.matrixHead}>
                  <div className={styles.headAttr}>Attribute</div>
                  {stones.map((stone, index) => (
                    <div key={stone.id ?? stone.sku ?? index} className={styles.headStone}>
                      <span className={styles.headStoneSku}>{stone.sku || "—"}</span>
                    </div>
                  ))}
                </div>

                {visibleSections.map((section) => (
                  <React.Fragment key={section.key}>
                    <div className={styles.sectionRow}>{section.title}</div>
                    {section.fields.map((field) => (
                      <div key={field.key} className={styles.dataRow}>
                        <div className={styles.attrCell}>{field.label}</div>
                        {stones.map((stone, index) => (
                          <div
                            key={`${field.key}-${stone.id ?? index}`}
                            className={`${styles.valueCell} ${getCellClass(field, stone, stones)}`}
                          >
                            {getFieldValue(stone, field)}
                          </div>
                        ))}
                      </div>
                    ))}
                  </React.Fragment>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default InventoryCompareModal;
