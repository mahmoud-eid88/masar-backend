const { Sequelize, DataTypes } = require('sequelize');
const https = require('https');

// Database Configuration (Production)
const sequelize = new Sequelize("postgresql://postgres:xaJBtdiSrJFKmGgYLtQQJOOcAYFRkgRp@postgres-production-6981.up.railway.app:5432/railway", {
    dialect: 'postgres',
    logging: false,
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false
        }
    }
});

const Admin = sequelize.define('Admin', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING },
    email: { type: DataTypes.STRING },
    password: { type: DataTypes.STRING },
    role: { type: DataTypes.STRING }
}, { tableName: 'Admins', timestamps: true, underscored: true });

async function checkAdmin() {
    try {
        await sequelize.authenticate();
        console.log('✅ Connected to Prod DB');

        const admins = await Admin.findAll();
        console.log(`Found ${admins.length} Admins in DB:`);
        admins.forEach(a => console.log(` - ID: ${a.id}, Email: ${a.email}, Role: ${a.role}`));

        if (admins.length === 0) {
            console.log('❌ NO ADMINS FOUND! Attempting to create one...');
            // Optional: Create if missing
            // await Admin.create({ ... })
        }

    } catch (error) {
        console.error('❌ DB Error:', error.message);
    } finally {
        // Test API Login
        testApiLogin();
    }
}

function testApiLogin() {
    console.log('\n--- Testing API Login (Admin) ---');
    const loginData = JSON.stringify({
        email: 'admin@masar.com',
        password: 'admin123456',
        role: 'admin'
    });

    const options = {
        hostname: 'masar-backend-production-5f04.up.railway.app',
        path: '/api/auth/login',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': loginData.length
        }
    };

    const req = https.request(options, (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
            console.log(`Status Code: ${res.statusCode}`);
            console.log('Response:', data);
            process.exit(0);
        });
    });

    req.on('error', (e) => console.error('API Error:', e));
    req.write(loginData);
    req.end();
}

checkAdmin();
