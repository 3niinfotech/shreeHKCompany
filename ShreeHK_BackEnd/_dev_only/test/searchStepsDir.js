const fs = require('fs');
const path = require('path');

const stepsDir = 'C:\\Users\\3niinfotech-Nirav\\.gemini\\antigravity\\brain\\1b0557c6-3f1c-4849-9183-5c4941f73020\\.system_generated\\steps';
const dirs = fs.readdirSync(stepsDir);

for (const d of dirs) {
  const filePath = path.join(stepsDir, d, 'output.txt');
  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      if (content.includes('HKD-TEST-001') && (content.includes('RowDataPacket') || content.includes('polish_carat') || content.includes('inward_id') || content.includes('products'))) {
        console.log(`Found match in step ${d}, size: ${content.length}`);
        if (content.includes('polish_carat') && content.includes('amount')) {
          fs.writeFileSync(`D:\\Kishan_Ghodasara_Project\\shreeHKCompany\\ShreeHK_BackEnd\\test\\step_${d}_prods.txt`, content);
          console.log(`Saved step ${d} output to test/step_${d}_prods.txt`);
        }
      }
    } catch (_) {}
  }
}

