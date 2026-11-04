const fs = require('fs');
const readline = require('readline');

async function read1569() {
  const fileStream = fs.createReadStream('C:\\Users\\3niinfotech-Nirav\\.gemini\\antigravity\\brain\\1b0557c6-3f1c-4849-9183-5c4941f73020\\.system_generated\\logs\\transcript_full.jsonl');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let lineNum = 0;
  for await (const line of rl) {
    lineNum++;
    if (lineNum === 1569) {
      const parsed = JSON.parse(line);
      console.log('Line 1569 content snippet:');
      console.log((parsed.content || '').substring(0, 1000));
      break;
    }
  }
}

read1569().catch(console.error);

