

const BASE_URL = 'http://localhost:5000';

async function testCheckout() {
  console.log('--- Bắt đầu script kiểm tra Checkout ---');
  try {
    // 1. Login to get token
    console.log('1. Đăng nhập với admin@thanhthoi.farm...');
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@thanhthoi.farm', password: 'admin123' })
    });
    const loginData = await loginRes.json();
    if (!loginData.token) throw new Error('Đăng nhập thất bại');
    const token = loginData.token;
    console.log('=> Đăng nhập thành công. Token thu được.');

    // 2. Tạo đơn hàng mới
    console.log('\n2. Tạo đơn hàng mới...');
    const orderItems = [{ id: 1, name: "Sản phẩm Test", price: 100000, qty: 1 }];
    const orderRes = await fetch(`${BASE_URL}/api/orders`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        items: orderItems,
        totalAmount: 100000,
        paymentMethod: 'vnpay',
        shippingInfo: { name: 'Test', phone: '0912345678', address: '123 Test' }
      })
    });
    const orderData = await orderRes.json();
    if (!orderData.id) throw new Error('Tạo đơn hàng thất bại');
    console.log(`=> Đơn hàng tạo thành công: ID = ${orderData.id}, Status = ${orderData.status}, PaymentStatus = ${orderData.paymentStatus}`);

    // 3. Gọi API Create Payment (VNPay Mock)
    console.log('\n3. Gọi API tạo cổng thanh toán VNPay Mock...');
    const payRes = await fetch(`${BASE_URL}/api/checkout/create-payment`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ orderId: orderData.id, method: 'vnpay' })
    });
    const payData = await payRes.json();
    if (!payData.url) throw new Error('Không lấy được URL thanh toán');
    console.log(`=> Nhận URL Sandbox thành công: ${payData.url}`);

    // Parse TxnRef from URL for verification
    const txnRefMatch = payData.url.match(/txnRef=([^&]+)/);
    const mockTxnRef = txnRefMatch ? txnRefMatch[1] : null;

    // 4. Gọi VNPay Webhook (Giả lập thao tác click "Thành Công" trên giao diện VNPAY)
    console.log('\n4. Giả lập VNPay Webhook trả về thanh toán thành công...');
    const webhookRes = await fetch(`${BASE_URL}/api/checkout/vnpay-return?orderId=${orderData.id}&status=success`, {
      method: 'GET',
      redirect: 'manual' // Chặn redirect để đọc thông tin
    });
    console.log(`=> VNPay Webhook trả về HTTP ${webhookRes.status} (Redirect Expected to payment-success.html)`);

    // 5. Kiểm tra DB (Admin) để xác nhận trạng thái đơn đã đổi sang 'paid'
    console.log('\n5. Kiểm tra trạng thái đơn hàng trong DB...');
    const adminOrdersRes = await fetch(`${BASE_URL}/api/admin/orders`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const adminOrders = await adminOrdersRes.json();
    const verifiedOrder = adminOrders.find(o => o.id === orderData.id);
    
    if (verifiedOrder) {
      console.log(`=> Đơn hàng ID ${verifiedOrder.id}:`);
      console.log(`   - Tình trạng TT: ${verifiedOrder.paymentStatus} (Expected: paid)`);
      console.log(`   - Trạng thái ĐH: ${verifiedOrder.status} (Expected: processing)`);
      console.log(`   - Mã GD (TxnRef): ${verifiedOrder.paymentId}`);
      if (verifiedOrder.paymentStatus === 'paid' && verifiedOrder.paymentId === mockTxnRef) {
        console.log('\n✅✅✅ TÍCH HỢP THANH TOÁN (VNPAY) HOẠT ĐỘNG HOÀN HẢO! ✅✅✅');
      } else {
        console.log('\n❌ Trạng thái hoặc Mã GD không khớp.');
      }
    } else {
      console.log('\n❌ Không tìm thấy đơn hàng trong DB.');
    }

  } catch (error) {
    console.error('Test thất bại:', error);
  }
}

testCheckout();
