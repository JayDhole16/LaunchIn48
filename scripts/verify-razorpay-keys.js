// Script to verify Razorpay keys
require('dotenv').config({ path: './.env' });

console.log('Verifying Razorpay keys...');
console.log('NEXT_PUBLIC_RAZORPAY_KEY_ID:', process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID);
console.log('RAZORPAY_KEY_SECRET:', process.env.RAZORPAY_KEY_SECRET ? 'SET' : 'MISSING');

// Check if keys are properly formatted
if (process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID) {
  console.log('Key ID length:', process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID.length);
  console.log('Key ID starts with:', process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID.substring(0, 3));
}

if (process.env.RAZORPAY_KEY_SECRET) {
  console.log('Secret length:', process.env.RAZORPAY_KEY_SECRET.length);
  console.log('Secret starts with:', process.env.RAZORPAY_KEY_SECRET.substring(0, 3));
}