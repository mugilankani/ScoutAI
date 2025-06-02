import axios from 'axios';

const BASE_URL = 'http://localhost:3000';
const API_URL = `${BASE_URL}/api`;

async function testEndpoints() {
  console.log('Running API tests...');
  
  try {
    // Test the root endpoint
    console.log('\n1. Testing root endpoint...');
    const rootResponse = await axios.get(BASE_URL);
    console.log('Root endpoint response:', rootResponse.data);
    
    // Test the API test endpoint
    console.log('\n2. Testing /api/test endpoint...');
    const testResponse = await axios.get(`${API_URL}/test`);
    console.log('API test endpoint response:', testResponse.data);
    
    // Test the suggestions test endpoint
    console.log('\n3. Testing /api/suggestions/test endpoint...');
    const suggestTestResponse = await axios.get(`${API_URL}/suggestions/test`);
    console.log('Suggestions test endpoint response:', suggestTestResponse.data);
    
    // Test the manual suggestion endpoint
    console.log('\n4. Testing /api/test-suggest endpoint...');
    const manualSuggestResponse = await axios.post(`${API_URL}/test-suggest`, {
      prompt: 'Find React developers'
    });
    console.log('Manual suggest endpoint response:', manualSuggestResponse.data);
    
    // Now test the actual suggestions/improve endpoint
    console.log('\n5. Testing /api/suggestions/improve endpoint...');
    const improveResponse = await axios.post(`${API_URL}/suggestions/improve`, {
      prompt: 'Find React developers'
    });
    console.log('Suggest improve endpoint response:', improveResponse.data);
    
    console.log('\nAll tests passed successfully!');
  } catch (error) {
    console.error('\nTest failed:');
    console.error('Error status:', error.response?.status);
    console.error('Error data:', error.response?.data);
    console.error('Error details:', error.message);
    console.error('Request URL:', error.config?.url);
    console.error('Request method:', error.config?.method);
    console.error('Request data:', error.config?.data);
  }
}

// Run the tests
testEndpoints();
