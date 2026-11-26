/**
 * Semantic color tokens — single source of truth for light / dark / dashboard variants.
 * Values are applied as CSS custom properties via applyTheme().
 */

export type ColorTokens = {
  // Brand
  colorPrimary: string;
  colorPrimaryDark: string;
  colorPrimaryMedium: string;
  colorPrimaryLight: string;
  colorPrimaryPale: string;
  colorSecondary: string;
  colorSecondaryDark: string;
  colorSecondaryLight: string;

  // Semantic
  colorSuccess: string;
  colorSuccessDark: string;
  colorSuccessLight: string;
  colorWarning: string;
  colorWarningDark: string;
  colorWarningLight: string;
  colorError: string;
  colorErrorDark: string;
  colorErrorLight: string;
  colorInfo: string;
  colorInfoDark: string;
  colorInfoLight: string;

  // Backgrounds
  colorBgPage: string;
  colorBgSurface: string;
  colorBgCard: string;
  colorBgElevated: string;
  colorBgOverlay: string;
  colorBgMuted: string;

  // Text
  colorTextHeading: string;
  colorTextBody: string;
  colorTextMuted: string;
  colorTextInverse: string;
  colorTextOnPrimary: string;
  colorTextLink: string;

  // Borders
  colorBorder: string;
  colorBorderStrong: string;
  colorBorderFocus: string;

  // Layout chrome
  colorHeaderBg: string;
  colorHeaderBgDark: string;
  colorNavActive: string;
  colorNavText: string;
  colorSidebarBg: string;
  colorSidebarFooterBg: string;
  colorSidebarAccent: string;
  colorSidebarActiveBg: string;
  colorSidebarHoverBg: string;
  colorSidebarBorder: string;
  colorNavbarBg: string;
  colorFooterBg: string;
  colorFooterText: string;

  // Tables
  colorTableHeaderBg: string;
  colorTableHeaderText: string;
  colorTableRowBg: string;
  colorTableRowZebra: string;
  colorTableRowHover: string;
  colorTableRowSelected: string;
  colorTableBorder: string;
  colorTableInventoryHeaderBg: string;
  colorTableInventoryHeaderHover: string;

  // Buttons
  colorBtnPrimaryBg: string;
  colorBtnPrimaryHover: string;
  colorBtnPrimaryText: string;
  colorBtnSecondaryBg: string;
  colorBtnSecondaryHover: string;
  colorBtnSecondaryText: string;
  colorBtnOutlineBorder: string;
  colorBtnOutlineText: string;
  colorBtnDangerBg: string;
  colorBtnDangerHover: string;
  colorBtnDangerText: string;
  colorBtnSaveBg: string;
  colorBtnSaveHover: string;
  colorBtnCancelBg: string;
  colorBtnCancelHover: string;

  // Forms
  colorInputBg: string;
  colorInputBorder: string;
  colorInputText: string;
  colorInputPlaceholder: string;
  colorInputFocusBorder: string;
  colorInputFocusRing: string;
  colorSelectBg: string;
  colorCheckboxBorder: string;
  colorCheckboxChecked: string;

  // Modal / popup
  colorModalBg: string;
  colorModalBorder: string;
  colorModalHeaderBorder: string;
  colorModalTitle: string;
  colorModalDangerBg: string;
  colorPopoverBg: string;
  colorPopoverBorder: string;

  // Badge / alert
  colorBadgeSuccessBg: string;
  colorBadgeSuccessText: string;
  colorBadgeSuccessBorder: string;
  colorBadgeWarningBg: string;
  colorBadgeWarningText: string;
  colorBadgeWarningBorder: string;
  colorBadgeErrorBg: string;
  colorBadgeErrorText: string;
  colorBadgeErrorBorder: string;
  colorBadgeInfoBg: string;
  colorBadgeInfoText: string;
  colorBadgeInfoBorder: string;
  colorBadgeNeutralBg: string;
  colorBadgeNeutralText: string;
  colorAlertSuccessBg: string;
  colorAlertSuccessText: string;
  colorAlertWarningBg: string;
  colorAlertWarningText: string;
  colorAlertErrorBg: string;
  colorAlertErrorText: string;
  colorAlertInfoBg: string;
  colorAlertInfoText: string;

  // Status indicators
  colorStatusOnline: string;
  colorStatusOnlineBg: string;
  colorStatusOnlineBorder: string;
  colorStatusOffline: string;
  colorStatusOfflineBg: string;
  colorStatusOfflineBorder: string;

  // Chart / accent (dashboard)
  colorChartViolet: string;
  colorChartMuted: string;
  colorAccentGold: string;

  // Smart search entity badges
  colorEntityProductBg: string;
  colorEntityProductText: string;
  colorEntityCustomerBg: string;
  colorEntityCustomerText: string;
  colorEntityOrderBg: string;
  colorEntityOrderText: string;
  colorEntityOtherBg: string;
  colorEntityOtherText: string;

  // Legacy aliases (used across existing SCSS)
  colorNavy: string;
  colorNeutral: string;
  colorDanger: string;
  colorDangerLight: string;
};

