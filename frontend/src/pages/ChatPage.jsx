import { useEffect, useState } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import ChatSidebar from '../components/chat/ChatSidebar';
import ChatWindow from '../components/chat/ChatWindow';
import ThreadPanel from '../components/chat/ThreadPanel';
import VideoCallModal from '../components/chat/video/VideoCallModal';
import Loader from '../components/common/Loader';
import {
  fetchChats,
  fetchMessages,
  setActiveChat,
  receiveMessage,
  updateMessageReactions,
  setTyping,
  removeMessageForMe,
  clearAllMessages,
} from '../store/chatSlice';
import { chatService } from '../services/chat.service';
import { useSocket } from '../hooks/useSocket';
import { useAuth } from '../hooks/useAuth';
import { useWebRTCCall } from '../hooks/useWebRTCCall';

const ChatPage = () => {
  const { workspaceId } = useParams();
  const location = useLocation();
  const dispatch = useDispatch();
  const { socket } = useSocket();
  const { user } = useAuth();
  const { chats, activeChatId, messages, typingUsers, status } = useSelector((s) => s.chat);

  const [threadMessage, setThreadMessage] = useState(null);
  const [callActiveCount, setCallActiveCount] = useState(0);

  const webrtcCall = useWebRTCCall({
    socket,
    activeChatId,
    user,
  });

  useEffect(() => {
    if (workspaceId) dispatch(fetchChats(workspaceId));
  }, [dispatch, workspaceId]);

  useEffect(() => {
    if (chats.length > 0 && !activeChatId) {
      const defaultChat = chats.find((c) => c.type === 'channel') || chats[0];
      handleSelectChat(defaultChat);
    }
  }, [chats, activeChatId]);

  // Auto-start video call if URL parameter ?joinCall=true is present
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('joinCall') === 'true' && activeChatId && !webrtcCall.isCallActive) {
      webrtcCall.startCall();
    }
  }, [location.search, activeChatId, webrtcCall.isCallActive]);

  const activeChat = chats.find((c) => c._id === activeChatId);

  useEffect(() => {
    if (!socket || !activeChatId) return;

    // Ensure socket is joined to active chat room
    socket.emit('chat:join', activeChatId);

    const handleNewMessage = (msg) => {
      const msgChatId = msg.chat?._id || msg.chat;
      if (String(msgChatId) === String(activeChatId)) {
        if (msg.parentMessage) dispatch(fetchMessages(activeChatId));
        else dispatch(receiveMessage(msg));
      }
    };
    const handleReactionUpdate = (payload) => dispatch(updateMessageReactions(payload));
    const handleTyping = (payload) => dispatch(setTyping(payload));
    const handleCallStatusUpdate = (payload) => {
      if (String(payload.chatId) === String(activeChatId)) {
        setCallActiveCount(payload.activeCount || 0);
      }
    };

    socket.on('message:new', handleNewMessage);
    socket.on('message:reaction:update', handleReactionUpdate);
    socket.on('chat:typing:update', handleTyping);
    socket.on('call:status-update', handleCallStatusUpdate);

    return () => {
      socket.off('message:new', handleNewMessage);
      socket.off('message:reaction:update', handleReactionUpdate);
      socket.off('chat:typing:update', handleTyping);
      socket.off('call:status-update', handleCallStatusUpdate);
    };
  }, [socket, activeChatId, dispatch]);

  useEffect(() => {
    if (webrtcCall.error) {
      toast.error(webrtcCall.error);
    }
  }, [webrtcCall.error]);

  const handleSelectChat = (chat) => {
    if (!chat?._id) return;
    if (socket && activeChatId) socket.emit('chat:leave', activeChatId);
    dispatch(setActiveChat(chat._id));
    dispatch(fetchMessages(chat._id));
    if (socket) socket.emit('chat:join', chat._id);
    setCallActiveCount(0);
  };

  const handleSendMessage = (content, parentMessage = null, sharedDocument = null) => {
    if (!socket || !activeChatId) return;
    socket.emit('message:send', { chatId: activeChatId, content, parentMessage, sharedDocument });
  };

  const handleTyping = (isTyping) => {
    if (socket && activeChatId) socket.emit('chat:typing', { chatId: activeChatId, isTyping });
  };

  const handleReact = (messageId, emoji) => {
    if (socket && activeChatId) socket.emit('message:react', { messageId, chatId: activeChatId, emoji });
  };

  const handleDeleteForMe = async (messageId) => {
    try {
      await chatService.deleteMessageForMe(messageId);
      dispatch(removeMessageForMe(messageId));
    } catch {
      // ignore
    }
  };

  const handleClearChatForMe = async (chatId) => {
    if (!window.confirm('Are you sure you want to clear this chat history for yourself?')) return;
    try {
      await chatService.clearChatForMe(chatId);
      dispatch(clearAllMessages());
    } catch {
      // ignore
    }
  };

  if (status === 'loading' && !chats.length) return <Loader />;

  return (
    <div className="-m-6 flex h-[calc(100vh-64px)]">
      <ChatSidebar
        chats={chats}
        activeChatId={activeChatId}
        onSelectChat={handleSelectChat}
        currentUserId={user?._id}
      />
      <ChatWindow
        chat={activeChat}
        messages={messages}
        typingUsers={typingUsers}
        onSendMessage={handleSendMessage}
        onTyping={handleTyping}
        onReact={handleReact}
        onOpenThread={setThreadMessage}
        onDeleteForMe={handleDeleteForMe}
        onClearChatForMe={handleClearChatForMe}
        currentUserId={user?._id}
        onToggleInfo={() => {}}
        onStartCall={webrtcCall.startCall}
        isStartingCall={webrtcCall.isStartingCall}
        isCallActive={webrtcCall.isCallActive}
        callActiveCount={callActiveCount}
      />
      {threadMessage && (
        <ThreadPanel
          parentMessage={threadMessage}
          onClose={() => setThreadMessage(null)}
          onReply={handleSendMessage}
        />
      )}

      {/* Render Google Meet style WebRTC Video Call Overlay Modal */}
      {webrtcCall.isCallActive && (
        <VideoCallModal
          chatName={activeChat?.name || 'Direct Message Call'}
          localStream={webrtcCall.localStream}
          participants={webrtcCall.participants}
          user={user}
          isMuted={webrtcCall.isMuted}
          isVideoOff={webrtcCall.isVideoOff}
          isScreenSharing={webrtcCall.isScreenSharing}
          callDuration={webrtcCall.callDuration}
          onToggleAudio={webrtcCall.toggleAudio}
          onToggleVideo={webrtcCall.toggleVideo}
          onToggleScreenShare={webrtcCall.toggleScreenShare}
          onLeaveCall={webrtcCall.leaveCall}
        />
      )}
    </div>
  );
};

export default ChatPage;

