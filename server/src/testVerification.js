const axios = require('axios');

const API = 'http://localhost:5001/api';

async function testBackend() {
  console.log('🧪 Starting End-to-End API Verification Test for JD Shop...\n');

  try {
    // 1. Health check
    const health = await axios.get(`${API}/health`);
    console.log('1. Health Check:', health.data);

    // 2. Admin Login
    const adminLogin = await axios.post(`${API}/auth/admin/login`, {
      email: 'admin@jdshop.com',
      password: 'admin123'
    });
    console.log('2. Admin Login Success:', adminLogin.data.success, '| Admin:', adminLogin.data.user.name, '| Role:', adminLogin.data.user.role_name);
    const adminToken = adminLogin.data.token;

    // 3. Customer Login
    const custLogin = await axios.post(`${API}/auth/customer/login`, {
      email: 'customer@jdshop.com',
      password: 'customer123'
    });
    console.log('3. Customer Login Success:', custLogin.data.success, '| Customer:', custLogin.data.user.name);
    const customerToken = custLogin.data.token;

    // 4. Products List
    const prods = await axios.get(`${API}/products`);
    console.log('4. Products Count:', prods.data.products.length);

    // 5. Categories List
    const cats = await axios.get(`${API}/categories`);
    console.log('5. Categories Count:', cats.data.categories.length);

    // 6. Admin Create Product
    const newProd = await axios.post(
      `${API}/products`,
      {
        name: 'Test Gaming Mouse RGB',
        price: 49.99,
        stock: 50,
        category_id: cats.data.categories[0].id,
        description: 'High precision gaming mouse',
        badge: 'NEW'
      },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    console.log('6. Admin Product Creation:', newProd.data.success, '| ID:', newProd.data.product.id, '| Name:', newProd.data.product.name);

    // 7. Customer Place Order
    const orderRes = await axios.post(
      `${API}/orders`,
      {
        customer_name: 'John Customer',
        customer_email: 'customer@jdshop.com',
        customer_phone: '+1 555-0144',
        shipping_address: '456 Tech Avenue',
        shipping_city: 'San Francisco',
        shipping_country: 'United States',
        items: [{ product_id: newProd.data.product.id, quantity: 2 }]
      },
      { headers: { Authorization: `Bearer ${customerToken}` } }
    );
    console.log('7. Order Placement:', orderRes.data.success, '| Order #:', orderRes.data.order.order_number, '| Total:', orderRes.data.order.total_amount);

    // 8. Admin Update Order Status
    const updateOrder = await axios.put(
      `${API}/orders/admin/${orderRes.data.order.id}/status`,
      { order_status: 'shipped', payment_status: 'paid' },
      { headers: { Authorization: `Bearer ${adminToken}` } }
    );
    console.log('8. Admin Order Status Update:', updateOrder.data.success, '| New Status:', updateOrder.data.order.order_status);

    // 9. Clean up test product
    await axios.delete(`${API}/products/${newProd.data.product.id}`, {
      headers: { Authorization: `Bearer ${adminToken}` }
    });
    console.log('9. Cleaned up test product.');

    console.log('\n🎉 ALL 9 END-TO-END VERIFICATION TESTS PASSED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Verification failed:', err.response?.data || err.message);
  }
}

testBackend();
