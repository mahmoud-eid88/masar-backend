const https = require('https');

function hitEndpoint(path) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: 'masar-backend-production-5f04.up.railway.app',
            path: path,
            method: 'GET'
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                console.log(`[${path}] Status: ${res.statusCode}`);
                console.log(`Response: ${data}`);
                resolve();
            });
        });

        req.on('error', (e) => {
            console.error(`[${path}] Error:`, e.message);
            resolve(); // Verify next one anyway
        });

        req.end();
    });
}

async function run() {
    console.log('--- Triggering Force DB Sync ---');
    await hitEndpoint('/api/force-db-sync');

    console.log('\n--- Triggering Create Initial Admin ---');
    await hitEndpoint('/api/create-initial-admin');
}

run();
