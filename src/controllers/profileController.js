const Customer = require('../models/Customer');
const Courier = require('../models/Courier');
const Admin = require('../models/Admin');
const SecurityLog = require('../models/SecurityLog');
const bcrypt = require('bcryptjs');

exports.updateProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;
        const { name, phone, email, bio, default_latitude, default_longitude, default_address, identity_number } = req.body;

        // Handle Images (Base64 conversion)
        let profile_image_base64 = null;
        let identity_image_base64 = null;

        if (req.files) {
            if (req.files.profile_image) {
                profile_image_base64 = `data:${req.files.profile_image[0].mimetype};base64,${req.files.profile_image[0].buffer.toString('base64')}`;
            }
            if (req.files.identity_image) {
                identity_image_base64 = `data:${req.files.identity_image[0].mimetype};base64,${req.files.identity_image[0].buffer.toString('base64')}`;
            }
        }

        let user;
        if (role === 'customer') {
            user = await Customer.findByPk(userId);
        } else if (role === 'courier') {
            user = await Courier.findByPk(userId);
        }

        if (!user) {
            return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
        }

        // Update Fields
        if (name) user.name = name;
        if (phone) user.phone = phone;
        if (email) user.email = email;
        if (bio !== undefined) user.bio = bio;
        if (profile_image_base64) user.profile_image = profile_image_base64;

        if (role === 'customer') {
            if (default_latitude) user.default_latitude = parseFloat(default_latitude);
            if (default_longitude) user.default_longitude = parseFloat(default_longitude);
            if (default_address) user.default_address = default_address;
        } else if (role === 'courier') {
            if (identity_number) user.identity_number = identity_number;
            if (identity_image_base64) user.identity_image = identity_image_base64;
        }

        await user.save();

        res.status(200).json({
            success: true,
            message: 'تم تحديث الملف الشخصي بنجاح',
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                bio: user.bio,
                profile_image: user.profile_image,
                // Include role-specific fields
                ...(role === 'customer' && {
                    default_latitude: user.default_latitude,
                    default_longitude: user.default_longitude,
                    default_address: user.default_address
                }),
                ...(role === 'courier' && {
                    identity_number: user.identity_number,
                    identity_image: user.identity_image
                })
            }
        });

    } catch (error) {
        console.error('Update Profile Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.getProfile = async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;
        let user;

        if (role === 'customer') {
            user = await Customer.findByPk(userId, { attributes: { exclude: ['password'] } });
        } else if (role === 'courier') {
            user = await Courier.findByPk(userId, { attributes: { exclude: ['password'] } });
        }

        if (!user) {
            return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
        }

        res.status(200).json({
            success: true,
            user
        });
    } catch (error) {
        console.error('Get Profile Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.changePassword = async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;
        const { oldPassword, newPassword } = req.body;

        if (!oldPassword || !newPassword) {
            return res.status(400).json({ success: false, message: 'كلمة المرور القديمة والجديدة مطلوبة' });
        }

        let user;
        if (role === 'customer') {
            user = await Customer.findByPk(userId);
        } else if (role === 'courier') {
            user = await Courier.findByPk(userId);
        } else if (role === 'admin' || role === 'support') {
            user = await Admin.findByPk(userId);
        }

        if (!user) {
            return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
        }

        // Verify old password
        const isMatch = await bcrypt.compare(oldPassword, user.password);
        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'كلمة المرور القديمة غير صحيحة' });
        }

        // Hash and save new password
        const salt = await bcrypt.genSalt(10);
        user.password = await bcrypt.hash(newPassword, salt);
        await user.save();

        // Create Security Log
        await SecurityLog.create({
            userId,
            userRole: role,
            action: 'تغيير كلمة المرور',
            details: 'تم تغيير كلمة المرور بنجاح',
            ipAddress: req.ip
        });

        res.json({ success: true, message: 'تم تغيير كلمة المرور بنجاح' });
    } catch (error) {
        console.error('Change Password Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

exports.submitVerification = async (req, res) => {
    try {
        console.log('--- Submit Verification Request (Multipart) Started ---');
        console.log('User ID:', req.user.id);
        console.log('User Role:', req.user.role);

        const userId = req.user.id;
        const role = req.user.role;
        const { full_name_arabic, identity_number } = req.body;
        const files = req.files || {};

        console.log('Body:', req.body);
        console.log('Files received:', Object.keys(files));

        const idCardFrontFile = files['id_card_front'] ? files['id_card_front'][0] : null;
        const idCardBackFile = files['id_card_back'] ? files['id_card_back'][0] : null;
        const selfieImageFile = files['selfie_image'] ? files['selfie_image'][0] : null;

        if (!full_name_arabic || !identity_number || !idCardFrontFile || !idCardBackFile || !selfieImageFile) {
            console.log('Validation Failed: Missing fields or files');
            return res.status(400).json({ success: false, message: 'جميع البيانات والصور مطلوبة للتوثيق' });
        }

        // Helper function to convert buffer to base64 data URI
        const toBase64 = (file) => {
            const b64 = file.buffer.toString('base64');
            const mime = file.mimetype;
            return `data:${mime};base64,${b64}`;
        };

        const id_card_front = toBase64(idCardFrontFile);
        const id_card_back = toBase64(idCardBackFile);
        const selfie_image = toBase64(selfieImageFile);

        let user;
        if (role === 'customer') {
            user = await Customer.findByPk(userId);
        } else if (role === 'courier') {
            user = await Courier.findByPk(userId);
        }

        if (!user) {
            return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
        }

        // Update verification data
        user.full_name_arabic = full_name_arabic;
        user.identity_number = identity_number;
        user.id_card_front = id_card_front;
        user.id_card_back = id_card_back;
        user.selfie_image = selfie_image;
        user.verification_status = 'pending';
        user.verification_refusal_reason = null;

        await user.save();
        console.log('User verification data saved.');

        // Create Security Log
        try {
            await SecurityLog.create({
                userId,
                userRole: role,
                action: 'إرسال بيانات التوثيق',
                details: `تم إرسال البيانات (Multipart) للاسم: ${full_name_arabic}`,
                ipAddress: req.ip
            });
        } catch (logError) {
            console.error('Security Log Error:', logError);
        }

        res.json({
            success: true,
            message: 'تم إرسال بيانات التوثيق وهي قيد المراجعة الآن',
            verification_status: 'pending'
        });
    } catch (error) {
        console.error('Submit Verification Fatal Error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

exports.getSecurityLogs = async (req, res) => {
    try {
        const userId = req.user.id;
        const role = req.user.role;

        const logs = await SecurityLog.findAll({
            where: { userId, userRole: role },
            order: [['createdAt', 'DESC']],
            limit: 20
        });

        res.json({ success: true, logs });
    } catch (error) {
        console.error('Get Security Logs Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
};

// NEW: Submit verification via JSON (base64 images in body)
exports.submitVerificationJSON = async (req, res) => {
    try {
        console.log('--- Submit Verification Request (JSON) Started ---');
        console.log('User ID:', req.user.id);
        console.log('User Role:', req.user.role);

        const userId = req.user.id;
        const role = req.user.role;
        const { full_name_arabic, identity_number, id_card_front, id_card_back, selfie_image } = req.body;

        console.log('Received fields:', {
            full_name_arabic: !!full_name_arabic,
            identity_number: !!identity_number,
            id_card_front: id_card_front ? `${id_card_front.substring(0, 50)}...` : null,
            id_card_back: id_card_back ? `${id_card_back.substring(0, 50)}...` : null,
            selfie_image: selfie_image ? `${selfie_image.substring(0, 50)}...` : null
        });

        if (!full_name_arabic || !identity_number || !id_card_front || !id_card_back || !selfie_image) {
            console.log('Validation Failed: Missing fields');
            return res.status(400).json({ success: false, message: 'جميع البيانات والصور مطلوبة للتوثيق' });
        }

        let user;
        if (role === 'customer') {
            user = await Customer.findByPk(userId);
        } else if (role === 'courier') {
            user = await Courier.findByPk(userId);
        }

        if (!user) {
            return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
        }

        // Update verification data (images are already base64 from client)
        user.full_name_arabic = full_name_arabic;
        user.identity_number = identity_number;
        user.id_card_front = id_card_front;
        user.id_card_back = id_card_back;
        user.selfie_image = selfie_image;
        user.verification_status = 'pending';
        user.verification_refusal_reason = null;

        await user.save();
        console.log('User verification data saved (JSON method).');

        // Create Security Log
        try {
            await SecurityLog.create({
                userId,
                userRole: role,
                action: 'إرسال بيانات التوثيق',
                details: `تم إرسال البيانات (JSON) للاسم: ${full_name_arabic}`,
                ipAddress: req.ip
            });
        } catch (logError) {
            console.error('Security Log Error:', logError);
        }

        res.json({
            success: true,
            message: 'تم إرسال بيانات التوثيق وهي قيد المراجعة الآن',
            verification_status: 'pending'
        });
    } catch (error) {
        console.error('Submit Verification JSON Fatal Error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};
