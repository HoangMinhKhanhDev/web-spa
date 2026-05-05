const fetch = require('node-fetch');

async function testStats() {
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@thanhthoi.farm', password: 'admin123' })
  });
  const { token } = await loginRes.json();

  const statsRes = await fetch('http://localhost:5000/api/admin/stats', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  const stats = await statsRes.json();
  console.log(JSON.stringify(stats, null, 2));
}

testStats().catch(console.error);
