const { Courier } = require('../models');

exports.toggleAvailability = async (req, res) => {
    try {
        const { courier_id } = req.params;
        const courier = await Courier.findByPk(courier_id);
        if (!courier) return res.status(404).json({ success: false, message: 'Courier not found' });

        courier.availability = !courier.availability;
        await courier.save();

        res.json({ success: true, availability: courier.availability });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};

exports.getProfile = async (req, res) => {
    try {
        const { id, role } = req.params;
        let profile;
        if (role === 'courier') {
            profile = await Courier.findByPk(id, { attributes: ['id', 'name', 'email', 'phone', 'rating', 'availability'] });
        } else {
            const { Customer } = require('../models');
            profile = await Customer.findByPk(id, { attributes: ['id', 'name', 'email', 'phone', 'rating'] });
        }

        if (!profile) return res.status(404).json({ success: false, message: 'Profile not found' });
        res.json({ success: true, profile });
    } catch (error) {
        res.status(400).json({ success: false, error: error.message });
    }
};
