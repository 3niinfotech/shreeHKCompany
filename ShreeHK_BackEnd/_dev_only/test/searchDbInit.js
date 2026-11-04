const fs = require('fs');
const readline = require('readline');

async function searchDbInit() {
  const fileStream = fs.createReadStream('C:\\Users\\3niinfotech-Nirav\\.gemini\\antigravity\\brain\\1b0557c6-3f1c-4849-9183-5c4941f73020\\.system_generated\\logs\\transcript_full.jsonl');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let lineNum = 0;
  for await (const line of rl) {
    lineNum++;
    if (line.includes('CREATE DATABASE') || line.includes('mysqldump') || line.includes('mysqlimport') || line.includes('mariadb-dump') || line.includes('.sql')) {
      if (line.includes('test') || line.includes('snj')) {
        console.log(`Line ${lineNum}: length=${line.length}`);
        const parsed = JSON.parse(line);
        console.log('step:', parsed.step_index, 'snippet:', line.substring(0, 300));
      }
    }
  }
}

searchDbInit().catch(console.error);

