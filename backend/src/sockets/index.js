const { Server } = require('socket.io');
const env = require('../config/env');
const socketAuthMiddleware = require('./socketAuth');
const { registerPresenceHandlers } = require('./presence.socket');
const { registerKanbanHandlers } = require('./kanban.socket');
const { registerDocumentHandlers } = require('./document.socket');
const { registerChatHandlers } = require('./chat.socket');
const { registerNotificationHandlers } = require('./notification.socket');
const { registerCallHandlers } = require('./call.socket');
const logger = require('../utils/logger');

const initSocket = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (
          !origin ||
          origin === env.CLIENT_URL ||
          origin.includes('localhost') ||
          origin.includes('127.0.0.1') ||
          origin.endsWith('.onrender.com') ||
          origin.endsWith('.vercel.app')
        ) {
          return callback(null, true);
        }
        return callback(null, true);
      },
      credentials: true,
    },
    pingInterval: 10000, // send ping every 10s
    pingTimeout: 30000,  // consider dead after 30s without pong
    transports: ['websocket'],
  });

  io.use(socketAuthMiddleware);

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id} (user: ${socket.user._id})`);

    registerPresenceHandlers(io, socket);
    registerKanbanHandlers(io, socket);
    registerDocumentHandlers(io, socket);
    registerChatHandlers(io, socket);
    registerNotificationHandlers(io, socket);
    registerCallHandlers(io, socket);

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
};

module.exports = initSocket;
