const catchAsync = require('../utils/catchAsync');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');
const { Task, Column, TaskComment } = require('../models');
const { pushNotification } = require('../sockets/notification.socket');

// POST /api/v1/tasks
const createTask = catchAsync(async (req, res) => {
  const { title, description, boardId, columnId, priority, labels, assignees, dueDate } = req.body;
  const column = await Column.findOne({ _id: columnId, board: boardId });
  if (!column) throw new ApiError(400, 'Column does not belong to this board.');

  const task = await Task.create({
    title,
    description,
    board: boardId,
    column: columnId,
    priority,
    labels,
    assignees,
    dueDate,
    completedAt: /^(done|completed)$/i.test(column.name) ? new Date() : null,
    createdBy: req.user._id,
  });

  await Column.findByIdAndUpdate(columnId, { $push: { taskOrder: task._id } });

  // Notify assignees
  if (assignees?.length) {
    await Promise.all(
      assignees.map((userId) =>
        pushNotification({
          recipient: userId,
          sender: req.user._id,
          type: 'task_assigned',
          title: `You were assigned to "${title}"`,
          entityType: 'Task',
          entityId: task._id,
          link: `/boards/${boardId}?task=${task._id}`,
        })
      )
    );
  }

  await req.audit('task_create', 'Task', task._id);

  const populated = await task.populate('assignees', 'firstName lastName avatar');
  res.status(201).json(new ApiResponse(201, { task: populated }, 'Task created.'));
});

// GET /api/v1/tasks/:id
const getTaskById = catchAsync(async (req, res) => {
  const task = await Task.findById(req.params.id)
    .populate('assignees', 'firstName lastName avatar')
    .populate('createdBy', 'firstName lastName avatar');
  if (!task) throw new ApiError(404, 'Task not found.');

  const comments = await TaskComment.find({ task: task._id })
    .populate('author', 'firstName lastName avatar')
    .sort('createdAt');

  res.status(200).json(new ApiResponse(200, { task, comments }));
});

// PATCH /api/v1/tasks/:id
const updateTask = catchAsync(async (req, res) => {
  const allowedFields = [
    'title',
    'description',
    'priority',
    'labels',
    'assignees',
    'dueDate',
    'timeTrackedMinutes',
  ];
  const updates = {};
  allowedFields.forEach((f) => {
    if (req.body[f] !== undefined) updates[f] = req.body[f];
  });

  const task = await Task.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  }).populate('assignees', 'firstName lastName avatar');

  if (!task) throw new ApiError(404, 'Task not found.');

  await req.audit('task_update', 'Task', task._id, updates);

  res.status(200).json(new ApiResponse(200, { task }, 'Task updated.'));
});

// DELETE /api/v1/tasks/:id
const deleteTask = catchAsync(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) throw new ApiError(404, 'Task not found.');

  await Column.findByIdAndUpdate(task.column, { $pull: { taskOrder: task._id } });
  await task.deleteOne();
  await TaskComment.deleteMany({ task: task._id });

  await req.audit('task_delete', 'Task', task._id);

  res.status(200).json(new ApiResponse(200, null, 'Task deleted.'));
});

// PATCH /api/v1/tasks/:id/move  (REST fallback; primary path is via Socket.IO for live sync)
const moveTask = catchAsync(async (req, res) => {
  const { destColumnId, destIndex } = req.body;
  const task = await Task.findById(req.params.id);
  if (!task) throw new ApiError(404, 'Task not found.');

  const sourceColumnId = task.column;
  const destination = await Column.findOne({ _id: destColumnId, board: task.board });
  if (!destination) throw new ApiError(400, 'Destination column does not belong to this board.');

  if (sourceColumnId.toString() !== destColumnId) {
    await Column.findByIdAndUpdate(sourceColumnId, { $pull: { taskOrder: task._id } });
    await Column.findByIdAndUpdate(destColumnId, {
      $push: { taskOrder: { $each: [task._id], $position: destIndex } },
    });
    task.column = destColumnId;
    task.completedAt = /^(done|completed)$/i.test(destination.name) ? (task.completedAt || new Date()) : null;
    await task.save();
  } else {
    const column = await Column.findById(destColumnId);
    column.taskOrder = column.taskOrder.filter((id) => id.toString() !== task._id.toString());
    column.taskOrder.splice(destIndex, 0, task._id);
    await column.save();
  }

  res.status(200).json(new ApiResponse(200, { task }, 'Task moved.'));
});

// POST /api/v1/tasks/:id/checklist
const addChecklistItem = catchAsync(async (req, res) => {
  const { text } = req.body;
  const task = await Task.findByIdAndUpdate(
    req.params.id,
    { $push: { checklist: { text, isDone: false } } },
    { new: true }
  );
  if (!task) throw new ApiError(404, 'Task not found.');

  res.status(200).json(new ApiResponse(200, { task }, 'Checklist item added.'));
});

// PATCH /api/v1/tasks/:id/checklist/:itemId
const toggleChecklistItem = catchAsync(async (req, res) => {
  const task = await Task.findById(req.params.id);
  if (!task) throw new ApiError(404, 'Task not found.');

  const item = task.checklist.id(req.params.itemId);
  if (!item) throw new ApiError(404, 'Checklist item not found.');

  item.isDone = !item.isDone;
  await task.save();

  res.status(200).json(new ApiResponse(200, { task }, 'Checklist item updated.'));
});

// POST /api/v1/tasks/:id/comments
const addComment = catchAsync(async (req, res) => {
  const { content, mentions = [], parentComment = null } = req.body;

  const comment = await TaskComment.create({
    task: req.params.id,
    author: req.user._id,
    content,
    mentions,
    parentComment,
  });

  if (mentions.length) {
    await Promise.all(
      mentions.map((userId) =>
        pushNotification({
          recipient: userId,
          sender: req.user._id,
          type: 'mention',
          title: `${req.user.firstName} mentioned you in a task comment`,
          message: content.slice(0, 140),
          entityType: 'Task',
          entityId: req.params.id,
        })
      )
    );
  }

  const populated = await comment.populate('author', 'firstName lastName avatar');
  res.status(201).json(new ApiResponse(201, { comment: populated }, 'Comment added.'));
});

module.exports = {
  createTask,
  getTaskById,
  updateTask,
  deleteTask,
  moveTask,
  addChecklistItem,
  toggleChecklistItem,
  addComment,
};
