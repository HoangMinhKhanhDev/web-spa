const fetch = require('node-fetch');

async function testCreate() {
  const res = await fetch('http://localhost:5000/api/products', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // I need a token. I'll use the admin email to register/login if needed, 
      // but I'll skip auth check in server.js just for testing if I can.
      // Actually I'll just check if login works.
    },
    body: JSON.stringify({
      name: "Test AI Product",
      price: 99000,
      stock: 10,
      category: "Nước giặt"
    })
  });
  console.log('Status:', res.status);
  console.log('Body:', await res.json());
}
testCreate();
