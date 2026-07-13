export type ShadowTokens = {
  shadowXs: string;
  shadowSm: string;
  shadowMd: string;
  shadowLg: string;
  shadowXl: string;
  shadowHeader: string;
  shadowCard: string;
  shadowModal: string;
  shadowDropdown: string;
  shadowTabActive: string;
  shadowInventoryTable: string;
  shadowFooter: string;
};

export const shadows: ShadowTokens = {
  shadowXs: "0 1px 2px rgba(0, 0, 0, 0.04)",
  shadowSm: "0 1px 3px rgba(0, 0, 0, 0.06)",
  shadowMd: "0 2px 8px rgba(0, 0, 0, 0.08)",
  shadowLg: "0 4px 12px rgba(0, 0, 0, 0.12)",
  shadowXl: "0 8px 24px rgba(0, 0, 0, 0.16)",
  shadowHeader: "0 1px 0 rgba(0, 0, 0, 0.08)",
  shadowCard: "0 2px 8px rgba(0, 0, 0, 0.05)",
  shadowModal: "0 4px 24px rgba(0, 0, 0, 0.15)",
  shadowDropdown: "0 4px 16px rgba(0, 0, 0, 0.12)",
  shadowTabActive: "0 -1px 0 var(--color-bg-card), 0 -4px 12px rgba(0, 0, 0, 0.06)",
  shadowInventoryTable: "0 2px 12px rgba(0, 0, 0, 0.08)",
  shadowFooter: "0 -1px 6px rgba(0, 0, 0, 0.06)",
};

export const darkShadowOverrides: Partial<ShadowTokens> = {
  shadowMd: "0 2px 8px rgba(0, 0, 0, 0.35)",
  shadowLg: "0 4px 12px rgba(0, 0, 0, 0.25)",
  shadowCard: "0 2px 8px rgba(0, 0, 0, 0.2)",
  shadowTabActive: "0 -1px 0 var(--color-bg-card), 0 -4px 12px rgba(0, 0, 0, 0.28)",
  shadowInventoryTable: "0 2px 12px rgba(0, 0, 0, 0.25)",
  shadowFooter: "0 -1px 6px rgba(0, 0, 0, 0.2)",
};

export const dashboardShadowOverrides: Partial<ShadowTokens> = {
  shadowHeader: "0 1px 3px rgba(27, 94, 59, 0.06)",
};
