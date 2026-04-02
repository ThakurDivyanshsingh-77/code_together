import https from 'https';

const data = JSON.stringify({
  contents: [{ role: "user", parts: [{ text: "hello" }] }]
});

const req = https.request({
  hostname: 'generativelanguage.googleapis.com',
  port: 443,
  path: '/v1beta/models/gemini-1.5-flash:generateContent?key=AIzaSyA_hWDB9T452zCeRU4MlZqniGxwlab1H-c',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
}, res => {
  let doc = '';
  res.on('data', d => { doc += d; });
  res.on('end', () => { console.log(res.statusCode, doc); });
});

req.on('error', error => {
  console.error(error);
});

req.write(data);
req.end();
