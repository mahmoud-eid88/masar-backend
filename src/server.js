const http = require('http');
const app = require('./app');
const { Server } = require('socket.io');
const { Order, Courier } = require('./models');
const { Op } = require('sequelize');

const PORT = process.env.PORT || 5000;

const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    socket.on('join_order_room', (orderId) => {
        socket.join(`order_${orderId}`);
        console.log(`User joined order room: ${orderId}`);
    });

    socket.on('update_location', async (data) => {
        const { courier_id, location } = data;
        const cid = parseInt(courier_id);

        try {
            // 1. Update Courier location in DB (for nearby searching)
            await Courier.update(
                { latitude: location.lat, longitude: location.lng },
                { where: { id: cid } }
            );

            // 2. Find all active orders for this courier
            const activeOrders = await Order.findAll({
                where: {
                    courier_id: cid,
                    status: { [Op.in]: ['accepted', 'picked_up', 'in_delivery'] }
                }
            });

            const updateData = { courier_id: cid, location };

            // 3. Broadcast to each specific order room
            activeOrders.forEach(order => {
                io.to(`order_${order.id}`).emit('courier_location_updated', updateData);
            });
        } catch (error) {
            console.error('Error in update_location socket handler:', error);
        }
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

// Attach io to app for use in controllers
app.set('io', io);

server.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
