import { useEffect, useState } from 'react';
import { Trash2, Plus, Check } from 'lucide-react';
import Modal from '../common/Modal';
import Avatar from '../common/Avatar';
import { taskService } from '../../services/task.service';
import { formatRelativeTime } from '../../utils/formatDate';
import { TASK_PRIORITIES, PRIORITY_COLORS } from '../../utils/constants';
import toast from 'react-hot-toast';

const TaskModal = ({ isOpen, onClose, taskId, onUpdated, onDeleted }) => {
  const [task, setTask] = useState(null);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [newChecklistItem, setNewChecklistItem] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && taskId) {
      setLoading(true);
      taskService
        .getTask(taskId)
        .then((res) => {
          setTask(res.data.task);
          setComments(res.data.comments || []);
        })
        .finally(() => setLoading(false));
    } else {
      setTask(null);
      setComments([]);
    }
  }, [isOpen, taskId]);

  const handleFieldUpdate = async (field, value) => {
    const res = await taskService.updateTask(taskId, { [field]: value });
    setTask(res.data.task);
    onUpdated?.(res.data.task);
  };

  const handleAddChecklistItem = async () => {
    if (!newChecklistItem.trim()) return;
    const res = await taskService.addChecklistItem(taskId, newChecklistItem.trim());
    setTask(res.data.task);
    setNewChecklistItem('');
    onUpdated?.(res.data.task);
  };

  const handleToggleChecklist = async (itemId) => {
    const res = await taskService.toggleChecklistItem(taskId, itemId);
    setTask(res.data.task);
    onUpdated?.(res.data.task);
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    const res = await taskService.addComment(taskId, { content: newComment.trim() });
    setComments((prev) => [...prev, res.data.comment]);
    setNewComment('');
  };

  const handleDelete = async () => {
    await taskService.deleteTask(taskId);
    toast.success('Task deleted.');
    onDeleted?.(taskId);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={loading ? 'Loading...' : 'Task Details'} maxWidth="max-w-2xl">
      {task && (
        <div className="space-y-5">
          <input
            defaultValue={task.title}
            onBlur={(e) => e.target.value !== task.title && handleFieldUpdate('title', e.target.value)}
            className="w-full border-none bg-transparent text-lg font-semibold text-gray-900 outline-none"
          />

          <textarea
            defaultValue={task.description}
            placeholder="Add a description..."
            onBlur={(e) =>
              e.target.value !== task.description && handleFieldUpdate('description', e.target.value)
            }
            rows={3}
            className="w-full resize-none rounded-lg border border-gray-200 p-2.5 text-sm text-gray-700 outline-none focus:border-primary-500"
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase text-gray-400">
                Priority
              </label>
              <select
                value={task.priority}
                onChange={(e) => handleFieldUpdate('priority', e.target.value)}
                className={`w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm font-medium capitalize outline-none ${PRIORITY_COLORS[task.priority]}`}
              >
                {TASK_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase text-gray-400">
                Due Date
              </label>
              <input
                type="date"
                defaultValue={task.dueDate ? task.dueDate.slice(0, 10) : ''}
                onChange={(e) => handleFieldUpdate('dueDate', e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-2 py-1.5 text-sm outline-none focus:border-primary-500"
              />
            </div>
          </div>

          {/* Checklist */}
          <div>
            <label className="mb-2 block text-xs font-medium uppercase text-gray-400">
              Checklist
            </label>
            <div className="space-y-1.5">
              {(task.checklist || []).map((item) => (
                <label key={item._id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={item.isDone}
                    onChange={() => handleToggleChecklist(item._id)}
                    className="h-4 w-4 rounded border-gray-300 text-primary-600"
                  />
                  <span className={item.isDone ? 'text-gray-400 line-through' : 'text-gray-700'}>
                    {item.text}
                  </span>
                </label>
              ))}
            </div>
            <div className="mt-2 flex gap-2">
              <input
                value={newChecklistItem}
                onChange={(e) => setNewChecklistItem(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddChecklistItem()}
                placeholder="Add checklist item..."
                className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-primary-500"
              />
              <button
                onClick={handleAddChecklistItem}
                className="rounded-lg bg-gray-100 px-3 py-1.5 text-gray-600 hover:bg-gray-200"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          {/* Comments */}
          <div>
            <label className="mb-2 block text-xs font-medium uppercase text-gray-400">
              Comments ({comments.length})
            </label>
            <div className="max-h-48 space-y-3 overflow-y-auto">
              {comments.map((c) => (
                <div key={c._id} className="flex gap-2.5">
                  <Avatar user={c.author} size="xs" />
                  <div>
                    <p className="text-xs">
                      <span className="font-semibold text-gray-900">
                        {c.author?.firstName} {c.author?.lastName}
                      </span>{' '}
                      <span className="text-gray-400">{formatRelativeTime(c.createdAt)}</span>
                    </p>
                    <p className="text-sm text-gray-700">{c.content}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                placeholder="Write a comment..."
                className="flex-1 rounded-lg border border-gray-200 px-3 py-1.5 text-sm outline-none focus:border-primary-500"
              />
              <button
                onClick={handleAddComment}
                className="rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-primary-700"
              >
                Send
              </button>
            </div>
          </div>

          <div className="flex justify-end border-t border-gray-100 pt-4">
            <button
              onClick={handleDelete}
              className="flex items-center gap-1.5 text-sm font-medium text-red-600 hover:underline"
            >
              <Trash2 size={14} />
              Delete Task
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default TaskModal;
