#!/usr/bin/env node

/**
 * Test script to verify v2 API endpoint functionality
 * Compares /api/lesson-slots-v2 with /api/lesson-slots
 */

const API_BASE_URL = 'http://localhost:3000';
const AUTH_TOKEN = process.env.TEST_AUTH_TOKEN || ''; // You can set this for authenticated requests

async function fetchWithTiming(url, options = {}) {
  const startTime = Date.now();
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(AUTH_TOKEN && { 'Authorization': `Bearer ${AUTH_TOKEN}` }),
        ...options.headers,
      },
    });
    
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    
    return {
      data,
      duration,
      status: response.status,
    };
  } catch (error) {
    return {
      error: error.message,
      duration: Date.now() - startTime,
      status: error.status || 'error',
    };
  }
}

function compareDataStructure(v1Data, v2Data) {
  const v1Keys = v1Data.length > 0 ? Object.keys(v1Data[0]).sort() : [];
  const v2Keys = v2Data.length > 0 ? Object.keys(v2Data[0]).sort() : [];
  
  const onlyInV1 = v1Keys.filter(key => !v2Keys.includes(key));
  const onlyInV2 = v2Keys.filter(key => !v1Keys.includes(key));
  
  return {
    v1Keys,
    v2Keys,
    onlyInV1,
    onlyInV2,
    structureMatch: JSON.stringify(v1Keys) === JSON.stringify(v2Keys),
  };
}

async function runTests() {
  console.log('🔍 Testing API Endpoints...\n');
  console.log('Base URL:', API_BASE_URL);
  console.log('Auth Token:', AUTH_TOKEN ? 'Set' : 'Not set');
  console.log('----------------------------------------\n');
  
  // Test with different query parameters
  const testCases = [
    { name: 'No parameters', params: '' },
    { name: 'With limit', params: '?limit=10' },
    { name: 'With status filter', params: '?status=available' },
    { name: 'With date range', params: `?startDate=${new Date().toISOString()}&endDate=${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()}` },
  ];
  
  for (const testCase of testCases) {
    console.log(`📋 Test Case: ${testCase.name}`);
    console.log(`   Parameters: ${testCase.params || 'none'}`);
    console.log('');
    
    // Fetch from v1 endpoint
    const v1Url = `${API_BASE_URL}/api/lesson-slots${testCase.params}`;
    console.log('   Fetching v1:', v1Url);
    const v1Result = await fetchWithTiming(v1Url);
    
    // Fetch from v2 endpoint
    const v2Url = `${API_BASE_URL}/api/lesson-slots-v2${testCase.params}`;
    console.log('   Fetching v2:', v2Url);
    const v2Result = await fetchWithTiming(v2Url);
    
    // Display results
    console.log('\n   Results:');
    console.log('   --------');
    
    if (v1Result.error) {
      console.log(`   ❌ v1 Error: ${v1Result.error}`);
    } else {
      console.log(`   ✅ v1 Success:`);
      console.log(`      - Status: ${v1Result.status}`);
      console.log(`      - Response time: ${v1Result.duration}ms`);
      console.log(`      - Item count: ${Array.isArray(v1Result.data) ? v1Result.data.length : 'N/A'}`);
    }
    
    if (v2Result.error) {
      console.log(`   ❌ v2 Error: ${v2Result.error}`);
    } else {
      console.log(`   ✅ v2 Success:`);
      console.log(`      - Status: ${v2Result.status}`);
      console.log(`      - Response time: ${v2Result.duration}ms`);
      console.log(`      - Item count: ${Array.isArray(v2Result.data) ? v2Result.data.length : 'N/A'}`);
    }
    
    // Performance comparison
    if (!v1Result.error && !v2Result.error) {
      const speedup = ((v1Result.duration - v2Result.duration) / v1Result.duration * 100).toFixed(1);
      console.log(`\n   ⚡ Performance: v2 is ${speedup > 0 ? speedup + '% faster' : Math.abs(speedup) + '% slower'}`);
      
      // Data structure comparison
      if (Array.isArray(v1Result.data) && Array.isArray(v2Result.data)) {
        const comparison = compareDataStructure(v1Result.data, v2Result.data);
        
        console.log('\n   🔧 Data Structure:');
        console.log(`      - Structure match: ${comparison.structureMatch ? '✅ Yes' : '❌ No'}`);
        
        if (!comparison.structureMatch) {
          if (comparison.onlyInV1.length > 0) {
            console.log(`      - Fields only in v1: ${comparison.onlyInV1.join(', ')}`);
          }
          if (comparison.onlyInV2.length > 0) {
            console.log(`      - Fields only in v2: ${comparison.onlyInV2.join(', ')}`);
          }
        }
        
        // Sample data comparison (first item)
        if (v1Result.data.length > 0 && v2Result.data.length > 0) {
          console.log('\n   📊 Sample Data (first item):');
          console.log('      v1:', JSON.stringify(v1Result.data[0], null, 2).split('\n').slice(0, 5).join('\n      '));
          console.log('      v2:', JSON.stringify(v2Result.data[0], null, 2).split('\n').slice(0, 5).join('\n      '));
        }
      }
    }
    
    console.log('\n   ----------------------------------------\n');
  }
  
  // Summary
  console.log('✨ Test Summary');
  console.log('===============');
  console.log(`Tested ${testCases.length} scenarios`);
  console.log('\nNote: For authenticated endpoints, set TEST_AUTH_TOKEN environment variable');
  console.log('Example: TEST_AUTH_TOKEN="your-token-here" node scripts/test-v2-api.js');
}

// Check if server is running
async function checkServerRunning() {
  try {
    const response = await fetch(API_BASE_URL);
    return response.ok || response.status === 404; // 404 is ok, means server is running
  } catch (error) {
    return false;
  }
}

// Main execution
(async () => {
  console.log('🚀 V2 API Endpoint Test Script\n');
  
  // Check if server is running
  const serverRunning = await checkServerRunning();
  if (!serverRunning) {
    console.error('❌ Error: Server is not running at', API_BASE_URL);
    console.error('   Please start the development server with: npm run dev');
    process.exit(1);
  }
  
  try {
    await runTests();
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    process.exit(1);
  }
})();