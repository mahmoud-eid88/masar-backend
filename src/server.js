const http = require('http');
const app = require('./app');
const { Server } = require('socket.io');
const { Order, Courier } = require('./models');
const { Op } = require('sequelize');

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// ==========================================
// Socket.IO Configuration
// ==========================================
const io = new Server(server, {
    cors: {
        origin: "*", // Allow connections from any mobile/web client
        methods: ["GET", "POST"]
    },
    transports: ['websocket', 'polling'] // Ensure compatibility
});

io.on('connection', (socket) => {
    console.log(`🔌 Socket Connected: ${socket.id}`);

    // Join specific order room for chat/updates
    socket.on('join_order_room', (orderId) => {
        const roomName = `order_${orderId}`;
        socket.join(roomName);
        console.log(`👤 Socket ${socket.id} joined room: ${roomName}`);
    });

    // Alternative room join (used by OrderChatScreen)
    socket.on('join_room', (roomName) => {
        socket.join(roomName);
        console.log(`👤 Socket ${socket.id} joined room: ${roomName}`);
    });

    // Join admin room for stats updates
    socket.on('join_admin_room', () => {
        socket.join('admin_room');
        console.log(`📡 Admin joined room: admin_room`);
    });

    // Join individual user room for wallet/status updates
    socket.on('join_user_room', (userId) => {
        const roomName = `user_${userId}`;
        socket.join(roomName);
        console.log(`👤 User ${userId} joined room: ${roomName}`);
    });

    // Support Chat Rooms
    socket.on('join_support_room', (userId) => {
        socket.join(`support_${userId}`);
        console.log(`💬 User join support room: support_${userId}`);
    });

    socket.on('join_support_agents', () => {
        socket.join('support_agents');
        console.log(`🎧 Support agent joined agents room`);
    });

    socket.on('support_typing', (data) => {
        const { userId, isTyping, senderRole } = data;
        // Broadcast to the other party in the support room
        socket.to(`support_${userId}`).emit('support_typing', { userId, isTyping, senderRole });
    });

    // Real-time Courier Location Updates
    socket.on('update_location', async (data) => {
        const { courier_id, location } = data;
        if (!courier_id || !location) return;

        const cid = parseInt(courier_id);

        try {
            // 1. Update Courier DB record (for static nearby searches)
            await Courier.update(
                { latitude: location.lat, longitude: location.lng },
                { where: { id: cid } }
            );

            // 2. Find active orders assigned to this courier (Accepted/Picked Up/In Delivery)
            const activeOrders = await Order.findAll({
                where: {
                    courier_id: cid,
                    status: { [Op.in]: ['accepted', 'picked_up', 'in_delivery'] }
                },
                attributes: ['id'] // Only need IDs
            });

            // 3. Broadcast new location to specific order rooms
            const updatePayload = { courier_id: cid, location };
            activeOrders.forEach(order => {
                io.to(`order_${order.id}`).emit('courier_location_updated', updatePayload);
            });

        } catch (error) {
            console.error(`❌ Location Update Error (Courier ${cid}):`, error.message);
        }
    });

    // Chat Typing Indicators
    socket.on('typing', (data) => {
        // data: { order_id, sender_id }
        socket.to(`order_${data.order_id}`).emit('typing', data);
    });

    socket.on('disconnect', () => {
        console.log(`🔌 Socket Disconnected: ${socket.id}`);
    });
});

// Attach IO to app for legacy controller access if needed
app.set('io', io);

// ==========================================
// Start Server
// ==========================================
server.listen(PORT, () => {
    console.log(`🚀 Masar Server running on port ${PORT}`);
    console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});
