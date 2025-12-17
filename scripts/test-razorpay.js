// Test Razorpay integration
const Razorpay = require('razorpay');

// Load environment variables
require('dotenv').config({ path: './.env' });

console.log('Testing Razorpay integration...');

// Check environment variables
console.log('Environment variables:');
console.log('- NEXT_PUBLIC_RAZORPAY_KEY_ID:', process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ? 'SET' : 'MISSING');
console.log('- RAZORPAY_KEY_SECRET:', process.env.RAZORPAY_KEY_SECRET ? 'SET' : 'MISSING');

if (!process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || !process.env.RAZORPAY_KEY_SECRET) {
  console.error('Missing required environment variables');
  process.exit(1);
}

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

console.log('Razorpay initialized successfully');

// Test creating an order
const options = {
  amount: 10000, // 100 INR in paise
  currency: 'INR',
  receipt: 'receipt#1',
};

console.log('Creating test order with options:', options);

razorpay.orders.create(options)
  .then(order => {
    console.log('Order created successfully:', order.id);
    console.log('Order details:', order);
  })
  .catch(error => {
    console.error('Error creating order:', error);
    if (error.response) {
      console.error('Error response:', error.response.data);
    }
  });