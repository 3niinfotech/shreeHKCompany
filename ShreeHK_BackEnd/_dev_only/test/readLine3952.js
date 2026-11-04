const fs = require('fs');
const readline = require('readline');

async function readLine3952() {
  const fileStream = fs.createReadStream('C:\\Users\\3niinfotech-Nirav\\.gemini\\antigravity\\brain\\1b0557c6-3f1c-4849-9183-5c4941f73020\\.system_generated\\logs\\transcript_full.jsonl');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let lineNum = 0;
  for await (const line of rl) {
    lineNum++;
    if (lineNum === 3952) {
      const parsed = JSON.parse(line);
      console.log('Content of line 3952:');
      console.log(parsed.content.substring(0, 2000));
      break;
    }
  }
}

readLine3952().catch(console.error);