/** ShreeHK teal brand palette */
const BRAND_PRIMARY = "#0D7B6B";
const BRAND_PRIMARY_DARK = "#095B50";
const BRAND_PRIMARY_DARKER = "#06483F";
const BRAND_PRIMARY_MEDIUM = "#249989";
const BRAND_PRIMARY_LIGHT = "#E6F4F1";
const BRAND_PRIMARY_PALE = "#F2FAF8";
const BRAND_PRIMARY_FOCUS_RING = "rgba(13, 123, 107, 0.18)";
const BRAND_PRIMARY_ACTIVE_BG = "rgba(13, 123, 107, 0.14)";
const BRAND_SIDEBAR_BG = "#1A2B3C";
const BRAND_SIDEBAR_FOOTER = "#142231";
const ERP_NAVY = "#1F2937";
const ERP_BODY = "#374151";
const ERP_MUTED = "#64748B";
const ERP_BORDER = "#DDE4EA";
const ERP_PAGE = "#F4F6F8";

const lightColors: ColorTokens = {
  colorPrimary: BRAND_PRIMARY,
  colorPrimaryDark: BRAND_PRIMARY_DARK,
  colorPrimaryMedium: BRAND_PRIMARY_MEDIUM,
  colorPrimaryLight: BRAND_PRIMARY_LIGHT,
  colorPrimaryPale: BRAND_PRIMARY_PALE,
  colorSecondary: BRAND_SIDEBAR_BG,
  colorSecondaryDark: BRAND_SIDEBAR_FOOTER,
  colorSecondaryLight: "#2E7D73",

  colorSuccess: "#2F9E6A",
  colorSuccessDark: "#247A52",
  colorSuccessLight: "#ECF9F2",
  colorWarning: "#D4920A",
  colorWarningDark: "#B07808",
  colorWarningLight: "#FFF8E8",
  colorError: "#DC3D43",
  colorErrorDark: "#B91C22",
  colorErrorLight: "#FEF2F2",
  colorInfo: "#2B6CB0",
  colorInfoDark: "#1E4E8C",
  colorInfoLight: "#EBF3FC",

  colorBgPage: ERP_PAGE,
  colorBgSurface: "#ffffff",
  colorBgCard: "#ffffff",
  colorBgElevated: "#ffffff",
  colorBgOverlay: "rgba(244, 245, 249, 0.82)",
  colorBgMuted: "#EBEDF4",

  colorTextHeading: ERP_NAVY,
  colorTextBody: ERP_BODY,
  colorTextMuted: ERP_MUTED,
  colorTextInverse: "#ffffff",
  colorTextOnPrimary: "#ffffff",
  colorTextLink: BRAND_PRIMARY_DARK,

  colorBorder: ERP_BORDER,
  colorBorderStrong: "#D0D4E2",
  colorBorderFocus: BRAND_PRIMARY,

  colorHeaderBg: BRAND_PRIMARY_DARK,
  colorHeaderBgDark: BRAND_PRIMARY_DARKER,
  colorNavActive: BRAND_PRIMARY,
  colorNavText: "#64708B",
  colorSidebarBg: BRAND_SIDEBAR_BG,
  colorSidebarFooterBg: BRAND_SIDEBAR_FOOTER,
  colorSidebarAccent: BRAND_PRIMARY_MEDIUM,
  colorSidebarActiveBg: BRAND_PRIMARY_ACTIVE_BG,
  colorSidebarHoverBg: "rgba(255, 255, 255, 0.07)",
  colorSidebarBorder: "rgba(255, 255, 255, 0.09)",
  colorNavbarBg: "#ffffff",
  colorFooterBg: ERP_PAGE,
  colorFooterText: "#B8954A",

  colorTableHeaderBg: "#f2f6f9",
  colorTableHeaderText: "#334155",
  colorTableRowBg: "#ffffff",
  colorTableRowZebra: "#F9FAFC",
  colorTableRowHover: "#F0F1F8",
  colorTableRowSelected: BRAND_PRIMARY_LIGHT,
  colorTableBorder: ERP_BORDER,
  colorTableInventoryHeaderBg: "#f2f6f9",
  colorTableInventoryHeaderHover: "#e2e8f0",

  colorBtnPrimaryBg: BRAND_PRIMARY,
  colorBtnPrimaryHover: BRAND_PRIMARY_DARK,
  colorBtnPrimaryText: "#ffffff",
  colorBtnSecondaryBg: "#ffffff",
  colorBtnSecondaryHover: "#F7F8FB",
  colorBtnSecondaryText: ERP_MUTED,
  colorBtnOutlineBorder: ERP_BORDER,
  colorBtnOutlineText: ERP_MUTED,
  colorBtnDangerBg: "#DC3D43",
  colorBtnDangerHover: "#B91C22",
  colorBtnDangerText: "#ffffff",
  colorBtnSaveBg: "#2F9E6A",
  colorBtnSaveHover: "#247A52",
  colorBtnCancelBg: "#6B7285",
  colorBtnCancelHover: "#525866",

  colorInputBg: "#ffffff",
  colorInputBorder: ERP_BORDER,
  colorInputText: ERP_BODY,
  colorInputPlaceholder: "rgba(107, 114, 133, 0.68)",
  colorInputFocusBorder: BRAND_PRIMARY,
  colorInputFocusRing: BRAND_PRIMARY_FOCUS_RING,
  colorSelectBg: "#ffffff",
  colorCheckboxBorder: ERP_BORDER,
  colorCheckboxChecked: BRAND_PRIMARY,

  colorModalBg: "#ffffff",
  colorModalBorder: ERP_BORDER,
  colorModalHeaderBorder: ERP_BORDER,
  colorModalTitle: ERP_NAVY,
  colorModalDangerBg: "#FEF2F2",
  colorPopoverBg: "#ffffff",
  colorPopoverBorder: ERP_BORDER,

  colorBadgeSuccessBg: "rgba(47, 158, 106, 0.12)",
  colorBadgeSuccessText: "#247A52",
  colorBadgeSuccessBorder: "rgba(47, 158, 106, 0.32)",
  colorBadgeWarningBg: "rgba(212, 146, 10, 0.12)",
  colorBadgeWarningText: "#B07808",
  colorBadgeWarningBorder: "rgba(212, 146, 10, 0.32)",
  colorBadgeErrorBg: "rgba(220, 61, 67, 0.1)",
  colorBadgeErrorText: "#B91C22",
  colorBadgeErrorBorder: "rgba(220, 61, 67, 0.32)",
  colorBadgeInfoBg: "rgba(13, 123, 107, 0.10)",
  colorBadgeInfoText: BRAND_PRIMARY_DARK,
  colorBadgeInfoBorder: "rgba(13, 123, 107, 0.28)",
  colorBadgeNeutralBg: "#EEF0F5",
  colorBadgeNeutralText: "#475569",
  colorAlertSuccessBg: "#ECF9F2",
  colorAlertSuccessText: "#166534",
  colorAlertWarningBg: "#FFF8E8",
  colorAlertWarningText: "#92400E",
  colorAlertErrorBg: "#FEF2F2",
  colorAlertErrorText: "#9F1239",
  colorAlertInfoBg: BRAND_PRIMARY_LIGHT,
  colorAlertInfoText: BRAND_PRIMARY_DARKER,

  colorStatusOnline: "#34D399",
  colorStatusOnlineBg: "rgba(16, 185, 129, 0.16)",
  colorStatusOnlineBorder: "rgba(16, 185, 129, 0.32)",
  colorStatusOffline: "#F87171",
  colorStatusOfflineBg: "rgba(239, 68, 68, 0.16)",
  colorStatusOfflineBorder: "rgba(239, 68, 68, 0.32)",

  colorChartViolet: BRAND_PRIMARY,
  colorChartMuted: "#CBD0DC",
  colorAccentGold: "#B8954A",

  colorEntityProductBg: BRAND_PRIMARY_LIGHT,
  colorEntityProductText: BRAND_PRIMARY_DARK,
  colorEntityCustomerBg: "#EAF1F5",
  colorEntityCustomerText: "#334155",
  colorEntityOrderBg: "#FFF8E8",
  colorEntityOrderText: "#92400E",
  colorEntityOtherBg: BRAND_PRIMARY_PALE,
  colorEntityOtherText: BRAND_PRIMARY_DARKER,

  colorNavy: ERP_NAVY,
  colorNeutral: ERP_MUTED,
  colorDanger: "#DC3D43",
  colorDangerLight: "#FEF2F2",
};

