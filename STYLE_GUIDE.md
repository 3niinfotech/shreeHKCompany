# ShreeHK ERP — Style Guide & Design System

> Comprehensive visual specifications, color tokens, typography scales, spacing tokens, and component guidelines for ShreeHK ERP.

---

## 1. Design System Philosophy

The design system is based on **single-source-of-truth CSS custom properties** loaded into `document.documentElement` via `src/theme/applyTheme.ts`. 

- **Primary Brand Identity**: Deep Teal (`#0D7B6B`), Navy chrome (`#1A2B3C`), clean light grey surfaces (`#F4F6F8`), and high-legibility slate typography (`#1F2937` / `#374151`).
- **No Direct Hex in Stylesheets**: Always refer to `src/assets/scss/_variables.scss` or `var(--color-*)`. Hardcoded hex colors in new SCSS/CSS are strictly prohibited.
- **Micro-Interactions & Form Polish**: Focus states must use crisp border changes without distracting blur/glow outlines. Controls adhere to a standardized 32px enterprise baseline height.

---

## 2. Color Palette & Semantic Tokens

### 2.1 Brand & Neutral Colors (Light Theme)

| Token Name | CSS Custom Property | Hex / RGBA Value | Usage |
|---|---|---|---|
| **Primary Brand** | `--color-primary` | `#0D7B6B` | Primary buttons, active nav, accents, links |
| **Primary Dark** | `--color-primary-dark` | `#095B50` | Primary hover state, top header bar |
| **Primary Darker** | `--color-primary-darker`| `#06483F` | Header bar accent background |
| **Primary Medium** | `--color-primary-medium`| `#249989` | Secondary accents, progress bars |
| **Primary Light** | `--color-primary-light` | `#E6F4F1` | Selected table row, badge tint, active state |
| **Primary Pale** | `--color-primary-pale` | `#F2FAF8` | Subtle card highlights, hover tints |
| **Primary Focus** | `--color-primary-focus` | `rgba(13, 123, 107, 0.18)` | Input focus rings |
| **Sidebar BG** | `--color-sidebar-bg` | `#1A2B3C` | Primary navigation sidebar surface |
| **Sidebar Footer**| `--color-sidebar-footer`| `#142231` | Sidebar bottom context & profile tray |
| **Page Surface** | `--color-page-bg` | `#F4F6F8` | Main content canvas background |
| **Card / Modal** | `--color-card-bg` | `#FFFFFF` | Tables, form cards, modals, popovers |
| **Table Header** | `--color-table-header-bg`| `#F2F6F9` | Master list & inventory header row |
| **Table Zebra** | `--color-table-row-zebra`| `#F9FAFC` | Alternating data rows |
| **Table Hover** | `--color-table-row-hover`| `#F0F1F8` | Hovered data rows |
| **Border Normal** | `--color-border` | `#DDE4EA` | Standard card, input, and table borders |
| **Border Strong** | `--color-border-strong` | `#D0D4E2` | Dividers, active borders |
| **Text Heading** | `--color-text-heading` | `#1F2937` | H1-H4 headings, bold titles, table headers |
| **Text Body** | `--color-text-body` | `#374151` | Primary readable paragraphs, inputs, labels |
| **Text Muted** | `--color-text-muted` | `#64748B` | Subtext, timestamps, disabled placeholder |

### 2.2 Semantic Status Colors

| Semantic Role | Primary Hex | Light Tint Hex | Darker Accent Hex |
|---|---|---|---|
| **Success** (Active, In Safe) | `#2F9E6A` | `#ECF9F2` | `#247A52` |
| **Warning** (Hold, Pending) | `#D4920A` | `#FFF8E8` | `#B07808` |
| **Danger / Error** (Memo, Out) | `#DC3D43` | `#FEF2F2` | `#B91C22` |
| **Info / Action** (Export, Sync)| `#2B6CB0` | `#EBF3FC` | `#1E4E8C` |

### 2.3 Dark Theme Overrides (`mode === "dark"`)

When the dark theme is active:
- `--color-page-bg`: `#0F172A`
- `--color-card-bg`: `#1E293B`
- `--color-border`: `#334155`
- `--color-text-heading`: `#F8FAFC`
- `--color-text-body`: `#E2E8F0`
- `--color-text-muted`: `#94A3B8`
- `--color-table-header-bg`: `#1E293B`
- `--color-table-row-zebra`: `#162032`
- `--color-table-row-hover`: `#24334A`

---

## 3. Typography Scale

Single source of truth: `src/theme/typography.ts`.

- **Base Font Family**: `Inter, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif`
- **Monospace Family** (SKUs, IDs, barcodes): `'SF Mono', 'Fira Code', 'Fira Mono', Menlo, Consolas, monospace`

