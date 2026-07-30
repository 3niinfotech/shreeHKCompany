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

const BRAND_PRIMARY = "#6658DD";
const BRAND_PRIMARY_DARK = "#5246c9";
const BRAND_PRIMARY_DARKER = "#4338b8";
const BRAND_PRIMARY_MEDIUM = "#8578e8";
const BRAND_PRIMARY_LIGHT = "#ede9fe";
const BRAND_PRIMARY_PALE = "#f5f3ff";
const BRAND_PRIMARY_FOCUS_RING = "rgba(102, 88, 221, 0.15)";
const BRAND_PRIMARY_ACTIVE_BG = "rgba(102, 88, 221, 0.35)";
const BRAND_SIDEBAR_BG = "#1e1b4b";
const BRAND_SIDEBAR_FOOTER = "#151329";

const lightColors: ColorTokens = {
  colorPrimary: BRAND_PRIMARY,
  colorPrimaryDark: BRAND_PRIMARY_DARK,
  colorPrimaryMedium: BRAND_PRIMARY_MEDIUM,
  colorPrimaryLight: BRAND_PRIMARY_LIGHT,
  colorPrimaryPale: BRAND_PRIMARY_PALE,
  colorSecondary: BRAND_SIDEBAR_BG,
  colorSecondaryDark: BRAND_SIDEBAR_FOOTER,
  colorSecondaryLight: "#312e81",

  colorSuccess: "#38a169",
  colorSuccessDark: "#2f8558",
  colorSuccessLight: "#ecfdf3",
  colorWarning: "#d69e2e",
  colorWarningDark: "#b7791f",
  colorWarningLight: "#fff8e1",
  colorError: "#e53e3e",
  colorErrorDark: "#c53030",
  colorErrorLight: "#fff5f5",
  colorInfo: "#3182ce",
  colorInfoDark: "#2b6cb0",
  colorInfoLight: "#e8f0fe",

  colorBgPage: "#f8f7fc",
  colorBgSurface: "#ffffff",
  colorBgCard: "#ffffff",
  colorBgElevated: "#ffffff",
  colorBgOverlay: "rgba(255, 255, 255, 0.8)",
  colorBgMuted: "#f3f1fa",

  colorTextHeading: "#1e1b4b",
  colorTextBody: "#1e1b4b",
  colorTextMuted: "#6b7785",
  colorTextInverse: "#ffffff",
  colorTextOnPrimary: "#ffffff",
  colorTextLink: BRAND_PRIMARY_DARK,

  colorBorder: "#e4e1f5",
  colorBorderStrong: "#d8d4ef",
  colorBorderFocus: BRAND_PRIMARY,

  colorHeaderBg: BRAND_PRIMARY_DARK,
  colorHeaderBgDark: BRAND_PRIMARY_DARKER,
  colorNavActive: BRAND_PRIMARY,
  colorNavText: "#64748b",
  colorSidebarBg: BRAND_SIDEBAR_BG,
  colorSidebarFooterBg: BRAND_SIDEBAR_FOOTER,
  colorSidebarAccent: BRAND_PRIMARY_MEDIUM,
  colorSidebarActiveBg: BRAND_PRIMARY_ACTIVE_BG,
  colorSidebarHoverBg: "rgba(255, 255, 255, 0.08)",
  colorSidebarBorder: "rgba(255, 255, 255, 0.1)",
  colorNavbarBg: "#ffffff",
  colorFooterBg: "#f8f7fc",
  colorFooterText: "#c4a35a",

  colorTableHeaderBg: BRAND_PRIMARY_LIGHT,
  colorTableHeaderText: "#1e1b4b",
  colorTableRowBg: "#ffffff",
  colorTableRowZebra: "#fcfcfc",
  colorTableRowHover: "#f3f1fa",
  colorTableRowSelected: BRAND_PRIMARY_LIGHT,
  colorTableBorder: "#e0e5ea",
  colorTableInventoryHeaderBg: BRAND_PRIMARY_PALE,
  colorTableInventoryHeaderHover: BRAND_PRIMARY_LIGHT,

  colorBtnPrimaryBg: BRAND_PRIMARY,
  colorBtnPrimaryHover: BRAND_PRIMARY_DARK,
  colorBtnPrimaryText: "#ffffff",
  colorBtnSecondaryBg: "#ffffff",
  colorBtnSecondaryHover: "#f8fafb",
  colorBtnSecondaryText: "#6b7785",
  colorBtnOutlineBorder: "#e0e5ea",
  colorBtnOutlineText: "#6b7785",
  colorBtnDangerBg: "#e53e3e",
  colorBtnDangerHover: "#c53030",
  colorBtnDangerText: "#ffffff",
  colorBtnSaveBg: "#38a169",
  colorBtnSaveHover: "#2f8558",
  colorBtnCancelBg: "#6b7785",
  colorBtnCancelHover: "#5a6570",

  colorInputBg: "#ffffff",
  colorInputBorder: "#e0e5ea",
  colorInputText: "#1e1b4b",
  colorInputPlaceholder: "rgba(107, 119, 133, 0.65)",
  colorInputFocusBorder: BRAND_PRIMARY,
  colorInputFocusRing: BRAND_PRIMARY_FOCUS_RING,
  colorSelectBg: "#ffffff",
  colorCheckboxBorder: "#e0e5ea",
  colorCheckboxChecked: BRAND_PRIMARY,

  colorModalBg: "#ffffff",
  colorModalBorder: "#e0e5ea",
  colorModalHeaderBorder: "#e0e5ea",
  colorModalTitle: "#1e1b4b",
  colorModalDangerBg: "#fff5f5",
  colorPopoverBg: "#ffffff",
  colorPopoverBorder: "#e0e5ea",

  colorBadgeSuccessBg: "rgba(56, 161, 105, 0.12)",
  colorBadgeSuccessText: "#38a169",
  colorBadgeSuccessBorder: "rgba(56, 161, 105, 0.35)",
  colorBadgeWarningBg: "rgba(214, 158, 46, 0.12)",
  colorBadgeWarningText: "#d69e2e",
  colorBadgeWarningBorder: "rgba(214, 158, 46, 0.35)",
  colorBadgeErrorBg: "rgba(229, 62, 62, 0.1)",
  colorBadgeErrorText: "#e53e3e",
  colorBadgeErrorBorder: "rgba(229, 62, 62, 0.35)",
  colorBadgeInfoBg: "rgba(102, 88, 221, 0.12)",
  colorBadgeInfoText: BRAND_PRIMARY_DARK,
  colorBadgeInfoBorder: "rgba(102, 88, 221, 0.35)",
  colorBadgeNeutralBg: "#f3f4f6",
  colorBadgeNeutralText: "#475569",
  colorAlertSuccessBg: "#ecfdf3",
  colorAlertSuccessText: "#166534",
  colorAlertWarningBg: "#fff8e1",
  colorAlertWarningText: "#b45309",
  colorAlertErrorBg: "#fff1f2",
  colorAlertErrorText: "#9f1239",
  colorAlertInfoBg: BRAND_PRIMARY_LIGHT,
  colorAlertInfoText: BRAND_PRIMARY_DARKER,

  colorStatusOnline: "#4ade80",
  colorStatusOnlineBg: "rgba(34, 197, 94, 0.18)",
  colorStatusOnlineBorder: "rgba(34, 197, 94, 0.35)",
  colorStatusOffline: "#f87171",
  colorStatusOfflineBg: "rgba(239, 68, 68, 0.18)",
  colorStatusOfflineBorder: "rgba(239, 68, 68, 0.35)",

  colorChartViolet: BRAND_PRIMARY,
  colorChartMuted: "#d1d5db",
  colorAccentGold: "#c4a35a",

  colorEntityProductBg: BRAND_PRIMARY_LIGHT,
  colorEntityProductText: BRAND_PRIMARY_DARK,
  colorEntityCustomerBg: "#f3e8ff",
  colorEntityCustomerText: BRAND_PRIMARY_DARK,
  colorEntityOrderBg: "#fff8e1",
  colorEntityOrderText: "#b45309",
  colorEntityOtherBg: BRAND_PRIMARY_PALE,
  colorEntityOtherText: BRAND_PRIMARY_DARKER,

  colorNavy: "#1e1b4b",
  colorNeutral: "#6b7785",
  colorDanger: "#e53e3e",
  colorDangerLight: "#fff5f5",
};