const darkColors: Partial<ColorTokens> = {
  colorPrimary: BRAND_PRIMARY_MEDIUM,
  colorPrimaryDark: BRAND_PRIMARY,
  colorPrimaryMedium: BRAND_PRIMARY_MEDIUM,
  colorPrimaryLight: "#183B37",
  colorPrimaryPale: "#122C28",
  colorSecondary: "#E2E8F0",
  colorSecondaryDark: "#94A3B8",
  colorSecondaryLight: "#CBD5E1",

  colorSuccessLight: "#163528",
  colorWarningLight: "#3A2E14",
  colorErrorLight: "#3A181A",
  colorInfoLight: "#1A2740",

  colorBgPage: "#101820",
  colorBgSurface: "#16212B",
  colorBgCard: "#16212B",
  colorBgElevated: "#1D2B36",
  colorBgOverlay: "rgba(16, 24, 32, 0.88)",
  colorBgMuted: "#121C24",

  colorTextHeading: "#E8EAF2",
  colorTextBody: "#C8CDD9",
  colorTextMuted: "#8B93A7",
  colorTextInverse: "#F8FAFC",
  colorTextOnPrimary: "#F1F5F9",
  colorTextLink: BRAND_PRIMARY_MEDIUM,

  colorBorder: "#2B3A45",
  colorBorderStrong: "#3A4D59",
  colorBorderFocus: BRAND_PRIMARY_MEDIUM,

  colorHeaderBg: "#121C24",
  colorHeaderBgDark: "#101820",
  colorNavActive: BRAND_PRIMARY_MEDIUM,
  colorNavText: "#8B93A7",
  colorSidebarBg: "#12222E",
  colorSidebarFooterBg: "#0D171E",
  colorSidebarAccent: BRAND_PRIMARY_MEDIUM,
  colorSidebarActiveBg: "rgba(36, 153, 137, 0.20)",
  colorSidebarHoverBg: "rgba(255, 255, 255, 0.05)",
  colorSidebarBorder: "rgba(255, 255, 255, 0.07)",
  colorNavbarBg: "#151322",
  colorFooterBg: "#151322",
  colorFooterText: "#B8954A",

  colorTableHeaderBg: "#1D2B36",
  colorTableHeaderText: "#C6D5DE",
  colorTableRowBg: "#16212B",
  colorTableRowZebra: "#121C24",
  colorTableRowHover: "#1D2B36",
  colorTableRowSelected: "#183B37",
  colorTableBorder: "#2B3A45",
  colorTableInventoryHeaderBg: "#1D2B36",
  colorTableInventoryHeaderHover: "#263A46",

  colorBtnSecondaryBg: "#16212B",
  colorBtnSecondaryHover: "#1D2B36",
  colorBtnSecondaryText: "#8B93A7",
  colorBtnOutlineBorder: "#2B3A45",
  colorBtnOutlineText: "#8B93A7",

  colorInputBg: "#16212B",
  colorInputBorder: "#2B3A45",
  colorInputText: "#C8CDD9",
  colorInputPlaceholder: "rgba(139, 147, 167, 0.65)",
  colorInputFocusBorder: BRAND_PRIMARY_MEDIUM,
  colorInputFocusRing: "rgba(36, 153, 137, 0.24)",
  colorSelectBg: "#16212B",
  colorCheckboxBorder: "#2B3A45",
  colorCheckboxChecked: BRAND_PRIMARY_MEDIUM,

  colorModalBg: "#16212B",
  colorModalBorder: "#2B3A45",
  colorModalHeaderBorder: "#2B3A45",
  colorModalTitle: "#E8EAF2",
  colorModalDangerBg: "#3A181A",
  colorPopoverBg: "#121C24",
  colorPopoverBorder: "#2B3A45",

  colorBadgeNeutralBg: "#1C1A2E",
  colorBadgeNeutralText: "#8B93A7",
  colorAlertSuccessBg: "#163528",
  colorAlertSuccessText: "#86EFAC",
  colorAlertWarningBg: "#3A2E14",
  colorAlertWarningText: "#FBBF24",
  colorAlertErrorBg: "#3A181A",
  colorAlertErrorText: "#FCA5A5",
  colorAlertInfoBg: "#183B37",
  colorAlertInfoText: "#95D7CD",

  colorStatusOnline: "#86EFAC",
  colorStatusOnlineBg: "rgba(16, 185, 129, 0.18)",
  colorStatusOnlineBorder: "rgba(16, 185, 129, 0.32)",
  colorStatusOffline: "#FCA5A5",
  colorStatusOfflineBg: "rgba(239, 68, 68, 0.18)",
  colorStatusOfflineBorder: "rgba(239, 68, 68, 0.32)",

  colorNavy: "#E8EAF2",
  colorNeutral: "#8B93A7",
  colorDangerLight: "#3A181A",
};

