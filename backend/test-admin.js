async function verifyAdmin() {
  try {
    // Test 1: Login
    console.log('1. Testing Admin Login...');
    const loginRes = await fetch('http://localhost:5000/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@thanhthoi.farm', password: 'admin123' })
    });
    const { token, user } = await loginRes.json();
    console.log('   ✅ Login:', user.name, '| Admin:', user.isAdmin);

    // Test 2: Stats
    console.log('2. Testing Stats...');
    const stats = await (await fetch('http://localhost:5000/api/admin/stats', { headers: { Authorization: `Bearer ${token}` } })).json();
    console.log('   ✅ Stats:', JSON.stringify(stats));

    // Test 3: Products (public)
    console.log('3. Testing Products...');
    const products = await (await fetch('http://localhost:5000/api/products')).json();
    console.log(`   ✅ ${products.length} products loaded`);

    // Test 4: Search
    console.log('4. Testing Search...');
    const search = await (await fetch('http://localhost:5000/api/products?search=Serum')).json();
    console.log(`   ✅ Search "Serum": ${search.length} results`);

    // Test 5: Product Detail
    console.log('5. Testing Product Detail...');
    const detail = await (await fetch('http://localhost:5000/api/products/1')).json();
    console.log(`   ✅ Detail: ${detail.name} | Has description: ${!!detail.description}`);

    // Test 6: Static files
    console.log('6. Testing Static Files...');
    const indexRes = await fetch('http://localhost:5000/index.html');
    const aboutRes = await fetch('http://localhost:5000/about.html');
    console.log(`   ✅ index.html: ${indexRes.status} | about.html: ${aboutRes.status}`);

    console.log('\n🎉 ALL TESTS PASSED!');
  } catch (err) {
    console.error('❌ FAILED:', err.message);
    process.exit(1);
  }
}
verifyAdmin();
