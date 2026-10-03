import { useEffect, useState } from 'react';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { useDispatch, useSelector } from 'react-redux';
import { Plus } from 'lucide-react';
import KanbanColumn from './KanbanColumn';
import TaskModal from './TaskModal';
import { fetchBoard, applyTaskMove, moveTaskLocally, addTaskToColumn } from '../../store/taskSlice';
import { taskService } from '../../services/task.service';
import { useSocket } from '../../hooks/useSocket';
import toast from 'react-hot-toast';

const KanbanBoard = ({ boardId }) => {
  const dispatch = useDispatch();
  const { columns, currentBoard, status } = useSelector((state) => state.task);
  const { socket } = useSocket();

  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [addingToColumn, setAddingToColumn] = useState(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  useEffect(() => {
    if (boardId) dispatch(fetchBoard(boardId));
  }, [dispatch, boardId]);

  useEffect(() => {
    if (!socket || !boardId) return;

    socket.emit('board:join', boardId);

    const handleTaskMoved = (payload) => dispatch(applyTaskMove(payload));
    socket.on('task:moved', handleTaskMoved);

    return () => {
      socket.emit('board:leave', boardId);
      socket.off('task:moved', handleTaskMoved);
    };
  }, [socket, boardId, dispatch]);

  const handleDropTask = ({ taskId, sourceColumnId, destColumnId, destIndex }) => {
    // Optimistic local update
    dispatch(moveTaskLocally({ taskId, sourceColumnId, destColumnId, destIndex }));

    // Broadcast + persist via socket (falls back to REST if socket unavailable)
    if (socket) {
      socket.emit('task:move', { boardId, taskId, sourceColumnId, destColumnId, destIndex });
    } else {
      taskService.moveTask(taskId, { destColumnId, destIndex }).catch(() => {
        toast.error('Failed to move task.');
      });
    }
  };

  const handleCreateTask = async (columnId) => {
    if (!newTaskTitle.trim()) return;
    try {
      const res = await taskService.createTask({
        title: newTaskTitle.trim(),
        boardId,
        columnId,
      });
      dispatch(addTaskToColumn({ columnId, task: res.data.task }));
      setNewTaskTitle('');
      setAddingToColumn(null);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create task.');
    }
  };

  if (status === 'loading') {
    return <div className="py-12 text-center text-gray-400">Loading board...</div>;
  }

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{currentBoard?.name}</h2>
          {currentBoard?.activeSprint && (
            <p className="mt-0.5 flex items-center gap-1.5 text-sm text-gray-500">
              <span className="h-2 w-2 rounded-full bg-primary-500" />
              Active Sprint: {currentBoard.activeSprint}
            </p>
          )}
        </div>
      </div>

      <div className="mt-5 flex gap-4 overflow-x-auto pb-4">
        {columns.map((column) => (
          <div key={column._id} className="flex flex-col">
            <KanbanColumn
              column={column}
              onDropTask={handleDropTask}
              onTaskClick={(task) => setSelectedTaskId(task._id)}
              onAddTask={(colId) => setAddingToColumn(colId)}
            />
            {addingToColumn === column._id && (
              <div className="mt-2 w-72 rounded-lg border border-primary-200 bg-white p-2 shadow-sm">
                <input
                  autoFocus
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleCreateTask(column._id)}
                  placeholder="Task title..."
                  className="w-full border-none text-sm outline-none"
                />
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => handleCreateTask(column._id)}
                    className="flex items-center gap-1 rounded-md bg-primary-600 px-2 py-1 text-xs font-medium text-white"
                  >
                    <Plus size={12} /> Add
                  </button>
                  <button
                    onClick={() => setAddingToColumn(null)}
                    className="rounded-md px-2 py-1 text-xs text-gray-500 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <TaskModal
        isOpen={!!selectedTaskId}
        taskId={selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onDeleted={() => dispatch(fetchBoard(boardId))}
        onUpdated={() => dispatch(fetchBoard(boardId))}
      />
    </DndProvider>
  );
};

export default KanbanBoard;