/** Dashboard palette (light) — clean ERP chrome */
export const dashboardLightOverrides: Partial<ColorTokens> = {
  colorPrimary: BRAND_PRIMARY,
  colorPrimaryDark: BRAND_PRIMARY_DARK,
  colorPrimaryMedium: BRAND_PRIMARY_MEDIUM,
  colorPrimaryLight: BRAND_PRIMARY_LIGHT,
  colorPrimaryPale: BRAND_PRIMARY_PALE,
  colorSuccess: "#2F9E6A",
  colorTextHeading: ERP_NAVY,
  colorTextBody: ERP_BODY,
  colorTextMuted: ERP_MUTED,
  colorBgPage: ERP_PAGE,
  colorBgCard: "#ffffff",
  colorBorder: ERP_BORDER,
  colorHeaderBg: "#ffffff",
  colorNavActive: BRAND_PRIMARY,
  colorSidebarBg: "#ffffff",
  colorSidebarFooterBg: ERP_PAGE,
  colorSidebarAccent: BRAND_PRIMARY,
  colorSidebarActiveBg: BRAND_PRIMARY_PALE,
  colorSidebarHoverBg: "#F0F1F8",
  colorSidebarBorder: ERP_BORDER,
  colorTableRowHover: "#F0F1F8",
  colorTableRowZebra: "#F9FAFC",
  colorTableHeaderBg: "#f2f6f9",
  colorInputFocusRing: BRAND_PRIMARY_FOCUS_RING,
  colorNavy: ERP_NAVY,
  colorNeutral: ERP_MUTED,
};

/** Dashboard dark accent overrides */
export const dashboardDarkOverrides: Partial<ColorTokens> = {
  colorPrimary: BRAND_PRIMARY_MEDIUM,
  colorPrimaryDark: BRAND_PRIMARY,
  colorPrimaryLight: "#183B37",
  colorPrimaryPale: "#122C28",
  colorSidebarAccent: BRAND_PRIMARY_MEDIUM,
  colorSidebarActiveBg: "rgba(36, 153, 137, 0.20)",
  colorSidebarHoverBg: "rgba(255, 255, 255, 0.05)",
};

export function getLightColors(): ColorTokens {
  return { ...lightColors };
}

export function getDarkColors(): ColorTokens {
  return { ...lightColors, ...darkColors };
}

export function mergeColorTokens(
  base: ColorTokens,
  overrides: Partial<ColorTokens>
): ColorTokens {
  return { ...base, ...overrides };
}
