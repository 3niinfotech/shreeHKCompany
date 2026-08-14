export type SpacingTokens = {
  spacing0: string;
  spacing1: string;
  spacing2: string;
  spacing3: string;
  spacing4: string;
  spacing5: string;
  spacing6: string;
  spacing8: string;
  spacing10: string;
  spacing12: string;
  spacing16: string;
  spacing20: string;
  radiusXs: string;
  radiusSm: string;
  radiusMd: string;
  radiusLg: string;
  radiusXl: string;
  radiusFull: string;
  radiusCard: string;
  radiusControl: string;
  layoutHeaderHeight: string;
  layoutSidebarWidth: string;
  layoutSidebarCollapsed: string;
  blurAmount: string;
  borderWidthThin: string;
  borderWidthDefault: string;
};

export const spacing: SpacingTokens = {
  spacing0: "0",
  spacing1: "4px",
  spacing2: "8px",
  spacing3: "12px",
  spacing4: "16px",
  spacing5: "20px",
  spacing6: "24px",
  spacing8: "32px",
  spacing10: "40px",
  spacing12: "48px",
  spacing16: "64px",
  spacing20: "80px",
  radiusXs: "4px",
  radiusSm: "6px",
  radiusMd: "8px",
  radiusLg: "12px",
  radiusXl: "16px",
  radiusFull: "9999px",
  radiusCard: "12px",
  radiusControl: "4px",
  layoutHeaderHeight: "64px",
  layoutSidebarWidth: "240px",
  layoutSidebarCollapsed: "72px",
  blurAmount: "4px",
  borderWidthThin: "0.5px",
  borderWidthDefault: "1px",
};

/** Dashboard view uses slightly larger card radius */
export const dashboardSpacingOverrides: Partial<SpacingTokens> = {
  radiusCard: "16px",
};
