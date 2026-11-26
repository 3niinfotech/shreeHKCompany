# CRM UI design system

The CRM uses one shared theme for both web and dashboard views. Shared component appearance is defined in `src/theme/` and `src/assets/scss/_app-standardization.scss`; use those defaults instead of adding page-specific rules for controls, cards, tables, or typography.

## Theme sources

- `src/theme/colors.ts` — light and dark semantic colors, including text, surfaces, borders, status, and actions.
- `src/theme/typography.ts` — Inter font family, type scale, weights, and line heights.
- `src/theme/spacing.ts` — spacing, control and card radii, and layout dimensions.
- `src/theme/shadows.ts` — shared surface and overlay shadows.
- `src/theme/antdTheme.ts` — Ant Design tokens for buttons, cards, inputs, tables, tabs, and overlays.
- `src/assets/scss/_app-standardization.scss` — global defaults and responsive rules; it is imported last by `src/index.scss` so shared defaults win over legacy global rules.

`ThemeApplier` updates the CSS variables when the color mode changes. Prefer semantic variables such as `var(--color-primary)`, `var(--color-text-muted)`, `var(--color-border)`, and `var(--color-bg-card)` over literal colors.

## Typography

Use Inter through `var(--font-family-base)`. The shared scale is 12px, 13px, 14px, 16px, 18px, 22px, and 28px; use monospace only for identifiers, raw JSON, and code-like values.

## Shared page classes

- `.crm-page-shell` — responsive page spacing and vertical section gap.
- `.crm-page-header`, `.crm-page-title`, `.crm-page-subtitle` — page heading hierarchy.
- `.crm-section-stack` — consistent section spacing.
- `.crm-card` with `__header`, `__body`, and `__footer` — shared custom card surface.
- `.crm-filter-bar` and `.crm-form-grid` — filter and form layout primitives.
- `.crm-button` with `--primary`, `--secondary`, `--success`, `--warning`, or `--danger` — native button variants.
- `.crm-form-field` with `__label` and `__error` — native field label and validation placement.
- `.crm-alert` with `--success`, `--warning`, `--error`, or `--info` — semantic alert surface.

Ant Design components should be used for interactive controls where practical; the shared `ConfigProvider` and global layer already standardize their appearance and state styles. Keep page styles for unique layouts and data visualization, and preserve compact table variants where dense data entry requires them.

## Responsive behavior

The shared layer adjusts page/card spacing, form grids, modal width, table cell padding, and pagination at 768px and 480px. Keep custom layouts fluid with `min-width: 0`, responsive grid columns, and horizontally scrollable data tables.
