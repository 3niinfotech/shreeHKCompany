const fs = require('fs');
const readline = require('readline');

async function searchSql() {
  const file = 'C:\\Users\\3niinfotech-Nirav\\Downloads\\shreehkweb_snj2024 (3).sql';
  const fileStream = fs.createReadStream(file);
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  let lineNum = 0;
  for await (const line of rl) {
    lineNum++;
    if (line.includes('HKD-TEST-001')) {
      console.log(`Found HKD-TEST-001 at line ${lineNum}:`);
      console.log(line.substring(0, 300));
    }
  }
}

searchSql().catch(console.error);

