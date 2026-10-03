const { Chat, Message } = require('../models');
const logger = require('../utils/logger');

const registerChatHandlers = (io, socket) => {
  socket.on('chat:join', (chatId) => {
    socket.join(`chat:${chatId}`);
  });

  socket.on('chat:leave', (chatId) => {
    socket.leave(`chat:${chatId}`);
  });

  socket.on('chat:typing', ({ chatId, isTyping }) => {
    socket.to(`chat:${chatId}`).emit('chat:typing:update', {
      userId: socket.user._id,
      name: `${socket.user.firstName} ${socket.user.lastName || ''}`.trim(),
      isTyping,
    });
  });

  socket.on('message:send', async ({ chatId, content, attachments = [], mentions = [], parentMessage = null, sharedDocument = null }) => {
    try {
      const message = await Message.create({
        chat: chatId,
        sender: socket.user._id,
        content,
        attachments,
        mentions,
        parentMessage,
        sharedDocument,
        readBy: [socket.user._id],
      });

      if (parentMessage) {
        await Message.findByIdAndUpdate(parentMessage, { $inc: { threadReplyCount: 1 } });
      }

      const populated = await message.populate([
        { path: 'sender', select: 'firstName lastName avatar' },
        { path: 'sharedDocument', select: 'title tags updatedAt category' },
      ]);

      io.to(`chat:${chatId}`).emit('message:new', populated);
    } catch (err) {
      logger.error(`message:send failed: ${err.message}`);
      socket.emit('message:send:error', { message: 'Failed to send message.' });
    }
  });

  socket.on('message:react', async ({ messageId, chatId, emoji }) => {
    try {
      const message = await Message.findById(messageId);
      if (!message) return;

      let reaction = message.reactions.find((r) => r.emoji === emoji);
      if (!reaction) {
        message.reactions.push({ emoji, users: [] });
        reaction = message.reactions[message.reactions.length - 1];
      }

      const userIdx = reaction.users.findIndex((u) => u.toString() === socket.user._id.toString());
      if (userIdx > -1) {
        reaction.users.splice(userIdx, 1);
      } else {
        reaction.users.push(socket.user._id);
      }

      await message.save();
      io.to(`chat:${chatId}`).emit('message:reaction:update', {
        messageId,
        reactions: message.reactions,
      });
    } catch (err) {
      logger.error(`message:react failed: ${err.message}`);
    }
  });

  socket.on('message:read', async ({ chatId, messageId }) => {
    await Message.findByIdAndUpdate(messageId, { $addToSet: { readBy: socket.user._id } });
    socket.to(`chat:${chatId}`).emit('message:read:update', {
      messageId,
      userId: socket.user._id,
    });
  });
};

module.exports = { registerChatHandlers };
