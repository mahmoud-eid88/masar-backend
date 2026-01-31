const Customer = require('../models/Customer');
const Courier = require('../models/Courier');
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
