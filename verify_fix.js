const axios = require('axios');

async function testVisibility() {
    const baseUrl = 'http://localhost:3000/api'; // Adjust if needed
    // Assuming you have some order IDs or just checking the endpoint logic

    // We can't easily mock the DB here without full setup, 
    // but we can try to hit the endpoint with an invalid ID and see if it fails gracefully
    // or checks for the ID.

    try {
        console.log('Testing getAcceptedOrders with null courier_id...');
        try {
            await axios.get(`${baseUrl}/orders/accepted/null`);
        } catch (e) {
            console.log('Result:', e.response ? e.response.data : e.message);
        }

        console.log('Testing getAcceptedOrders with undefined courier_id...');
        try {
            await axios.get(`${baseUrl}/orders/accepted/undefined`);
        } catch (e) {
            console.log('Result:', e.response ? e.response.data : e.message);
        }

    } catch (error) {
        console.error('Test failed:', error.message);
    }
}

testVisibility();