const darkColors: Partial<ColorTokens> = {
  colorPrimary: BRAND_PRIMARY,
  colorPrimaryDark: BRAND_PRIMARY_DARK,
  colorPrimaryMedium: BRAND_PRIMARY_MEDIUM,
  colorPrimaryLight: "#353046",
  colorPrimaryPale: "#1e1738",
  colorSecondary: "#e2e8f0",
  colorSecondaryDark: "#94a3b8",
  colorSecondaryLight: "#cbd5e1",

  colorSuccessLight: "#1e3a32",
  colorWarningLight: "#3d3420",
  colorErrorLight: "#3d2020",
  colorInfoLight: "#1e293b",

  colorBgPage: "#0f0e17",
  colorBgSurface: "#1a1830",
  colorBgCard: "#1a1830",
  colorBgElevated: "#221f3d",
  colorBgOverlay: "rgba(15, 14, 23, 0.88)",
  colorBgMuted: "#151328",

  colorTextHeading: "#e2e8f0",
  colorTextBody: "#e2e8f0",
  colorTextMuted: "#94a3b8",
  colorTextInverse: "#f8fafc",
  colorTextOnPrimary: "#f1f5f9",
  colorTextLink: BRAND_PRIMARY_MEDIUM,

  colorBorder: "#2e2649",
  colorBorderStrong: "#3b3560",
  colorBorderFocus: BRAND_PRIMARY_MEDIUM,

  colorHeaderBg: "#151329",
  colorHeaderBgDark: "#0f0d22",
  colorNavActive: BRAND_PRIMARY_MEDIUM,
  colorNavText: "#94a3b8",
  colorSidebarBg: "#120f2e",
  colorSidebarFooterBg: "#0c0a1f",
  colorSidebarAccent: BRAND_PRIMARY_MEDIUM,
  colorSidebarActiveBg: "rgba(102, 88, 221, 0.24)",
  colorSidebarHoverBg: "rgba(255, 255, 255, 0.06)",
  colorSidebarBorder: "rgba(255, 255, 255, 0.08)",
  colorNavbarBg: "#1a1830",
  colorFooterBg: "#1a1830",
  colorFooterText: "#c4a35a",

  colorTableHeaderBg: "#221f3d",
  colorTableHeaderText: "#c4b5fd",
  colorTableRowBg: "#1a1830",
  colorTableRowZebra: "#151328",
  colorTableRowHover: "#221f3d",
  colorTableRowSelected: "#2e2649",
  colorTableBorder: "#2e2649",
  colorTableInventoryHeaderBg: "#221f3d",
  colorTableInventoryHeaderHover: "#2e2649",

  colorBtnSecondaryBg: "#1a1830",
  colorBtnSecondaryHover: "#221f3d",
  colorBtnSecondaryText: "#94a3b8",
  colorBtnOutlineBorder: "#2e2649",
  colorBtnOutlineText: "#94a3b8",

  colorInputBg: "#1a1830",
  colorInputBorder: "#2e2649",
  colorInputText: "#e2e8f0",
  colorInputPlaceholder: "rgba(148, 163, 184, 0.65)",
  colorInputFocusBorder: BRAND_PRIMARY_MEDIUM,
  colorInputFocusRing: "rgba(102, 88, 221, 0.22)",
  colorSelectBg: "#1a1830",
  colorCheckboxBorder: "#2e2649",
  colorCheckboxChecked: BRAND_PRIMARY_MEDIUM,

  colorModalBg: "#1a1830",
  colorModalBorder: "#2e2649",
  colorModalHeaderBorder: "#2e2649",
  colorModalTitle: "#e2e8f0",
  colorModalDangerBg: "#3d2020",
  colorPopoverBg: "#151329",
  colorPopoverBorder: "#2e2649",

  colorBadgeNeutralBg: "#221f3d",
  colorBadgeNeutralText: "#94a3b8",
  colorAlertSuccessBg: "#1e3a32",
  colorAlertSuccessText: "#86efac",
  colorAlertWarningBg: "#3d3420",
  colorAlertWarningText: "#fbbf24",
  colorAlertErrorBg: "#3d2020",
  colorAlertErrorText: "#fca5a5",
  colorAlertInfoBg: "#2e2649",
  colorAlertInfoText: "#c4b5fd",

  colorStatusOnline: "#86efac",
  colorStatusOnlineBg: "rgba(34, 197, 94, 0.18)",
  colorStatusOnlineBorder: "rgba(34, 197, 94, 0.35)",
  colorStatusOffline: "#fca5a5",
  colorStatusOfflineBg: "rgba(239, 68, 68, 0.18)",
  colorStatusOfflineBorder: "rgba(239, 68, 68, 0.35)",

  colorNavy: "#e2e8f0",
  colorNeutral: "#94a3b8",
  colorDangerLight: "#3d2020",
};

