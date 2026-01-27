const http = require('http');
const app = require('./app');
const { Server } = require('socket.io');

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

    socket.on('update_location', (data) => {
        const { courier_id, location, order_id } = data;
        console.log(`Courier ${courier_id} updated location:`, location);

        // Broadcast to specific order room or to all if no order_id
        if (order_id) {
            io.to(`order_${order_id}`).emit('courier_location_updated', { courier_id, location });
        } else {
            // General update for nearby logic if needed later
            io.emit('courier_location_updated', { courier_id, location });
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
