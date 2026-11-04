const fs = require('fs');

const c1 = fs.readFileSync('ShreeHK_BackEnd/test/testGroup1HttpRoutes.js', 'utf8');
for (const line of c1.split('\n')) {
  if (line.includes('request(')) console.log('G1:', line.trim());
}

const c2 = fs.readFileSync('ShreeHK_BackEnd/test/testGroup2aInwardRoutes.js', 'utf8');
for (const line of c2.split('\n')) {
  if (line.includes('request(')) console.log('G2a:', line.trim());
}

