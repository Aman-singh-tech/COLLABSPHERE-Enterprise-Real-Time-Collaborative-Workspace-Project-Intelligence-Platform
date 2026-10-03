const { Task, Board, Project, Document, Message, Chat, Workspace, Column } = require('../models');
const getDateRangeStart = (range) => {
  const now = new Date();
  if (range === '30days') return new Date(now.setDate(now.getDate() - 30));
  if (range === 'year') return new Date(now.setFullYear(now.getFullYear() - 1));
  return new Date(now.setDate(now.getDate() - 7));
};
const getWorkspaceBoardIds = async (workspaceId) => {
  const projectIds = await Project.find({ workspace: workspaceId }).distinct('_id');
  return Board.find({ project: { $in: projectIds } }).distinct('_id');
};
const getDoneColumns = (boardIds) => Column.find({ board: { $in: boardIds }, name: /^(done|completed)$/i }).distinct('_id');
const getTaskCompletionTrend = async (workspaceId, range) => {
  const boardIds = await getWorkspaceBoardIds(workspaceId);
  const columns = await getDoneColumns(boardIds);
  const startDate = getDateRangeStart(range);
  const trend = await Task.aggregate([
    { $match: { board: { $in: boardIds }, column: { $in: columns }, isArchived: false } },
    { $addFields: { completionDate: { $ifNull: ['$completedAt', '$updatedAt'] } } },
    { $match: { completionDate: { $gte: startDate } } },
    { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$completionDate' } }, count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);
  return trend.map((item) => ({ date: item._id, count: item.count }));
};
const getTeamWorkload = async (workspaceId) => {
  const boardIds = await getWorkspaceBoardIds(workspaceId);
  const doneColumns = await getDoneColumns(boardIds);
  return Task.aggregate([
    { $match: { board: { $in: boardIds }, isArchived: false } },
    { $unwind: '$assignees' },
    { $group: { _id: '$assignees', taskCount: { $sum: 1 }, completedCount: { $sum: { $cond: [{ $in: ['$column', doneColumns] }, 1, 0] } } } },
    { $sort: { taskCount: -1 } }, { $limit: 10 },
    { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } },
    { $unwind: '$user' },
    { $project: { _id: 0, userId: '$user._id', name: { $concat: ['$user.firstName', ' ', { $ifNull: ['$user.lastName', ''] }] }, avatar: '$user.avatar', status: '$user.status', taskCount: 1, completedCount: 1 } },
  ]);
};
const getWorkspaceOverview = async (workspaceId, range = '7days') => {
  const workspace = await Workspace.findById(workspaceId);
  const boardIds = await getWorkspaceBoardIds(workspaceId);
  const columns = await getDoneColumns(boardIds);
  const chatIds = await Chat.find({ workspace: workspaceId }).distinct('_id');
  const startDate = getDateRangeStart(range);
  const [totalTasks, completedTasks, completedThisPeriod, totalDocuments, messageCount] = await Promise.all([
    Task.countDocuments({ board: { $in: boardIds }, isArchived: false }),
    Task.countDocuments({ board: { $in: boardIds }, column: { $in: columns }, isArchived: false }),
    Task.countDocuments({ board: { $in: boardIds }, column: { $in: columns }, isArchived: false, $or: [{ completedAt: { $gte: startDate } }, { completedAt: null, updatedAt: { $gte: startDate } }] }),
    Document.countDocuments({ workspace: workspaceId, isArchived: false }),
    Message.countDocuments({ chat: { $in: chatIds }, isDeleted: false }),
  ]);
  return { productivityScore: totalTasks ? Math.round(completedTasks / totalTasks * 100) : 0, activeMembers: workspace?.members.length || 0, totalTasks, completedTasks, completedThisPeriod, totalDocuments, chatCount: chatIds.length, messageCount, storageUsedMB: workspace?.storageUsedMB || 0, storageQuotaMB: workspace?.storageQuotaMB || 0 };
};
module.exports = { getTaskCompletionTrend, getTeamWorkload, getWorkspaceOverview };
