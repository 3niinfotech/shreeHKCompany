const http = require('http');
const jwt = require('jsonwebtoken');

const token = jwt.sign(
  { user_id: 1, username: 'admin', roll: 1, companyId: 1, yearId: 8 },
  'NitechDigitalServices'
);

const postData = JSON.stringify({
  from_company_id: 1,
  to_company_id: 2,
  transfer_date: '2026-10-31',
  notes: 'Test Transfer',
  items: [
    {
      product_id: 4022,
      sku: 'D-01',
      pcs: 1,
      carat: 1.0,
      price: 1000,
      amount: 1000,
    },
  ],
});

const req = http.request(
  'http://localhost:3500/transaction/company-transfer',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + token,
      'x-company-id': '1',
    },
  },
  (res) => {
    let body = '';
    res.on('data', (d) => (body += d));
    res.on('end', () => {
      console.log('Status:', res.statusCode);
      console.log('Body:', body);
    });
  }
);

req.write(postData);
req.end();

