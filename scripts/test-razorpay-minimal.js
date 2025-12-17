// Minimal test for Razorpay integration
const Razorpay = require('razorpay');
require('dotenv').config({ path: './.env' });

console.log('Testing minimal Razorpay integration...');

// Initialize Razorpay with the exact same keys as in our app
const razorpay = new Razorpay({
  key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

console.log('Razorpay instance created');

// Test with the exact same options as in our API
const options = {
  amount: 100 * 100, // 100 INR in paise
  currency: 'INR',
  receipt: `receipt_test_${Date.now()}`,
};

console.log('Creating order with options:', options);

razorpay.orders.create(options)
  .then(order => {
    console.log('SUCCESS: Order created');
    console.log('Order ID:', order.id);
    console.log('Order amount:', order.amount);
  })
  .catch(error => {
    console.log('ERROR: Failed to create order');
    console.log('Error name:', error.name);
    console.log('Error message:', error.message);
    console.log('Error code:', error.code);
    console.log('Error status code:', error.statusCode);
    if (error.response) {
      console.log('Error response:', error.response.data);
    }
  });