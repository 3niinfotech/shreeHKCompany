import {
  type ColorTokens,
  dashboardDarkOverrides,
  dashboardLightOverrides,
  getDarkColors,
  getLightColors,
  mergeColorTokens,
} from "./colors";
import {
  darkShadowOverrides,
  dashboardShadowOverrides,
  type ShadowTokens,
  shadows,
} from "./shadows";
import {
  dashboardSpacingOverrides,
  type SpacingTokens,
  spacing,
} from "./spacing";
import { type TypographyTokens, typography } from "./typography";

export type ThemeMode = "light" | "dark";
export type ViewMode = "web" | "dashboard";

export type ThemeTokens = ColorTokens &
  TypographyTokens &
  SpacingTokens &
  ShadowTokens;

function camelToKebab(key: string): string {
  return key
    .replace(/([a-z])([0-9])/g, "$1-$2")
    .replace(/([A-Z])/g, "-$1")
    .toLowerCase();
}

/** Convert camelCase token keys to CSS custom property names (--color-primary, etc.) */
export function tokenKeyToCssVar(key: string): string {
  const kebab = camelToKebab(key);
  return `--${kebab}`;
}

export function tokensToCssVars(tokens: ThemeTokens): Record<string, string> {
  const vars: Record<string, string> = {};
  for (const [key, value] of Object.entries(tokens)) {
    vars[tokenKeyToCssVar(key)] = String(value);
  }

  // Legacy aliases used across existing SCSS (backward compatible)
  vars["--color-page-bg"] = tokens.colorBgPage;
  vars["--color-card-bg"] = tokens.colorBgCard;
  vars["--table-row-hover"] = tokens.colorTableRowHover;
  vars["--table-row-zebra"] = tokens.colorTableRowZebra;
  vars["--radius-card"] = tokens.radiusCard;
  vars["--radius-control"] = tokens.radiusControl;

  return vars;
}

export function resolveTheme(
  mode: ThemeMode,
  viewMode: ViewMode = "web"
): ThemeTokens {
  const baseColors =
    mode === "dark" ? getDarkColors() : getLightColors();

  let colors = baseColors;
  let space = { ...spacing };
  let shade = { ...shadows };

  if (viewMode === "dashboard") {
    colors = mergeColorTokens(
      colors,
      mode === "dark" ? dashboardDarkOverrides : dashboardLightOverrides
    );
    space = { ...space, ...dashboardSpacingOverrides };
    shade = { ...shade, ...dashboardShadowOverrides };
  }

  if (mode === "dark") {
    shade = { ...shade, ...darkShadowOverrides };
  }

  return {
    ...colors,
    ...typography,
    ...space,
    ...shade,
  };
}

export { typography, spacing, shadows };
export type { ColorTokens, TypographyTokens, SpacingTokens, ShadowTokens };
