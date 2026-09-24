import React from "react";
import InwardEntryForm from "./InwardEntryForm";
import OutwardEntryForm from "./OutwardEntryForm";

/**
 * Configuration registry for each stock transaction entry type.
 * Preserves exact props, default values, form settings, and table behavior.
 */
export const STOCK_ENTRY_CONFIG = {
  PURCHASE: {
    component: InwardEntryForm,
    props: {
      title: "Inward - Purchase Transaction",
      defaultInwardType: "purchase",
      showRPcs: true,
      initialLineCount: 7,
      visibleRowCount: 7,
      scrollableTable: true,
    },
  },
  IN_MEMO: {
    component: InwardEntryForm,
    props: {
      title: "Inward - Memo Transaction",
      defaultInwardType: "memo",
      showRPcs: true,
      initialLineCount: 7,
      visibleRowCount: 7,
      scrollableTable: true,
    },
  },
  SALE: {
    component: OutwardEntryForm,
    props: {
      outwardType: "sale",
    },
  },
  OUT_MEMO: {
    component: OutwardEntryForm,
    props: {
      outwardType: "memo",
    },
  },
  CONSIGN: {
    component: OutwardEntryForm,
    props: {
      outwardType: "consign",
    },
  },
  GIA: {
    component: OutwardEntryForm,
    props: {
      outwardType: "lab",
    },
  },
  EXPORT: {
    component: OutwardEntryForm,
    props: {
      outwardType: "export",
    },
  },
};

/**
 * Generic Transaction Stock Entry Component
 * @param {{ type: 'PURCHASE' | 'IN_MEMO' | 'SALE' | 'OUT_MEMO' | 'CONSIGN' | 'GIA' | 'EXPORT' }} props
 */
export const TransactionStockEntry = ({ type = "PURCHASE", ...overrideProps }) => {
  const normalizedType = String(type).toUpperCase();
  const entryConfig = STOCK_ENTRY_CONFIG[normalizedType] || STOCK_ENTRY_CONFIG.PURCHASE;
  const TargetComponent = entryConfig.component;
  const mergedProps = { ...entryConfig.props, ...overrideProps };

  return <TargetComponent {...mergedProps} />;
};

export default TransactionStockEntry;
