const fetch = require('node-fetch');

async function test() {
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@thanhthoi.farm', password: 'admin123' })
  });
  const { token } = await loginRes.json();
  console.log('Token obtained');

  const createRes = await fetch('http://localhost:5000/api/products', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      name: "Test AI Product " + Date.now(),
      price: 150000,
      stock: 99,
      categoryId: 2,
      category: "Serum thảo mộc"
    })
  });
  
  console.log('Status:', createRes.status);
  const result = await createRes.json();
  console.log('Result:', result);
}
test();
