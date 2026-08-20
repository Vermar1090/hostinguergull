const { Server } = require('socket.io');

let io;

const initializeSocket = (server) => {
    io = new Server(server, {
        cors: {
            origin: ['http://localhost:5173', 'http://localhost:3000'],
            credentials: true
        }
    });

    io.on('connection', (socket) => {
        console.log('✅ Cliente conectado:', socket.id);

        socket.on('join_admin_room', (data) => {
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
    const io = getIO();
    io.to('admin_room').emit(event, data);
};

const emitToUser = (userId, event, data) => {
    const io = getIO();
    io.to(`user_${userId}`).emit(event, data);
};

const emitToAll = (event, data) => {
    const io = getIO();
    io.emit(event, data);
};

module.exports = {
    initializeSocket,
    getIO,
    emitToAdmins,
    emitToUser,
    emitToAll
};
