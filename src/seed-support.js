const Admin = require('./models/Admin');
const bcrypt = require('bcryptjs');

const seedSupportAccounts = async () => {
    try {
        console.log('Creating support accounts...');

        const hashedPassword = await bcrypt.hash('support123', 10);

        // Support Account 1
        const support1 = await Admin.findOrCreate({
            where: { email: 'support1@masar.com' },
            defaults: {
                name: 'دعم فني 1',
                email: 'support1@masar.com',
                password: hashedPassword,
                phone: '01000000001',
                role: 'support'
            }
        });
        console.log('Support 1:', support1[1] ? 'Created' : 'Already exists');

        // Support Account 2
        const support2 = await Admin.findOrCreate({
            where: { email: 'support2@masar.com' },
            defaults: {
                name: 'دعم فني 2',
                email: 'support2@masar.com',
                password: hashedPassword,
                phone: '01000000002',
                role: 'support'
            }
        });
        console.log('Support 2:', support2[1] ? 'Created' : 'Already exists');

        console.log('');
        console.log('=================================');
        console.log('Support accounts created!');
        console.log('');
        console.log('Account 1:');
        console.log('  Email: support1@masar.com');
        console.log('  Password: support123');
        console.log('');
        console.log('Account 2:');
        console.log('  Email: support2@masar.com');
        console.log('  Password: support123');
        console.log('=================================');

        process.exit(0);
    } catch (error) {
        console.error('Error creating support accounts:', error);
        process.exit(1);
    }
};

seedSupportAccounts();
