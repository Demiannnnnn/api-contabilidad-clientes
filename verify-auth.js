const axios = require('axios');

const API_URL = 'http://localhost:3000/api';
const TEST_USER = {
    email: `test_${Date.now()}@example.com`,
    password: 'password123',
    name: 'Test User'
};

async function verifyAuth() {
    try {
        console.log('1. Registering user...');
        try {
            const registerRes = await axios.post(`${API_URL}/auth/register`, TEST_USER);
            console.log('   Register Success:', registerRes.data.success);
        } catch (e) {
            console.log('   Register skipped or failed (might exist):', e.response?.data?.error || e.message);
            // If register fails, try login immediately
        }

        console.log('2. Logging in...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            email: TEST_USER.email,
            password: TEST_USER.password
        });
        const token = loginRes.data.data.token;
        console.log('   Login Success, Token received:', !!token);

        console.log('3. Accessing Protected Route (Clientes)...');
        const protectedRes = await axios.get(`${API_URL}/clientes`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('   Protected Route Success:', protectedRes.data.success);

        console.log('\nVERIFICATION SUCCESSFUL! ✅');
    } catch (error) {
        console.error('\nVERIFICATION FAILED ❌');
        if (error.response) {
            console.error('Status:', error.response.status);
            console.error('Data:', JSON.stringify(error.response.data, null, 2));
        } else {
            console.error('Error Message:', error.message);
            console.error('Full Error:', error);
        }
    }
}

verifyAuth();