/** Donezo-inspired dashboard palette (light) */
export const dashboardLightOverrides: Partial<ColorTokens> = {
  colorPrimary: BRAND_PRIMARY,
  colorPrimaryDark: BRAND_PRIMARY_DARK,
  colorPrimaryMedium: BRAND_PRIMARY_MEDIUM,
  colorPrimaryLight: BRAND_PRIMARY_LIGHT,
  colorPrimaryPale: BRAND_PRIMARY_PALE,
  colorSuccess: "#38a169",
  colorTextHeading: "#1e1b4b",
  colorTextBody: "#1e1b4b",
  colorTextMuted: "#6b7280",
  colorBgPage: "#f8f7fc",
  colorBgCard: "#ffffff",
  colorBorder: "#e4e1f5",
  colorHeaderBg: "#ffffff",
  colorNavActive: BRAND_PRIMARY,
  colorSidebarBg: "#ffffff",
  colorSidebarFooterBg: "#f8f7fc",
  colorSidebarAccent: BRAND_PRIMARY,
  colorSidebarActiveBg: BRAND_PRIMARY_PALE,
  colorSidebarHoverBg: "#f3f1fa",
  colorSidebarBorder: "#e4e1f5",
  colorTableRowHover: "#f3f1fa",
  colorTableRowZebra: "#faf9fd",
  colorTableHeaderBg: BRAND_PRIMARY_LIGHT,
  colorInputFocusRing: BRAND_PRIMARY_FOCUS_RING,
  colorNavy: "#1e1b4b",
  colorNeutral: "#6b7280",
};

/** Dashboard dark accent overrides */
export const dashboardDarkOverrides: Partial<ColorTokens> = {
  colorPrimary: BRAND_PRIMARY_MEDIUM,
  colorPrimaryDark: BRAND_PRIMARY,
  colorPrimaryLight: "#2e2649",
  colorPrimaryPale: "#1e1738",
  colorSidebarAccent: BRAND_PRIMARY_MEDIUM,
  colorSidebarActiveBg: "rgba(102, 88, 221, 0.2)",
  colorSidebarHoverBg: "rgba(255, 255, 255, 0.06)",
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
