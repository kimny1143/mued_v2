// Test API date format response
const fetch = require('node-fetch');

async function testAPIDateFormat() {
  try {
    // APIを直接呼び出して、レスポンスの日時フォーマットを確認
    const mentorId = 'c2c2a065-b3fe-403b-8e84-e33dba24837a';
    const from = '2025-06-14';
    const to = '2025-06-14';
    
    const url = `http://localhost:3000/api/lesson-slots/by-mentor/${mentorId}?from=${from}&to=${to}`;
    
    console.log('Calling API:', url);
    
    const response = await fetch(url);
    const rawText = await response.text();
    
    console.log('\n=== Raw Response Text ===');
    console.log(rawText);
    
    try {
      const data = JSON.parse(rawText);
      console.log('\n=== Parsed JSON ===');
      console.log(JSON.stringify(data, null, 2));
      
      if (data.length > 0) {
        const firstSlot = data[0];
        console.log('\n=== First Slot Analysis ===');
        console.log('startTime:', firstSlot.startTime);
        console.log('startTime includes Z:', firstSlot.startTime.includes('Z'));
        console.log('startTime format:', firstSlot.startTime);
        
        // Date parsing test
        const dateObj = new Date(firstSlot.startTime);
        console.log('Parsed as Date:', dateObj);
        console.log('toISOString():', dateObj.toISOString());
        console.log('UTC Hours:', dateObj.getUTCHours());
        console.log('Local Hours:', dateObj.getHours());
      }
    } catch (parseError) {
      console.error('Failed to parse JSON:', parseError);
    }
    
  } catch (error) {
    console.error('Error testing API:', error);
  }
}

// 実行
testAPIDateFormat();