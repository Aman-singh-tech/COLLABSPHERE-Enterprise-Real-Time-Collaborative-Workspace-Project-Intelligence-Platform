import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useSelector } from 'react-redux';

const SocketContext = createContext(null);

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

export const SocketProvider = ({ children }) => {
  const { isAuthenticated } = useSelector((state) => state.auth);
  const [connected, setConnected] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      setConnected(false);
      return;
    }

    const socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    // Heartbeat / keep‑alive – emit a lightweight event every 20 s to keep the WebSocket alive
    const keepAliveInterval = setInterval(() => {
      socket.emit('ping:keepalive');
    }, 20000);

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));
    socket.on('reconnect', () => setConnected(true));
    socket.on('connect_error', (err) => {
      // eslint-disable-next-line no-console
      console.error('Socket connection error:', err.message);
    });



    socketRef.current = socket;

    return () => {
      clearInterval(keepAliveInterval);
      socket.disconnect();
    };
  }, [isAuthenticated]);

  return (
    <SocketContext.Provider value={{ socket: socketRef.current, connected }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === null) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export default SocketContext;
