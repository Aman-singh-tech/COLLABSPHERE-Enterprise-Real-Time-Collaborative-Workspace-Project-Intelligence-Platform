const { getAccessibleDocument, saveDocumentContent } = require('../services/document.service');
const logger = require('../utils/logger');

const registerDocumentHandlers = (io, socket) => {
  socket.on('document:join', async (documentId, acknowledge) => {
    try {
      await getAccessibleDocument(documentId, socket.user._id);
      await socket.join(`document:${documentId}`);
      acknowledge?.({ ok: true });
    } catch (error) { acknowledge?.({ ok: false, message: error.message }); }
  });
  socket.on('document:leave', (documentId) => socket.leave(`document:${documentId}`));
  socket.on('document:change', async ({ documentId, changes, version }) => {
    if (!socket.rooms.has(`document:${documentId}`) || typeof changes !== 'string') return;
    try {
      await getAccessibleDocument(documentId, socket.user._id, true);
      socket.to(`document:${documentId}`).emit('document:changed', { changes, version, userId: socket.user._id });
    } catch (error) { socket.emit('document:error', { message: error.message }); }
  });
  socket.on('document:cursor', ({ documentId, position, selection }) => {
    if (!socket.rooms.has(`document:${documentId}`)) return;
    socket.to(`document:${documentId}`).emit('document:cursor:update', {
      userId: socket.user._id, name: `${socket.user.firstName} ${socket.user.lastName || ''}`.trim(), position, selection,
    });
  });
  socket.on('document:typing', ({ documentId, isTyping }) => {
    if (!socket.rooms.has(`document:${documentId}`)) return;
    socket.to(`document:${documentId}`).emit('document:typing:update', { userId: socket.user._id, name: socket.user.firstName, isTyping });
  });
  socket.on('document:save', async ({ documentId, content }, acknowledge) => {
    try {
      const document = await saveDocumentContent(documentId, socket.user._id, content);
      io.to(`document:${documentId}`).emit('document:saved', { savedBy: socket.user._id, savedAt: document.updatedAt });
      acknowledge?.({ ok: true, savedAt: document.updatedAt });
    } catch (error) {
      logger.error(`document:save failed: ${error.message}`);
      acknowledge?.({ ok: false, message: error.message });
      socket.emit('document:error', { message: error.message });
    }
  });
};
module.exports = { registerDocumentHandlers };
