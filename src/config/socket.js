const { Server } = require('socket.io');

let io;

const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://magenta-rat-781378.hostingersite.com'
];

const initializeSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: allowedOrigins,
            credentials: true
        }
    });

    io.on('connection', (socket) => {
        console.log('✅ Cliente conectado:', socket.id);

        socket.on('join_admin_room', () => {
            socket.join('admin_room');
            console.log('👤 Admin se unió a la sala admin');
        });

        socket.on('join_user_room', (userId) => {
            socket.join(`user_${userId}`);
            console.log(`👤 Usuario ${userId} se unió a su sala`);
        });

        socket.on('disconnect', () => {
            console.log('❌ Cliente desconectado:', socket.id);
        });
    });

    return io;
};

const getIO = () => {
    if (!io) {
        throw new Error('Socket.io no está inicializado');
    }
    return io;
};

const emitToAdmins = (event, data) => {
    getIO().to('admin_room').emit(event, data);
};

const emitToUser = (userId, event, data) => {
    getIO().to(`user_${userId}`).emit(event, data);
};

const emitToAll = (event, data) => {
    getIO().emit(event, data);
};

module.exports = {
    initializeSocket,
    getIO,
    emitToAdmins,
    emitToUser,
    emitToAll
};
