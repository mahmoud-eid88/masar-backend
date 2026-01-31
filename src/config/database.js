const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');

dotenv.config();

const sequelize = (process.env.NODE_ENV === 'development' && !process.env.FORCE_PROD_DB)
    ? new Sequelize({
        dialect: 'sqlite',
        storage: './database.sqlite',
        logging: false
    })
    : (process.env.DATABASE_URL
        ? new Sequelize(process.env.DATABASE_URL, {
            dialect: 'postgres',
            logging: false,
            dialectOptions: {
                ssl: {
                    require: true,
                    rejectUnauthorized: false
                }
            },
            pool: {
                max: 5,
                min: 0,
                acquire: 30000,
                idle: 10000
            }
        })
        : new Sequelize(
            process.env.DB_NAME,
            process.env.DB_USER,
            process.env.DB_PASSWORD,
            {
                host: process.env.DB_HOST,
                dialect: 'postgres',
                port: process.env.DB_PORT,
                logging: false,
                dialectOptions: {
                    ssl: {
                        require: true,
                        rejectUnauthorized: false
                    }
                },
                pool: {
                    max: 5,
                    min: 0,
                    acquire: 30000,
                    idle: 10000
                }
            }
        ));

module.exports = sequelize;
