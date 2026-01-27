const { Client } = require('pg');

const connectionString = 'postgresql://postgres:500500@turntable.proxy.rlwy.net:42145/railway';
// Also try with sslmode=require
const connectionStringSSL = 'postgresql://postgres:500500@turntable.proxy.rlwy.net:42145/railway?sslmode=require';

async function test(url, label) {
    console.log(`\nTesting connection string: ${label}`);
    const client = new Client({
        connectionString: url,
        ssl: { rejectUnauthorized: false } // Still need this for Node to accept self-signed if needed
    });
    try {
        await client.connect();
        console.log('SUCCESS!');
        await client.end();
    } catch (err) {
        console.log('Failed:', err.message);
        if (err.code) console.log('Code:', err.code);
    }
}

async function run() {
    await test(connectionString, 'Standard');
    await test(connectionStringSSL, 'With ?sslmode=require');
}

run();
