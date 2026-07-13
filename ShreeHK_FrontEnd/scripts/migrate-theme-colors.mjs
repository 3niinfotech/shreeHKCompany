/**
 * One-time migration: replace hardcoded colors with theme CSS variables.
 * Run: node scripts/migrate-theme-colors.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.join(__dirname, "..", "src");

/** Order matters — more specific patterns first */
const REPLACEMENTS = [
  // Header / nav
  [/#005c3d\b/gi, "var(--color-header-bg)"],
  [/#004a31\b/gi, "var(--color-header-bg-dark)"],
  [/#0[dD]7[bB]6[bB]\b/g, "var(--color-primary)"],
  [/#0[aA]6358\b/gi, "var(--color-primary-dark)"],
  [/#008080\b/gi, "var(--color-primary)"],
  [/#006[bB]6[bB]\b/gi, "var(--color-primary-dark)"],
  [/#1[bB]5[eE]3[bB]\b/g, "var(--color-primary)"],
  [/#2[dD]6[aA]4[fF]\b/gi, "var(--color-primary-medium)"],
  [/#40916[cC]\b/gi, "var(--color-primary-medium)"],
  [/#52[bB]788\b/gi, "var(--color-primary)"],
  [/#74[cC]69[dD]\b/gi, "var(--color-sidebar-accent)"],

  // Text
  [/#1[aA]2[bB]3[cC]\b/g, "var(--color-text-heading)"],
  [/#1[fF]2937\b/gi, "var(--color-text-heading)"],
  [/#64748[bB]\b/gi, "var(--color-text-muted)"],
  [/#6[bB]7785\b/gi, "var(--color-text-muted)"],
  [/#8[bB]95[aA]5\b/gi, "var(--color-text-muted)"],
  [/#8[cC]8[cC]8[cC]\b/gi, "var(--color-text-muted)"],
  [/#94[aA]3[bB]8\b/gi, "var(--color-text-muted)"],
  [/#475569\b/gi, "var(--color-badge-neutral-text)"],
  [/#166534\b/gi, "var(--color-alert-success-text)"],
  [/#9[fF]1239\b/gi, "var(--color-alert-error-text)"],
  [/#f8faf[cC]\b/gi, "var(--color-text-inverse)"],
  [/#f1f5f9\b/gi, "var(--color-text-on-primary)"],

  // Backgrounds
  [/#f4f6[fF]8\b/gi, "var(--color-page-bg)"],
  [/#f4f7[fF]5\b/gi, "var(--color-page-bg)"],
  [/#f8faf[bB]\b/gi, "var(--color-bg-muted)"],
  [/#fcfcfc\b/gi, "var(--table-row-zebra)"],
  [/#fafcfb\b/gi, "var(--table-row-zebra)"],
  [/#f0f5f2\b/gi, "var(--color-table-inventory-header-bg)"],
  [/#f0f9ff\b/gi, "var(--color-bg-muted)"],
  [/#f0f2f4\b/gi, "var(--color-border)"],
  [/#f1f5f9\b/gi, "var(--color-bg-muted)"],
  [/#f3f4f6\b/gi, "var(--color-badge-neutral-bg)"],
  [/#1[aA]2332\b/gi, "var(--color-bg-card)"],
  [/#1[eE]293[bB]\b/gi, "var(--color-table-inventory-header-bg)"],
  [/#243044\b/gi, "var(--color-table-inventory-header-hover)"],
  [/#111827\b/gi, "var(--color-popover-bg)"],

  // White / card
  [/#ffffff\b/gi, "var(--color-text-inverse)"],
  [/\b#fff\b/gi, "var(--color-text-inverse)"],

  // Borders
  [/#e0e5[eE][aA]\b/gi, "var(--color-border)"],
  [/#e5ebe8\b/gi, "var(--color-border)"],
  [/#e2e8f0\b/gi, "var(--color-border)"],
  [/#d9dde3\b/gi, "var(--color-border-strong)"],
  [/#2[dD]3[aA]4[dD]\b/gi, "var(--color-border)"],
  [/#bbf7[dD]0\b/gi, "var(--color-badge-success-border)"],

  // Semantic
  [/#38[aA]169\b/gi, "var(--color-success)"],
  [/#2[fF]8558\b/gi, "var(--color-success-dark)"],
  [/#22[cC]55[eE]\b/gi, "var(--color-success)"],
  [/#4[aA][dD][eE]80\b/gi, "var(--color-status-online)"],
  [/#86[eE][fF][aA][cC]\b/gi, "var(--color-status-online)"],
  [/#[dD]69[eE]2[eE]\b/gi, "var(--color-warning)"],
  [/#[bB]45309\b/gi, "var(--color-badge-warning-text)"],
  [/#[eE]53[eE]3[eE]\b/gi, "var(--color-error)"],
  [/#[dD]53[fF]40\b/gi, "var(--color-error)"],
  [/#[cC]53030\b/gi, "var(--color-error-dark)"],
  [/#[cC]62828\b/gi, "var(--color-error-dark)"],
  [/#[eE][fF]4444\b/gi, "var(--color-error)"],
  [/#[fF]87171\b/gi, "var(--color-status-offline)"],
  [/#[fF][cC][aA]5[aA]5\b/gi, "var(--color-status-offline)"],
  [/#3182[cC][eE]\b/gi, "var(--color-info)"],
  [/#1[dD]6[aA][eE]5\b/gi, "var(--color-info)"],
  [/#6[bB]7[fF][dD]7\b/gi, "var(--color-chart-violet)"],
  [/#6[dD]28[dD]9\b/gi, "var(--color-entity-other-text)"],
  [/#[cC]4[aA]35[aA]\b/gi, "var(--color-accent-gold)"],
  [/#[dD]1[dD]5[dD][bB]\b/gi, "var(--color-chart-muted)"],

  // Alert / badge backgrounds
  [/#ecfdf3\b/gi, "var(--color-alert-success-bg)"],
  [/#dcfce7\b/gi, "var(--color-primary-light)"],
  [/#fff1f2\b/gi, "var(--color-alert-error-bg)"],
  [/#ffe4e6\b/gi, "var(--color-alert-error-bg)"],
  [/#fff8[eE]1\b/gi, "var(--color-badge-warning-bg)"],
  [/#[fF][eE][fF]5[eE]9\b/gi, "var(--color-warning-light)"],
  [/#[eE]8[fF]0[fF][eE]\b/gi, "var(--color-entity-product-bg)"],
  [/#[eE]8[fF]8[fF]0\b/gi, "var(--color-entity-customer-bg)"],
  [/#[eE][dD][eE]7[fF]6\b/gi, "var(--color-entity-other-bg)"],
  [/#fff5[fF]5\b/gi, "var(--color-danger-light)"],

  // rgba patterns
  [/rgba\(0,\s*0,\s*0,\s*0\.08\)/gi, "var(--shadow-header)"],
  [/rgba\(0,\s*0,\s*0,\s*0\.05\)/gi, "var(--shadow-card)"],
  [/rgba\(0,\s*0,\s*0,\s*0\.2\)/gi, "var(--shadow-md)"],
  [/rgba\(0,\s*0,\s*0,\s*0\.25\)/gi, "var(--shadow-lg)"],
  [/rgba\(0,\s*0,\s*0,\s*0\.35\)/gi, "var(--shadow-md)"],
  [/rgba\(255,\s*255,\s*255,\s*0\.12\)/gi, "var(--color-sidebar-hover-bg)"],
  [/rgba\(255,\s*255,\s*255,\s*0\.14\)/gi, "var(--color-sidebar-hover-bg)"],
  [/rgba\(255,\s*255,\s*255,\s*0\.22\)/gi, "var(--color-sidebar-active-bg)"],
  [/rgba\(255,\s*255,\s*255,\s*0\.72\)/gi, "var(--color-text-on-primary)"],
  [/rgba\(255,\s*255,\s*255,\s*0\.85\)/gi, "var(--color-text-on-primary)"],
  [/rgba\(13,\s*123,\s*107,\s*0\.12\)/gi, "var(--color-input-focus-ring)"],
  [/rgba\(27,\s*94,\s*59,\s*0\.06\)/gi, "var(--shadow-header)"],
  [/rgba\(27,\s*94,\s*59,\s*0\.12\)/gi, "var(--color-input-focus-ring)"],
  [/rgba\(20,\s*184,\s*166,\s*0\.45\)/gi, "var(--color-input-focus-border)"],
  [/rgba\(139,\s*149,\s*165,\s*0\.95\)/gi, "var(--color-text-muted)"],
];

const SKIP_DIRS = new Set(["node_modules", "theme"]);
const EXTENSIONS = new Set([".scss", ".css", ".jsx", ".js"]);

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (EXTENSIONS.has(path.extname(entry.name))) files.push(full);
  }
  return files;
}

function migrateFile(filePath) {
  let content = fs.readFileSync(filePath, "utf8");
  const original = content;

  // Strip fallback patterns like var(--color-navy, #1f2937) -> var(--color-navy)
  content = content.replace(
    /var\((--[a-z0-9-]+),\s*[^)]+\)/gi,
    "var($1)"
  );

  for (const [pattern, replacement] of REPLACEMENTS) {
    content = content.replace(pattern, replacement);
  }

  if (content !== original) {
    fs.writeFileSync(filePath, content, "utf8");
    return true;
  }
  return false;
}

const files = walk(srcDir);
let changed = 0;
for (const file of files) {
  if (file.includes(`${path.sep}theme${path.sep}`)) continue;
  if (migrateFile(file)) {
    changed++;
    console.log("updated:", path.relative(srcDir, file));
  }
}
console.log(`\nDone. ${changed} files updated.`);
