const { sequelize } = require('./models/db');
const bcrypt = require('bcryptjs');
const Admin = require('./models/Admin');

const createAdmin = async () => {
    try {
        await sequelize.authenticate();
        console.log('Database connected successfully');

        // Check if admin already exists
        const existingAdmin = await Admin.findOne({
            where: { email: 'admin@masar.com' }
        });

        if (existingAdmin) {
            console.log('Admin already exists, updating password...');
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await existingAdmin.update({ password: hashedPassword });
            console.log('✅ Admin password updated successfully!');
        } else {
            console.log('Creating new admin...');
            const hashedPassword = await bcrypt.hash('admin123', 10);
            await Admin.create({
                name: 'System Admin',
                email: 'admin@masar.com',
                password: hashedPassword,
                phone: '+201234567890',
                role: 'admin'
            });
            console.log('✅ Admin created successfully!');
        }

        console.log('\n📧 Admin Credentials:');
        console.log('Email: admin@masar.com');
        console.log('Password: admin123');
        console.log('Role: admin\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Error creating admin:', error);
        process.exit(1);
    }
};

createAdmin();
