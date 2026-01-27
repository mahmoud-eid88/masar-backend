const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const dotenv = require('dotenv');
const { sequelize } = require('./models');
const authRoutes = require('./routes/authRoutes');
const orderRoutes = require('./routes/orderRoutes');
const routeRoutes = require('./routes/routeRoutes');
const chatRoutes = require('./routes/chatRoutes');
const managementRoutes = require('./routes/managementRoutes');
const walletRoutes = require('./routes/walletRoutes');

dotenv.config();

const app = express();

// Sync Database in development
if (process.env.NODE_ENV === 'development') {
    sequelize.sync({ alter: true }).then(() => {
        console.log('Database synced');
    }).catch(err => {
        console.error('Failed to sync database:', err);
    });
}

// Middlewares
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/routes', routeRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/management', managementRoutes);
app.use('/api/wallet', walletRoutes);

app.get('/', (req, res) => {
    res.json({ message: 'Welcome to Masar API' });
});

// Error handling
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send({ error: 'Something went wrong!' });
});

module.exports = app;
