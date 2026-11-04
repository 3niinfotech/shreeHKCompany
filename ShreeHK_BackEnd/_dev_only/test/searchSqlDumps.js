const fs = require('fs');
const readline = require('readline');

async function searchSqlDumps() {
  const files = [
    'C:\\Users\\3niinfotech-Nirav\\Downloads\\shreehkweb_snj2024 (3).sql',
    'C:\\Users\\3niinfotech-Nirav\\Downloads\\backUp_shreehkweb_snj2024.sql',
    'C:\\Users\\3niinfotech-Nirav\\Downloads\\shreehkweb_snj2024.sql'
  ];

  for (const f of files) {
    if (!fs.existsSync(f)) continue;
    console.log('Searching', f);
    const rl = readline.createInterface({ input: fs.createReadStream(f), crlfDelay: Infinity });
    let lnum = 0;
    for await (const line of rl) {
      lnum++;
      if (line.includes('INSERT INTO `dai_product`') || line.includes('INSERT INTO dai_product')) {
        // check if line contains (7, or (8, or (9,
        if (line.includes("(7,") || line.includes("(8,") || line.includes("(9,")) {
          console.log(`FOUND in ${f} at line ${lnum}!`);
          fs.writeFileSync(`D:\\Kishan_Ghodasara_Project\\shreeHKCompany\\ShreeHK_BackEnd\\test\\dump_match.txt`, line);
          process.exit(0);
        }
      }
    }
  }
  console.log('Not found in dumps.');
  process.exit(0);
}

searchSqlDumps().catch(console.error);

