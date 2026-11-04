const fs = require('fs');
const readline = require('readline');

async function search() {
  const fileStream = fs.createReadStream('C:\\Users\\3niinfotech-Nirav\\.gemini\\antigravity\\brain\\1b0557c6-3f1c-4849-9183-5c4941f73020\\.system_generated\\logs\\transcript_full.jsonl');
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let lineNum = 0;
  for await (const line of rl) {
    lineNum++;
    if (line.includes('HKD-TEST-001') && (line.includes('polish_carat') || line.includes('inward_id') || line.includes('SELECT * FROM dai_product'))) {
      console.log(`Match at line ${lineNum}, length: ${line.length}`);
      // write snippet
      const idx = line.indexOf('HKD-TEST-001');
      console.log('Snippet:', line.substring(Math.max(0, idx - 100), Math.min(line.length, idx + 200)));
    }
  }
}

search().catch(console.error);

