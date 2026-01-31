const { Admin } = require('./models');
const bcrypt = require('bcryptjs');

const createAdmin = async () => {
    try {
        console.log('Creating Admin account...');

        // Check if admin exists
        const existingAdmin = await Admin.findOne({ where: { email: 'admin@masar.com' } });
        if (existingAdmin) {
            console.log('Admin account already exists.');
            console.log('Email: admin@masar.com');
            console.log('If you forgot the password, you may need to reset it.');
            process.exit(0);
        }

        const hashedPassword = await bcrypt.hash('admin123456', 10);

        const admin = await Admin.create({
            name: 'Super Admin',
            email: 'admin@masar.com',
            password: hashedPassword,
            phone: '01000000000',
            role: 'admin'
        });

        console.log('Admin created successfully!');
        console.log('-----------------------------------');
        console.log('Email:    admin@masar.com');
        console.log('Password: admin123456');
        console.log('-----------------------------------');
        process.exit(0);
    } catch (error) {
        console.error('Error creating admin:', error);
        process.exit(1);
    }
};

createAdmin();
