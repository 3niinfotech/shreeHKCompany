const fs = require('fs');
const readline = require('readline');

async function searchInit() {
  const fileStream = fs.createReadStream('C:\\Users\\3niinfotech-Nirav\\.gemini\\antigravity\\brain\\1b0557c6-3f1c-4849-9183-5c4941f73020\\.system_generated\\logs\\transcript_full.jsonl');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let lineNum = 0;
  for await (const line of rl) {
    lineNum++;
    if (line.includes('HKD-TEST-001') && (line.includes('INSERT INTO') || line.includes('insert into') || line.includes('VALUES') || line.includes('values'))) {
      console.log(`Insert match at line ${lineNum}: length=${line.length}`);
      fs.writeFileSync(`D:\\Kishan_Ghodasara_Project\\shreeHKCompany\\ShreeHK_BackEnd\\test\\insert_line_${lineNum}.json`, line);
    }
  }
}

searchInit().catch(console.error);

