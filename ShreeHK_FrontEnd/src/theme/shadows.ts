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
  shadowXs: "0 1px 2px rgba(26, 24, 64, 0.04)",
  shadowSm: "0 1px 3px rgba(26, 24, 64, 0.06)",
  shadowMd: "0 2px 10px rgba(26, 24, 64, 0.08)",
  shadowLg: "0 6px 18px rgba(26, 24, 64, 0.12)",
  shadowXl: "0 12px 32px rgba(26, 24, 64, 0.16)",
  shadowHeader: "0 1px 0 rgba(26, 24, 64, 0.06)",
  shadowCard: "0 1px 3px rgba(26, 24, 64, 0.04), 0 4px 14px rgba(26, 24, 64, 0.05)",
  shadowModal: "0 8px 32px rgba(26, 24, 64, 0.18)",
  shadowDropdown: "0 6px 20px rgba(26, 24, 64, 0.12)",
  shadowTabActive: "0 -1px 0 var(--color-bg-card), 0 -4px 12px rgba(26, 24, 64, 0.06)",
  shadowInventoryTable: "0 2px 14px rgba(26, 24, 64, 0.08)",
  shadowFooter: "0 -1px 6px rgba(26, 24, 64, 0.05)",
};

export const darkShadowOverrides: Partial<ShadowTokens> = {
  shadowMd: "0 2px 10px rgba(0, 0, 0, 0.35)",
  shadowLg: "0 6px 18px rgba(0, 0, 0, 0.28)",
  shadowCard: "0 1px 3px rgba(0, 0, 0, 0.2), 0 4px 14px rgba(0, 0, 0, 0.22)",
  shadowTabActive: "0 -1px 0 var(--color-bg-card), 0 -4px 12px rgba(0, 0, 0, 0.28)",
  shadowInventoryTable: "0 2px 14px rgba(0, 0, 0, 0.28)",
  shadowFooter: "0 -1px 6px rgba(0, 0, 0, 0.2)",
};

export const dashboardShadowOverrides: Partial<ShadowTokens> = {
  shadowHeader: "0 1px 3px rgba(26, 24, 64, 0.06)",
};
