const { Server } = require('socket.io');

let io;

const initSocketIO = (server) => {
  io = new Server(server, {
    cors: {
      origin: ['https://interfaz-avi.onrender.com', 'http://localhost:3000', 'https://avi-flyup.ar', 'https://aira-admin.onrender.com'],
      credentials: true
    }
  });

  io.on('connection', (socket) => {
    console.log('Nuevo cliente conectado');
    
    socket.on('disconnect', () => {
      console.log('Cliente desconectado');
    });
  });
};

const getIO = () => {
  if (!io) {
    throw new Error("Socket.IO no está inicializado");
  }
  return io;
};

module.exports = { initSocketIO, getIO };