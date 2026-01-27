const { Client } = require('pg');
const dotenv = require('dotenv');
dotenv.config();

const configs = [
    { user: 'postgres', host: 'nozomi.proxy.rlwy.net', port: 29743, database: 'railway', password: 'zXWsvZoYVvCqThUUrvNiPLAQKcgoQytG' }
];

async function testAll() {
    for (const config of configs) {
        console.log(`\nTesting combination: User=${config.user}, Database=${config.database}, SSL=true`);
        const client = new Client({
            ...config,
            ssl: { rejectUnauthorized: false }
        });
        try {
            await client.connect();
            console.log('SUCCESS! This combination works.');
            await client.end();
            return;
        } catch (err) {
            console.log('Failed:', err.message);
            if (err.code) console.log('Error Code:', err.code);
            // console.log('Full Error:', err);
        }

        // Try without SSL just in case
        /*
        console.log(`\nTesting combination: User=${config.user}, Database=${config.database}, SSL=false`);
        const clientNoSSL = new Client({
            ...config,
            ssl: false
        });
        try {
            await clientNoSSL.connect();
            console.log('SUCCESS! (No SSL) This combination works.');
            await clientNoSSL.end();
            return;
        } catch (err) {
            console.log('Failed (No SSL):', err.message);
        }
        */
    }
}

testAll();
