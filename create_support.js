// Script to create support account
const bcrypt = require('bcryptjs');
const Admin = require('./src/models/Admin');
const sequelize = require('./src/config/database');

async function createSupportAccount() {
    try {
        await sequelize.authenticate();
        console.log('Database connected');

        // Check if support account exists
        const existingSupport = await Admin.findOne({ where: { email: 'support1@masar.com' } });

        if (existingSupport) {
            console.log('Support account already exists!');
            console.log('ID:', existingSupport.id);
            console.log('Email:', existingSupport.email);
            console.log('Role:', existingSupport.role);
            return;
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('support123', salt);

        // Create support account
        const supportAccount = await Admin.create({
            name: 'الدعم الفني',
            email: 'support1@masar.com',
            password: hashedPassword,
            phone: '01000000001',
            role: 'support'
        });

        console.log('✅ Support account created successfully!');
        console.log('ID:', supportAccount.id);
        console.log('Name:', supportAccount.name);
        console.log('Email:', supportAccount.email);
        console.log('Role:', supportAccount.role);

    } catch (error) {
        console.error('Error:', error);
    } finally {
        await sequelize.close();
    }
}

createSupportAccount();
