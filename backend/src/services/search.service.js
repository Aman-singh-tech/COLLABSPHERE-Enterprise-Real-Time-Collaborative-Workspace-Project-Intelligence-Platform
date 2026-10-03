const { Task, Document, Message, File, User, Workspace, TaskComment, Project, Board, Chat } = require('../models');
const ApiError = require('../utils/apiError');

const searchAll = async ({ query, workspaceId, userId, filters = {} }) => {
  if (!workspaceId) throw new ApiError(400, 'workspaceId is required.');
  const workspace = await Workspace.findOne({ _id: workspaceId, isActive: true, 'members.user': userId });
  if (!workspace) throw new ApiError(403, 'You do not have access to this workspace.');
  const regex = new RegExp(query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const { dateFrom, dateTo, types } = filters;
  const dates = {};
  for (const [key, value] of [['$gte', dateFrom], ['$lte', dateTo]]) {
    if (value) { const date = new Date(value); if (Number.isNaN(date.getTime())) throw new ApiError(400, 'Invalid search date.'); dates[key] = date; }
  }
  const dateFilter = Object.keys(dates).length ? { createdAt: dates } : {};
  const wanted = (type) => !types || types.includes(type);
  const projectIds = await Project.find({ workspace: workspaceId }).distinct('_id');
  const boards = await Board.find({ project: { $in: projectIds } }).select('_id project').lean();
  const boardIds = boards.map((board) => board._id);
  const chats = await Chat.find({ workspace: workspaceId, $or: [{ members: userId }, { type: 'channel', isPrivate: false }] }).distinct('_id');
  const results = {};
  if (wanted('tasks')) {
    results.tasks = await Task.find({ title: regex, board: { $in: boardIds }, isArchived: false, ...dateFilter }).limit(10).select('title priority dueDate column board').lean();
    results.tasks.forEach((task) => { task.projectId = boards.find((board) => board._id.equals(task.board))?.project; });
  }
  if (wanted('documents')) results.documents = await Document.find({ workspace: workspaceId, title: regex, isArchived: false, ...dateFilter }).limit(10).select('title updatedAt tags');
  if (wanted('files')) results.files = await File.find({ workspace: workspaceId, originalName: regex, ...dateFilter }).limit(10).select('originalName mimeType size');
  if (wanted('chats')) results.messages = await Message.find({ chat: { $in: chats }, content: regex, isDeleted: false, deletedFor: { $ne: userId }, ...dateFilter }).limit(10).select('content chat createdAt sender').populate('sender', 'firstName lastName avatar');
  if (wanted('users')) results.users = await User.find({ _id: { $in: workspace.members.map((member) => member.user) }, $or: [{ firstName: regex }, { lastName: regex }, { email: regex }] }).limit(10).select('firstName lastName email avatar');
  if (wanted('workspaces')) results.workspaces = await Workspace.find({ _id: workspaceId, name: regex, isActive: true }).select('name slug description');
  if (wanted('comments')) {
    const tasks = await Task.find({ board: { $in: boardIds }, isArchived: false }).select('_id board').lean();
    results.comments = await TaskComment.find({ task: { $in: tasks.map((task) => task._id) }, content: regex, ...dateFilter }).limit(10).select('content task author').populate('author', 'firstName lastName avatar').lean();
    results.comments.forEach((comment) => { const task = tasks.find((item) => item._id.equals(comment.task)); comment.projectId = boards.find((board) => board._id.equals(task?.board))?.project; });
  }
  return results;
};
module.exports = { searchAll };
