import { useEffect, useRef } from 'react';
import { Info, Hash, Trash2, Video } from 'lucide-react';
import MessageBubble from './MessageBubble';
import MessageInput from './MessageInput';
import CallNotificationBanner from './video/CallNotificationBanner';

const ChatWindow = ({
  chat,
  messages,
  typingUsers,
  onSendMessage,
  onTyping,
  onReact,
  onOpenThread,
  onDeleteForMe,
  onClearChatForMe,
  currentUserId,
  onToggleInfo,
  onStartCall,
  isStartingCall,
  isCallActive = false,
  callActiveCount = 0,
}) => {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!chat) {
    return (
      <div className="flex flex-1 items-center justify-center text-gray-400">
        Select a channel or conversation to start chatting.
      </div>
    );
  }

  const typingNames = Object.values(typingUsers || {});

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3">
        <div className="flex items-center gap-2">
          <Hash size={16} className="text-gray-400" />
          <h2 className="font-semibold text-gray-900">{chat.name || 'Direct Message'}</h2>
          {chat.members?.length > 0 && (
            <span className="text-sm text-gray-400">· {chat.members.length}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onStartCall}
            disabled={isStartingCall}
            title={isCallActive ? 'Return to Video Call' : 'Start Video Call'}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-600 hover:bg-indigo-100 transition-colors shadow-sm"
          >
            <Video size={15} />
            <span>{isStartingCall ? 'Starting…' : isCallActive ? 'In Call' : 'Video Call'}</span>
          </button>

          <button
            onClick={() => onClearChatForMe(chat._id)}
            title="Clear chat history for me"
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors"
          >
            <Trash2 size={14} />
            <span>Clear Chat</span>
          </button>
          <button onClick={onToggleInfo} className="rounded-lg p-2 text-gray-400 hover:bg-gray-100">
            <Info size={18} />
          </button>
        </div>
      </div>

      {callActiveCount > 0 && !isCallActive && (
        <CallNotificationBanner activeCount={callActiveCount} onJoinCall={onStartCall} />
      )}

      <div className="flex-1 space-y-1 overflow-y-auto px-4 py-4">
        {messages.map((msg) => (
          <MessageBubble
            key={msg._id}
            message={msg}
            onReact={onReact}
            onOpenThread={onOpenThread}
            onDeleteForMe={onDeleteForMe}
            currentUserId={currentUserId}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {typingNames.length > 0 && (
        <p className="px-5 pb-1 text-xs italic text-gray-400">
          {typingNames.join(', ')} {typingNames.length === 1 ? 'is' : 'are'} typing...
        </p>
      )}

      <MessageInput
        onSend={onSendMessage}
        onTyping={onTyping}
        workspaceId={chat?.workspace}
        placeholder={`Message #${chat.name || 'chat'}...`}
      />
    </div>
  );
};

export default ChatWindow;
