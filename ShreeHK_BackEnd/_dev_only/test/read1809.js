const fs = require('fs');
const readline = require('readline');

async function readLines(lines) {
  const fileStream = fs.createReadStream('C:\\Users\\3niinfotech-Nirav\\.gemini\\antigravity\\brain\\1b0557c6-3f1c-4849-9183-5c4941f73020\\.system_generated\\logs\\transcript_full.jsonl');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let lineNum = 0;
  for await (const line of rl) {
    lineNum++;
    if (lines.includes(lineNum)) {
      const parsed = JSON.parse(line);
      console.log(`Line ${lineNum}: step=${parsed.step_index}`);
      console.log((parsed.content || JSON.stringify(parsed.tool_calls || parsed)).substring(0, 1000));
    }
  }
}

readLines([1809, 1878]).catch(console.error);

