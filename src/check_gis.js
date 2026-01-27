const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');
dotenv.config();

const sequelize = new Sequelize(process.env.DATABASE_URL, {
    dialect: 'postgres',
    dialectOptions: {
        ssl: {
            require: true,
            rejectUnauthorized: false
        }
    },
    logging: false
});

async function check() {
    try {
        console.log('Checking extensions...');
        const [extensions] = await sequelize.query('SELECT extname FROM pg_extension');
        console.log('Available extensions:', extensions.map(e => e.extname).join(', '));

        const isPostgis = extensions.some(e => e.extname === 'postgis');
        if (!isPostgis) {
            console.log('PostGIS not found. Attempting to create...');
            await sequelize.query('CREATE EXTENSION postgis;');
            console.log('PostGIS created successfully!');
        } else {
            console.log('PostGIS is already enabled.');
        }

        console.log('Checking geometry type...');
        const [types] = await sequelize.query("SELECT typname FROM pg_type WHERE typname = 'geometry'");
        if (types.length > 0) {
            console.log('Geometry type exists!');
        } else {
            console.log('Geometry type DOES NOT exist.');
        }

        process.exit(0);
    } catch (err) {
        console.error('Check failed:', err.message);
        if (err.parent) console.error('Parent error:', err.parent.message);
        process.exit(1);
    }
}

check();
