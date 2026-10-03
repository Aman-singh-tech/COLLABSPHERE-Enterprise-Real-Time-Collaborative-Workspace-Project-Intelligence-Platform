import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Smile, FileText, Trash2, Video, ExternalLink, MessageSquare } from 'lucide-react';
import Avatar from '../common/Avatar';
import { formatRelativeTime } from '../../utils/formatDate';

const QUICK_REACTIONS = ['👍', '❤️', '😂', '🎉', '🙌'];
const URL_REGEX = /(https?:\/\/[^\s]+)/g;

const MessageBubble = ({ message, onReact, onOpenThread, onDeleteForMe, currentUserId }) => {
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const { workspaceId } = useParams();

  const getInternalPath = (urlStr) => {
    if (!urlStr) return null;
    try {
      const parsed = new URL(urlStr, window.location.origin);
      if (parsed.origin === window.location.origin) {
        return `${parsed.pathname}${parsed.search}${parsed.hash}`;
      }
    } catch {
      if (urlStr.startsWith('/')) return urlStr;
    }
    return null;
  };

  const renderFormattedContent = (content) => {
    if (!content) return null;
    const parts = content.split(URL_REGEX);
    return parts.map((part, idx) => {
      if (part.match(URL_REGEX)) {
        const internalPath = getInternalPath(part);
        if (internalPath) {
          return (
            <Link
              key={idx}
              to={internalPath}
              className="text-indigo-600 hover:text-indigo-800 underline font-medium break-all"
            >
              {part}
            </Link>
          );
        }
        return (
          <a
            key={idx}
            href={part}
            target="_blank"
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

  const containsCallUrl = message.content && (message.content.includes('/chat') || message.content.includes('call='));
  const extractedUrl = message.content?.match(URL_REGEX)?.[0];
  const internalCallPath = getInternalPath(extractedUrl);

  return (
    <div className="group flex gap-3 rounded-lg px-2 py-1.5 hover:bg-gray-50">
      <Avatar user={message.sender} size="sm" />
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-semibold text-gray-900">
            {message.sender?.firstName} {message.sender?.lastName}
          </span>
          <span className="text-xs text-gray-400">{formatRelativeTime(message.createdAt)}</span>
        </div>
        {message.content && (
          <p className="mt-0.5 whitespace-pre-wrap text-sm text-gray-700">
            {renderFormattedContent(message.content)}
          </p>
        )}

        {/* Video Call Invite Card */}
        {containsCallUrl && (
          <div className="mt-2 flex max-w-sm items-center justify-between gap-3 rounded-xl border border-indigo-200 bg-gradient-to-r from-indigo-50/90 via-blue-50/80 to-indigo-50/90 p-3 shadow-sm">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white shadow-md">
                <Video size={20} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-[11px] font-bold text-indigo-900 uppercase tracking-wider">
                  Video Call Invite
                </p>
                <p className="truncate text-xs font-medium text-gray-700">Click to join live meeting</p>
              </div>
            </div>
            {internalCallPath ? (
              <Link
                to={internalCallPath}
                className="shrink-0 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow transition-all hover:bg-indigo-700 active:scale-95 flex items-center gap-1"
              >
                <span>Join</span>
                <Video size={13} />
              </Link>
            ) : (
              <a
                href={extractedUrl || '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow transition-all hover:bg-indigo-700 active:scale-95 flex items-center gap-1"
              >
                <span>Join</span>
                <ExternalLink size={13} />
              </a>
            )}
          </div>
        )}

        {/* Shared Document Card */}
        {message.sharedDocument && (
          <div className="mt-2 flex max-w-sm items-center justify-between gap-3 rounded-xl border border-primary-200 bg-gradient-to-r from-primary-50/70 to-blue-50/70 p-3 shadow-sm">
            <div className="flex items-center gap-3 min-w-0">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary-600 text-white shadow-sm">
                <FileText size={20} />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-primary-900 uppercase tracking-wider">
                  Shared Document
                </p>
                <p className="truncate text-sm font-semibold text-gray-900">
                  {message.sharedDocument.title || 'Untitled Document'}
                </p>
              </div>
            </div>
            <Link
              to={`/workspaces/${workspaceId}/documents/${message.sharedDocument._id || message.sharedDocument}`}
              className="shrink-0 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-primary-600 shadow-sm transition-all hover:bg-primary-600 hover:text-white border border-primary-200"
            >
              Open
            </Link>
          </div>
        )}

        {message.reactions?.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {message.reactions
              .filter((r) => r.users?.length > 0)
              .map((r) => (
                <button
                  key={r.emoji}
                  onClick={() => onReact(message._id, r.emoji)}
                  className={`flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${
                    r.users.includes(currentUserId)
                      ? 'border-primary-300 bg-primary-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  {r.emoji} {r.users.length}
                </button>
              ))}
          </div>
        )}

        {(
          <button
            onClick={() => onOpenThread(message)}
            className="mt-1.5 text-xs font-medium text-primary-600 hover:underline"
          >
            {message.threadReplyCount > 0 ? `${message.threadReplyCount} replies` : 'Reply in thread'}
          </button>
        )}
      </div>

      <div className="relative flex items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={() => setShowReactionPicker((p) => !p)}
          title="Add reaction"
          className="rounded-md p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
        >
          <Smile size={16} />
        </button>

        <button
          onClick={() => onDeleteForMe(message._id)}
          title="Delete for me"
          className="rounded-md p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
        >
          <Trash2 size={15} />
        </button>

        {showReactionPicker && (
          <div className="absolute right-0 top-8 z-10 flex gap-1 rounded-lg border border-gray-100 bg-white p-1.5 shadow-lg">
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => {
                  onReact(message._id, emoji);
                  setShowReactionPicker(false);
                }}
                className="rounded p-1 text-lg hover:bg-gray-100"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default MessageBubble;
