const axios = require('axios');

async function testMailAPI() {
  try {
    const response = await axios.post('http://localhost:5000/api/mail/send', {
      email: 'test@example.com',
      type: 'newfeature',
      title: 'Test Email',
      description: 'This is a test email'
    });
    console.log('Success:', response.data);
  } catch (error) {
    console.log('Error:', error.response?.data || error.message);
  }
}

testMailAPI();