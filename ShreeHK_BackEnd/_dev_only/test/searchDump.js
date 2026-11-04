const fs = require('fs');
const readline = require('readline');

async function searchProductDump() {
  const fileStream = fs.createReadStream('C:\\Users\\3niinfotech-Nirav\\.gemini\\antigravity\\brain\\1b0557c6-3f1c-4849-9183-5c4941f73020\\.system_generated\\logs\\transcript_full.jsonl');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let lineNum = 0;
  for await (const line of rl) {
    lineNum++;
    if (line.includes("'HKD-TEST-001'") || line.includes('"HKD-TEST-001"')) {
      if (line.includes('polish_carat') || line.includes('p_carat')) {
        console.log(`Match at line ${lineNum}, len=${line.length}`);
      }
    }
  }
}

searchProductDump().catch(console.error);

