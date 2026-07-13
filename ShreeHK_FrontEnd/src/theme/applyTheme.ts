import { resolveTheme, tokensToCssVars, type ThemeMode, type ViewMode } from "./theme";

/**
 * Apply resolved theme tokens as CSS custom properties on :root.
 * Call on mount and whenever mode / viewMode changes.
 */
export function applyTheme(
  mode: ThemeMode,
  viewMode: ViewMode = "web"
): void {
  if (typeof document === "undefined") return;

  const tokens = resolveTheme(mode, viewMode);
  const vars = tokensToCssVars(tokens);
  const root = document.documentElement;

  for (const [name, value] of Object.entries(vars)) {
    root.style.setProperty(name, value);
  }
}

/** Returns a CSS var() reference for use in inline styles or JS */
export function cssVar(tokenName: string): string {
  const kebab = tokenName.startsWith("--")
    ? tokenName
    : `--${tokenName.replace(/([A-Z])/g, "-$1").toLowerCase()}`;
  return `var(${kebab})`;
}

/** Read resolved color values for charts / canvas (needs actual hex, not var()) */
export function getThemeColorValues(
  mode: ThemeMode,
  viewMode: ViewMode = "web"
) {
  const t = resolveTheme(mode, viewMode);
  return {
    primary: t.colorPrimary,
    primaryMedium: t.colorPrimaryMedium,
    primaryLight: t.colorPrimaryLight,
    primarySoft: t.colorPrimary,
    mint: t.colorPrimaryLight,
    mintPale: t.colorPrimaryPale,
    warning: t.colorWarning,
    warningLight: t.colorWarningLight,
    danger: t.colorError,
    violet: t.colorChartViolet,
    success: t.colorSuccess,
    muted: t.colorChartMuted,
    textMuted: t.colorTextMuted,
    textHeading: t.colorTextHeading,
    textBody: t.colorTextBody,
    bgCard: t.colorBgCard,
    bgPage: t.colorBgPage,
    border: t.colorBorder,
    navActive: t.colorNavActive,
    white: t.colorTextInverse,
    error: t.colorError,
    info: t.colorInfo,
    entityProduct: { bg: t.colorEntityProductBg, text: t.colorEntityProductText },
    entityCustomer: { bg: t.colorEntityCustomerBg, text: t.colorEntityCustomerText },
    entityOrder: { bg: t.colorEntityOrderBg, text: t.colorEntityOrderText },
    entityOther: { bg: t.colorEntityOtherBg, text: t.colorEntityOtherText },
  };
}
