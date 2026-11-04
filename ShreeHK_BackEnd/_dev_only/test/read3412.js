const fs = require('fs');
const readline = require('readline');

async function readStep3412() {
  const fileStream = fs.createReadStream('C:\\Users\\3niinfotech-Nirav\\.gemini\\antigravity\\brain\\1b0557c6-3f1c-4849-9183-5c4941f73020\\.system_generated\\logs\\transcript_full.jsonl');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let lineNum = 0;
  for await (const line of rl) {
    lineNum++;
    if (line.includes('"step_index":3411') || line.includes('"step_index":3412') || line.includes('"step_index":3413')) {
      console.log(`Line ${lineNum}:`);
      console.log(line.substring(0, 500));
    }
  }
}

readStep3412().catch(console.error);

