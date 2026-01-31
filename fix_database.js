require('dotenv').config();
const { Sequelize, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

// Use the same connection as the app
const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    logging: console.log,
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false
        }
    }
});

// Define Admin model
const Admin = sequelize.define('Admin', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    name: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false },
    phone: { type: DataTypes.STRING },
    role: { type: DataTypes.STRING, defaultValue: 'admin' }
}, { tableName: 'Admins', timestamps: true, underscored: true });

async function fixDatabase() {
    try {
        console.log('🔗 Connecting to database...');
        console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');

        await sequelize.authenticate();
        console.log('✅ Database connection established');

        // Check what tables exist
        const tables = await sequelize.getQueryInterface().showAllTables();
        console.log('📋 Existing tables:', tables);

        // Sync Admin table (create if not exists)
        console.log('🔄 Syncing Admin table...');
        await Admin.sync({ alter: true });
        console.log('✅ Admin table synced');

        // Check if Admin exists
        const existingAdmin = await Admin.findOne({ where: { email: 'admin@masar.com' } });

        if (existingAdmin) {
            console.log('✅ Admin already exists:', existingAdmin.email);
        } else {
            console.log('📝 Creating Admin account...');
            const hashedPassword = await bcrypt.hash('admin123456', 10);

            const admin = await Admin.create({
                name: 'مدير النظام',
                email: 'admin@masar.com',
                password: hashedPassword,
                phone: '01000000000',
                role: 'admin'
            });

            console.log('✅ Admin created successfully!');
            console.log('==================================');
            console.log('📧 Email: admin@masar.com');
            console.log('🔑 Password: admin123456');
            console.log('==================================');
        }

        // Count records in other tables
        const [customerCount] = await sequelize.query('SELECT COUNT(*) FROM "Customers"');
        const [courierCount] = await sequelize.query('SELECT COUNT(*) FROM "Couriers"');
        const [orderCount] = await sequelize.query('SELECT COUNT(*) FROM "Orders"');

        console.log('\n📊 Database Statistics:');
        console.log('- Customers:', customerCount[0].count);
        console.log('- Couriers:', courierCount[0].count);
        console.log('- Orders:', orderCount[0].count);

    } catch (error) {
        console.error('❌ Error:', error.message);
        console.error(error);
    } finally {
        await sequelize.close();
        process.exit(0);
    }
}

fixDatabase();
