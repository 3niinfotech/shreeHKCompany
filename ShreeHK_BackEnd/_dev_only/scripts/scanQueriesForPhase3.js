const fs = require('fs');
const path = require('path');

const targetDirs = ['routes', 'repositories', 'services'];
const baseDir = path.resolve(__dirname, '..');

const tableRegex = /\b(FROM|JOIN)\s+`?([a-zA-Z0-9_]+)`?/gi;
const targetTables = new Set([
  'user', 'roll', 'company', 'branch', 'company_year', 'branch_year',
  'category', 'dai_party', 'dai_lab', 'dai_origin', 'dai_shipping',
  'dai_attribute', 'dai_attribute_value', 'dai_book', 'dai_currencyrate',
  'dai_product', 'dai_product_value', 'dai_history', 'dai_inward', 'dai_outward',
  'dai_hold', 'dai_quick_notes', 'dai_ai_conversation', 'dai_activity_log',
  'acc_group', 'acc_subgroup', 'acc_advance', 'acc_transaction', 'dai_incrementid'
]);

const findings = [];

function scanDir(dir) {
  const fullDir = path.join(baseDir, dir);
  if (!fs.existsSync(fullDir)) return;
  const entries = fs.readdirSync(fullDir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(fullDir, entry.name);
    const relPath = path.relative(baseDir, fullPath);

    if (entry.isDirectory()) {
      scanDir(path.join(dir, entry.name));
    } else if (entry.isFile() && entry.name.endsWith('.js') && !entry.name.includes('test') && !entry.name.includes('spec')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');

      lines.forEach((line, idx) => {
        let match;
        const lineRegex = new RegExp(tableRegex.source, 'gi');
        while ((match = lineRegex.exec(line)) !== null) {
          const type = match[1].toUpperCase();
          const table = match[2].toLowerCase();
          if (targetTables.has(table)) {
            // Check context window around this line (3 lines before and after)
            const snippet = lines.slice(Math.max(0, idx - 1), Math.min(lines.length, idx + 2)).join(' ').trim();
            findings.push({
              file: relPath.replace(/\\/g, '/'),
              line: idx + 1,
              type,
              table,
              snippet: snippet.slice(0, 150)
            });
          }
        }
      });
    }
  }
}

for (const d of targetDirs) {
  scanDir(d);
}

console.log(`Total queries found matching target tables: ${findings.length}`);

// Group by file
const grouped = {};
for (const f of findings) {
  if (!grouped[f.file]) grouped[f.file] = [];
  grouped[f.file].push(f);
}

console.log(`\nFiles with database queries (${Object.keys(grouped).length} files):`);
for (const [file, list] of Object.entries(grouped)) {
  console.log(`- ${file}: ${list.length} table references`);
}

fs.writeFileSync(
  path.join(__dirname, 'phase3_scanned_queries.json'),
  JSON.stringify(grouped, null, 2),
  'utf8'
);
console.log('\nWrote phase3_scanned_queries.json');

