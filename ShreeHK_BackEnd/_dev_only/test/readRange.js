const fs = require('fs');
const readline = require('readline');

async function readRange(start, end) {
  const fileStream = fs.createReadStream('C:\\Users\\3niinfotech-Nirav\\.gemini\\antigravity\\brain\\1b0557c6-3f1c-4849-9183-5c4941f73020\\.system_generated\\logs\\transcript_full.jsonl');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let lineNum = 0;
  for await (const line of rl) {
    lineNum++;
    if (lineNum >= start && lineNum <= end) {
      const parsed = JSON.parse(line);
      console.log(`Line ${lineNum}: step=${parsed.step_index}, len=${line.length}`);
      const content = parsed.content || JSON.stringify(parsed.tool_calls || parsed);
      console.log(content.substring(0, 400));
    }
  }
}

readRange(3520, 3535).catch(console.error);

