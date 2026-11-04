const fs = require('fs');
const readline = require('readline');

async function readSpecificLines() {
  const fileStream = fs.createReadStream('C:\\Users\\3niinfotech-Nirav\\.gemini\\antigravity\\brain\\1b0557c6-3f1c-4849-9183-5c4941f73020\\.system_generated\\logs\\transcript_full.jsonl');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let lineNum = 0;
  for await (const line of rl) {
    lineNum++;
    if ([3110, 3120, 3124].includes(lineNum)) {
      console.log(`\n=== LINE ${lineNum} ===`);
      const obj = JSON.parse(line);
      console.log('content:', JSON.stringify(obj.content || obj.tool_calls || obj.media || obj));
    }
  }
}

readSpecificLines().catch(console.error);

