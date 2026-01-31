const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Customer, Courier, Admin } = require('../models');

const generateToken = (id, role) => {
    return jwt.sign({ id, role }, process.env.JWT_SECRET, {
        expiresIn: '30d'
    });
};

exports.registerCustomer = async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);

        const customer = await Customer.create({
            name: name || email.split('@')[0],
            email,
            password: hashedPassword,
            phone: phone || ''
        });

        res.status(201).json({
            success: true,
            token: generateToken(customer.id, 'customer'),
            user: { id: customer.id, name: customer.name, email: customer.email }
        });
    } catch (error) {
        console.error('Registration Error (Customer):', error);
        res.status(400).json({ success: false, error: error.message });
    }
};

exports.loginCustomer = async (req, res) => {
    try {
        const { email, password } = req.body;
        const customer = await Customer.findOne({ where: { email } });

        if (customer && (await bcrypt.compare(password, customer.password))) {
            res.json({
                success: true,
                token: generateToken(customer.id, 'customer'),
                user: { id: customer.id, name: customer.name, email: customer.email }
            });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// Same for Courier...
exports.registerCourier = async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);

        const courier = await Courier.create({
            name: name || email.split('@')[0],
            email,
            password: hashedPassword,
            phone: phone || ''
        });

        res.status(201).json({
            success: true,
            token: generateToken(courier.id, 'courier'),
            user: { id: courier.id, name: courier.name, email: courier.email }
        });
    } catch (error) {
        console.error('Registration Error (Courier):', error);
        res.status(400).json({ success: false, error: error.message });
    }
};

exports.loginCourier = async (req, res) => {
    try {
        const { email, password } = req.body;
        const courier = await Courier.findOne({ where: { email } });

        if (courier && (await bcrypt.compare(password, courier.password))) {
            res.json({
                success: true,
                token: generateToken(courier.id, 'courier'),
                user: { id: courier.id, name: courier.name, email: courier.email }
            });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// Admin Auth
exports.registerAdmin = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ success: false, message: 'Email and password are required' });
        }
        const hashedPassword = await bcrypt.hash(password, 10);

        const admin = await Admin.create({
            name: name || 'Admin',
            email,
            password: hashedPassword
        });

        res.status(201).json({
            success: true,
            token: generateToken(admin.id, 'admin'),
            user: { id: admin.id, name: admin.name, email: admin.email, role: 'admin' }
        });
    } catch (error) {
        console.error('Registration Error (Admin):', error);
        res.status(400).json({ success: false, error: error.message });
    }
};

exports.loginAdmin = async (req, res) => {
    try {
        const { email, password } = req.body;
        const admin = await Admin.findOne({ where: { email } });

        if (admin && (await bcrypt.compare(password, admin.password))) {
            res.json({
                success: true,
                token: generateToken(admin.id, 'admin'),
                user: { id: admin.id, name: admin.name, email: admin.email, role: 'admin' }
            });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

exports.register = async (req, res) => {
    const { role } = req.body;
    if (role === 'courier') return exports.registerCourier(req, res);
    if (role === 'admin') return exports.registerAdmin(req, res);
    return exports.registerCustomer(req, res);
};

exports.login = async (req, res) => {
    const { role } = req.body;
    if (role === 'courier') return exports.loginCourier(req, res);
    if (role === 'admin') return exports.loginAdmin(req, res);
    return exports.loginCustomer(req, res);
};
