// Script test API để kiểm tra endpoint getProduct
const axios = require('axios');

const testProductAPI = async () => {
    const baseURL = 'http://localhost:5000/api';
    const productId = 'P0001';
    
    console.log('🧪 Testing Product API...\n');
    console.log(`📡 Testing: GET ${baseURL}/products/${productId}\n`);
    
    try {
        const response = await axios.get(`${baseURL}/products/${productId}`);
        console.log('✅ SUCCESS!');
        console.log('Status:', response.status);
        console.log('Product Data:', JSON.stringify(response.data, null, 2));
    } catch (error) {
        console.error('❌ ERROR!');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Message:', error.response.data?.message);
            console.error('Error Details:', JSON.stringify(error.response.data, null, 2));
        } else if (error.request) {
            console.error('No response received. Is server running?');
            console.error('Error:', error.message);
        } else {
            console.error('Error:', error.message);
        }
    }
};

testProductAPI();

