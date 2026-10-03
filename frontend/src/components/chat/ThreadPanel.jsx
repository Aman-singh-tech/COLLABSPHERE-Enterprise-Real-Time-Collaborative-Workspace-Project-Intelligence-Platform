import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import Avatar from '../common/Avatar';
import MessageInput from './MessageInput';
import { chatService } from '../../services/chat.service';
import { formatRelativeTime } from '../../utils/formatDate';
import { useSocket } from '../../hooks/useSocket';

const URL_REGEX = /(https?:\/\/[^\s]+)/g;

const ThreadPanel = ({ parentMessage, onClose, onReply }) => {
  const [replies, setReplies] = useState([]);
  const { socket } = useSocket();

  const renderFormattedContent = (content) => {
    if (!content) return null;
    const parts = content.split(URL_REGEX);
    return parts.map((part, idx) => {
      if (part.match(URL_REGEX)) {
        return (
          <a
            key={idx}
            href={part}
            target={part.startsWith(window.location.origin) ? '_self' : '_blank'}
            rel="noopener noreferrer"
            className="text-indigo-600 hover:text-indigo-800 underline font-medium break-all"
          >
            {part}
          </a>
        );
      }
      return part;
    });
  };

  useEffect(() => {
    if (parentMessage) {
      chatService.getThreadReplies(parentMessage._id).then((res) => setReplies(res.data.replies));
    }
  }, [parentMessage]);

  useEffect(() => {
    const receive = (message) => {
      if (String(message.parentMessage) === String(parentMessage?._id)) setReplies((previous) => previous.some((reply) => reply._id === message._id) ? previous : [...previous, message]);
    };
    socket?.on('message:new', receive);
    return () => socket?.off('message:new', receive);
  }, [socket, parentMessage?._id]);

  if (!parentMessage) return null;

  const handleReply = (content) => {
    onReply(content, parentMessage._id);
  };

  return (
    <div className="flex w-80 flex-shrink-0 flex-col border-l border-gray-100 bg-white">
      <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
        <h3 className="font-semibold text-gray-900">Thread</h3>
        <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
          <X size={16} />
        </button>
      </div>

      <div className="border-b border-gray-100 p-4">
        <div className="flex gap-2.5">
          <Avatar user={parentMessage.sender} size="sm" />
          <div>
            <p className="text-sm font-semibold text-gray-900">
              {parentMessage.sender?.firstName} {parentMessage.sender?.lastName}
            </p>
            <p className="text-xs text-gray-400">{formatRelativeTime(parentMessage.createdAt)}</p>
            <p className="mt-1 text-sm text-gray-700">{renderFormattedContent(parentMessage.content)}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <p className="text-xs font-medium text-gray-400">
          {replies.length} {replies.length === 1 ? 'reply' : 'replies'}
        </p>
        {replies.map((reply) => (
          <div key={reply._id} className="flex gap-2.5">
            <Avatar user={reply.sender} size="xs" />
            <div>
              <p className="text-xs">
                <span className="font-semibold text-gray-900">
                  {reply.sender?.firstName} {reply.sender?.lastName}
                </span>{' '}
                <span className="text-gray-400">{formatRelativeTime(reply.createdAt)}</span>
              </p>
              <p className="text-sm text-gray-700">{renderFormattedContent(reply.content)}</p>
            </div>
          </div>
        ))}
      </div>

      <MessageInput onSend={handleReply} onTyping={() => {}} placeholder="Reply in thread..." />
    </div>
  );
};

export default ThreadPanel;
