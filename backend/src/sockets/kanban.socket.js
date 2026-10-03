const { Task, Column } = require('../models');
const logger = require('../utils/logger');

const registerKanbanHandlers = (io, socket) => {
  socket.on('board:join', (boardId) => {
    socket.join(`board:${boardId}`);
  });

  socket.on('board:leave', (boardId) => {
    socket.leave(`board:${boardId}`);
  });

  // Optimistic drag-and-drop move, broadcast to everyone else viewing the board
  socket.on('task:move', async ({ boardId, taskId, sourceColumnId, destColumnId, destIndex }) => {
    try {
      const destination = await Column.findOne({ _id: destColumnId, board: boardId });
      const task = await Task.findOne({ _id: taskId, board: boardId });
      if (!destination || !task || task.column.toString() !== sourceColumnId) throw new Error('Invalid task move.');
      if (sourceColumnId !== destColumnId) {
        await Column.findByIdAndUpdate(sourceColumnId, { $pull: { taskOrder: taskId } });
        await Column.findByIdAndUpdate(destColumnId, {
          $push: { taskOrder: { $each: [taskId], $position: destIndex } },
        });
        await Task.findByIdAndUpdate(taskId, { column: destColumnId, completedAt: /^(done|completed)$/i.test(destination.name) ? (task.completedAt || new Date()) : null });
      } else {
        const column = await Column.findById(destColumnId);
        column.taskOrder = column.taskOrder.filter((id) => id.toString() !== taskId);
        column.taskOrder.splice(destIndex, 0, taskId);
        await column.save();
      }

      socket.to(`board:${boardId}`).emit('task:moved', {
        taskId,
        sourceColumnId,
        destColumnId,
        destIndex,
        movedBy: socket.user._id,
      });
    } catch (err) {
      logger.error(`task:move failed: ${err.message}`);
      socket.emit('task:move:error', { message: 'Failed to sync task move.' });
    }
  });

  socket.on('task:update', (payload) => {
    socket.to(`board:${payload.boardId}`).emit('task:updated', payload);
  });
};

module.exports = { registerKanbanHandlers };