| Scale Token | REM Value | Pixels Equivalent | Line Height | Letter Spacing | Typical Usage |
|---|---|---|---|---|---|
| `fontSizeXs` | `0.75rem` | 12px | `1.25` | `0` | Badges, filter chips, table subtext |
| `fontSizeSm` | `0.8125rem`| 13px | `1.25` | `0` | Form labels, standard table cells |
| `fontSizeMd` | `0.875rem` | 14px | `1.5` | `0` | Body text, input values, dropdown items |
| `fontSizeLg` | `1.0rem` | 16px | `1.5` | `-0.01em` | Section headers, card titles |
| `fontSizeXl` | `1.125rem` | 18px | `1.5` | `-0.01em` | Modal titles, hero subtitles |
| `fontSize2xl`| `1.35rem` | 21.6px | `1.25` | `-0.01em` | Page hero titles |
| `fontSize3xl`| `1.75rem` | 28px | `1.25` | `-0.01em` | Executive KPI metric numbers |

---

## 4. Spacing Scale & Corner Radii

Single source of truth: `src/theme/spacing.ts`.

### Spacing Tokens
- `spacing1`: `4px`
- `spacing2`: `8px`
- `spacing3`: `12px`
- `spacing4`: `16px`
- `spacing5`: `20px`
- `spacing6`: `24px`
- `spacing8`: `32px`
- `spacing10`: `40px`
- `spacing12`: `48px`

### Radii Tokens
- `radiusControl`: `4px` (Inputs, Buttons, Dropdowns, DatePickers)
- `radiusSm`: `6px` (Badges, Chips)
- `radiusMd`: `8px` (Inner panel sections)
- `radiusCard`: `12px` (Cards, Modals, Containers — 16px in dashboard view)
- `radiusFull`: `9999px` (Pill badges, avatars)

### Layout Chrome Dimensions
- Header Height: `64px` (`--layout-header-height`)
- Sidebar Width (Expanded): `240px` (`--layout-sidebar-width`)
- Sidebar Width (Collapsed): `72px` (`--layout-sidebar-collapsed`)
- Enterprise Control Height: `32px` (`$filter-control-height`)

---

## 5. UI Component Guidelines

### 5.1 Buttons
All primary buttons conform to Ant Design tokens (`src/theme/antdTheme.ts`):
- **Height**: Standard `32px`, Compact `28px`, Large `40px`.
- **Border Radius**: `4px` (`radiusControl`).
- **Font**: 12px, Weight: 600.
- **Button Variants**:
  - Primary: Background `#0D7B6B`, Hover `#095B50`, Text `#FFFFFF`.
  - Save: Background `#2F9E6A`, Hover `#247A52`, Text `#FFFFFF`.
  - Danger: Background `#DC3D43`, Hover `#B91C22`, Text `#FFFFFF`.
  - Secondary/Cancel: Background `#FFFFFF`, Border `#DDE4EA`, Text `#64748B`.

### 5.2 Form Inputs & Controls
Inputs, Selects, and DatePickers must never render bulky browser outlines or heavy drop-shadows:
- **Border**: `1px solid var(--color-border)` (`#DDE4EA`).
- **Hover/Focus Border**: `var(--color-primary)` (`#0D7B6B`).
- **Focus Shadow / Halo**: `none` (`activeShadow: "none"`, `controlOutline: "transparent"`).
- **Number Inputs**: Hide default browser +/- stepper spinners project-wide.

### 5.3 Tables (`MasterListTable` & Universal Tables)
- **Header Row**: Background `#F2F6F9`, Text `#334155`, Font Size `12px`, Bold `600`.
- **Row Height**: Compact `32px - 36px` to maximize information density.
- **Zebra Striping**: Alternating `#FFFFFF` and `#F9FAFC`.
- **Selected Row**: Tinted with `var(--color-primary-light)` (`#E6F4F1`).
- **Dynamic Viewport Height**: Always bind with `useTableBodyScrollHeight({ offsetBottom, minHeight })`.

### 5.4 Modals (`BaseModal` Family)
- Centered layout with responsive widths: Standard `600px`, Wide `900px`, Full/Validation `1200px`.
- Backdrop: `rgba(15, 23, 42, 0.45)` with `backdrop-filter: blur(4px)`.
- Header: Title `18px`, Weight 600, Border bottom `1px solid var(--color-border)`.
- Footer: Actions aligned right (`Cancel` on left, `Save/Submit` on right).

### 5.5 Toast Notifications (`AppToaster` / `toastNotify.js`)
Toasts use Sonner styled with `src/assets/scss/_toast.scss`:
- **Classes**:
  - Success: `.shreehk-toast--success` (Green icon + left accent border)
  - Error: `.shreehk-toast--error` (Red icon + left accent border)
  - Warning: `.shreehk-toast--warning` (Amber icon + left accent border)
  - Info: `.shreehk-toast--info` (Teal icon + left accent border)
  - Delete: `.shreehk-toast--delete` (Crimson icon + left accent border)
- **Duration**: Default `4000ms`.
