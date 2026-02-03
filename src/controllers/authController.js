const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { Op } = require('sequelize');
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
            return res.status(400).json({ success: false, message: 'البريد الإلكتروني وكلمة المرور مطلوبين' });
        }

        // Email validation
        const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,6}$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({ success: false, message: 'صيغة البريد الإلكتروني غير صحيحة' });
        }

        // Check if user exists
        const existingUser = await Customer.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'الحساب موجود بالفعل' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const customer = await Customer.create({
            name: name || email.split('@')[0],
            email,
            password: hashedPassword,
            phone: phone || null
        });

        res.status(201).json({
            success: true,
            token: generateToken(customer.id, 'customer'),
            user: { id: customer.id, name: customer.name, email: customer.email }
        });
    } catch (error) {
        console.error('Registration Error (Customer):', error);
        res.status(400).json({ success: false, error: 'حدث خطأ أثناء التسجيل' });
    }
};

exports.loginCustomer = async (req, res) => {
    try {
        const { email, password } = req.body;

        // FIRST: Check if this is an Admin login
        const admin = await Admin.findOne({ where: { email } });
        if (admin && (await bcrypt.compare(password, admin.password))) {
            return res.json({
                success: true,
                token: generateToken(admin.id, 'admin'),
                user: { id: admin.id, name: admin.name, email: admin.email, role: 'admin' }
            });
        }

        // THEN: Check Customer
        const customer = await Customer.findOne({
            where: {
                [Op.or]: [
                    { email: email },
                    { phone: email }
                ]
            }
        });

        if (customer && (await bcrypt.compare(password, customer.password))) {
            if (customer.is_blocked) {
                return res.status(403).json({ success: false, message: 'تم حظرك بسبب مخالفة سياسة التطبيق' });
            }
            res.json({
                success: true,
                token: generateToken(customer.id, 'customer'),
                user: { id: customer.id, name: customer.name, email: customer.email, role: 'customer' }
            });
        } else {
            if (!customer && !admin) {
                res.status(400).json({ success: false, message: 'الحساب غير موجود' });
            } else {
                res.status(401).json({ success: false, message: 'كلمة المرور غير صحيحة' });
            }
        }
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

// Same for Courier...
exports.registerCourier = async (req, res) => {
    try {
        const { name, email, password, phone } = req.body;
        // Phone and name optional logic persists

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
        // Search by email OR phone
        const courier = await Courier.findOne({
            where: {
                [Op.or]: [
                    { email: email },
                    { phone: email }
                ]
            }
        });

        if (courier && (await bcrypt.compare(password, courier.password))) {
            if (courier.is_blocked) {
                return res.status(403).json({ success: false, message: 'تم حظرك بسبب مخالفة سياسة التطبيق' });
            }
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
        const admin = await Admin.findOne({
            where: {
                [Op.or]: [
                    { email: email },
                    { phone: email }
                ]
            }
        });

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

exports.switchRole = async (req, res) => {
    try {
        const { current_role, target_role, user_id } = req.body;
        let currentUser;

        if (current_role === 'customer') {
            currentUser = await Customer.findByPk(user_id);
        } else if (current_role === 'courier') {
            currentUser = await Courier.findByPk(user_id);
        }

        if (!currentUser) return res.status(404).json({ success: false, message: 'User not found' });

        let targetUser;
        if (target_role === 'customer') {
            targetUser = await Customer.findOne({ where: { email: currentUser.email } });
            if (!targetUser) {
                // Auto-create customer profile
                targetUser = await Customer.create({
                    name: currentUser.name,
                    email: currentUser.email,
                    password: currentUser.password,
                    phone: currentUser.phone || ''
                });
            }
        } else if (target_role === 'courier') {
            targetUser = await Courier.findOne({ where: { email: currentUser.email } });
            if (!targetUser) {
                // Auto-create courier profile
                targetUser = await Courier.create({
                    name: currentUser.name,
                    email: currentUser.email,
                    password: currentUser.password,
                    phone: currentUser.phone || '',
                    availability: true
                });
            }
        }

        if (targetUser.is_blocked) {
            return res.status(403).json({ success: false, message: 'تم حظرك بسبب مخالفة سياسة التطبيق' });
        }

        res.json({
            success: true,
            token: generateToken(targetUser.id, target_role),
            user: {
                id: targetUser.id,
                name: targetUser.name,
                email: targetUser.email,
                role: target_role
            }
        });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};
