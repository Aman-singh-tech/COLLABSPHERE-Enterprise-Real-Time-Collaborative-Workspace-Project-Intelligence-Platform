const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');
const { Chat, Message } = require('../models');

// POST /api/v1/chats  (create channel, DM, or group)
const createChat = catchAsync(async (req, res) => {
  const { name, type = 'channel', workspaceId, members = [], isPrivate = false, topic } = req.body;

  if (type === 'direct') {
    // Prevent duplicate DM threads between the same two users
    const allMembers = [...new Set([...members, req.user._id.toString()])];
    if (allMembers.length !== 2) {
      throw new ApiError(400, 'Direct messages must have exactly 2 members.');
    }

    const existing = await Chat.findOne({
      workspace: workspaceId,
      type: 'direct',
      members: { $all: allMembers, $size: 2 },
    });
    if (existing) {
      return res.status(200).json(new ApiResponse(200, { chat: existing }, 'Existing DM thread.'));
    }

    const chat = await Chat.create({
      type: 'direct',
      workspace: workspaceId,
      members: allMembers,
      createdBy: req.user._id,
    });
    return res.status(201).json(new ApiResponse(201, { chat }, 'DM thread created.'));
  }

  const chat = await Chat.create({
    name,
    type,
    workspace: workspaceId,
    members: [...new Set([...members, req.user._id.toString()])],
    isPrivate,
    topic,
    createdBy: req.user._id,
  });

  res.status(201).json(new ApiResponse(201, { chat }, 'Chat created.'));
});

// GET /api/v1/chats?workspaceId=...
const getMyChats = catchAsync(async (req, res) => {
  const { workspaceId } = req.query;
  if (!workspaceId) throw new ApiError(400, 'workspaceId query param is required.');

  let chats = await Chat.find({
    workspace: workspaceId,
    $or: [{ isPrivate: { $ne: true } }, { members: req.user._id }],
  })
    .populate('members', 'firstName lastName avatar status')
    .sort('-updatedAt');

  // If no channel exists in this workspace yet, auto-create #general
  if (!chats.length) {
    const generalChat = await Chat.create({
      name: 'general',
      type: 'channel',
      workspace: workspaceId,
      members: [req.user._id],
      isPrivate: false,
      createdBy: req.user._id,
    });
    const populated = await Chat.findById(generalChat._id).populate(
      'members',
      'firstName lastName avatar status'
    );
    chats = [populated];
  }

  res.status(200).json(new ApiResponse(200, { chats }));
});

// GET /api/v1/chats/:chatId/messages?before=<messageId>&limit=30
const getMessageHistory = catchAsync(async (req, res) => {
  const { chatId } = req.params;
  const { before, limit = 30 } = req.query;

  const query = { chat: chatId, parentMessage: null, isDeleted: false, deletedFor: { $ne: req.user._id } };
  if (before) {
    const beforeMsg = await Message.findById(before);
    if (beforeMsg) query.createdAt = { $lt: beforeMsg.createdAt };
  }

  const messages = await Message.find(query)
    .populate('sender', 'firstName lastName avatar')
    .populate('sharedDocument', 'title tags updatedAt category')
    .populate('mentions', 'firstName lastName')
    .sort('-createdAt')
    .limit(Number(limit));

  res.status(200).json(new ApiResponse(200, { messages: messages.reverse() }));
});

// GET /api/v1/chats/messages/:messageId/thread
const getThreadReplies = catchAsync(async (req, res) => {
  const replies = await Message.find({ parentMessage: req.params.messageId, isDeleted: false, deletedFor: { $ne: req.user._id } })
    .populate('sender', 'firstName lastName avatar')
    .sort('createdAt');

  res.status(200).json(new ApiResponse(200, { replies }));
});

// DELETE /api/v1/chats/messages/:messageId
const deleteMessage = catchAsync(async (req, res) => {
  const message = await Message.findById(req.params.messageId);
  if (!message) throw new ApiError(404, 'Message not found.');

  if (message.sender.toString() !== req.user._id.toString()) {
    throw new ApiError(403, 'You can only delete your own messages.');
  }

  message.isDeleted = true;
  message.content = '';
  await message.save();

  res.status(200).json(new ApiResponse(200, null, 'Message deleted.'));
});

// POST /api/v1/chats/messages/:messageId/delete-for-me
const deleteMessageForMe = catchAsync(async (req, res) => {
  const message = await Message.findById(req.params.messageId);
  if (!message) throw new ApiError(404, 'Message not found.');

  if (!message.deletedFor.includes(req.user._id)) {
    message.deletedFor.push(req.user._id);
    await message.save();
  }

  res.status(200).json(new ApiResponse(200, null, 'Message deleted for you.'));
});

// POST /api/v1/chats/:chatId/clear-for-me
const clearChatForMe = catchAsync(async (req, res) => {
  const { chatId } = req.params;
  await Message.updateMany(
    { chat: chatId },
    { $addToSet: { deletedFor: req.user._id } }
  );

  res.status(200).json(new ApiResponse(200, null, 'Chat history cleared for you.'));
});

module.exports = {
  createChat,
  getMyChats,
  getMessageHistory,
  getThreadReplies,
  deleteMessage,
  deleteMessageForMe,
  clearChatForMe,
};
