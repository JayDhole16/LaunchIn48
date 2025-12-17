// Simple test script to check if our APIs are working
// Run with: node scripts/test-apis.js

async function testAPIs() {
  try {
    console.log('Testing database connection...')
    
    // Test database API
    const dbResponse = await fetch('http://localhost:3009/api/test-db')
    const dbData = await dbResponse.json()
    console.log('Database test result:', dbData)
    
    console.log('\nTesting Razorpay integration...')
    
    // Test Razorpay API
    const razorpayResponse = await fetch('http://localhost:3009/api/test-razorpay')
    const razorpayData = await razorpayResponse.json()
    console.log('Razorpay test result:', razorpayData)
    
  } catch (error) {
    console.error('Error testing APIs:', error)
  }
}

testAPIs()