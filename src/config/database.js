const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');

dotenv.config();

// Determine connection strategy based on environment
const isProduction = process.env.NODE_ENV === 'production' || process.env.DATABASE_URL;

console.log(`🗄️  Database Config: ${isProduction ? 'Production/Railway (PostgreSQL)' : 'Development (SQLite)'}`);

const sequelize = isProduction
    ? new Sequelize(process.env.DATABASE_URL, {
        dialect: 'postgres',
        logging: false, // Set to console.log to see SQL queries
        dialectOptions: {
            ssl: {
                require: true, // Railway requires SSL
                rejectUnauthorized: false // Self-signed certs (common in cloud DBs)
            }
        },
        pool: {
            max: 10,
            min: 0,
            acquire: 30000,
            idle: 10000
        }
    })
    : new Sequelize({
        dialect: 'sqlite',
        storage: './database.sqlite',
        logging: false
    });

module.exports = sequelize;
