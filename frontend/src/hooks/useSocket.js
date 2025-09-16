import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';

export const useSocket = () => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [typingUsers, setTypingUsers] = useState([]);
  const socketRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;

    // Initialize socket connection
    const newSocket = io('http://localhost:5000', {
      auth: { token },
      transports: ['websocket', 'polling']
    });

    socketRef.current = newSocket;

    // Connection events
    newSocket.on('connect', () => {
      console.log('Connected to chat server');
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from chat server');
      setIsConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
      setIsConnected(false);
    });

    // User presence events
    newSocket.on('user_online', (data) => {
      setOnlineUsers(prev => new Set([...prev, data.userId]));
    });

    newSocket.on('user_offline', (data) => {
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        newSet.delete(data.userId);
        return newSet;
      });
    });

    // Typing events
    newSocket.on('user_typing', (data) => {
      setTypingUsers(prev => {
        const filtered = prev.filter(u => u.userId !== data.userId);
        if (data.isTyping) {
          return [...filtered, data];
        }
        return filtered;
      });
    });

    newSocket.on('stop_typing', (data) => {
      setTypingUsers(prev => prev.filter(u => u.userId !== data.userId));
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      newSocket.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  }, []);

  // Socket methods
  const emit = (event, data) => {
    if (socket && isConnected) {
      socket.emit(event, data);
    }
  };

  const on = (event, callback) => {
    if (socket) {
      socket.on(event, callback);
    }
  };

  const off = (event, callback) => {
    if (socket) {
      socket.off(event, callback);
    }
  };

  const joinRoom = (room) => {
    if (socket && isConnected) {
      socket.emit('join_room', room);
    }
  };

  const leaveRoom = (room) => {
    if (socket && isConnected) {
      socket.emit('leave_room', room);
    }
  };

  const sendMessage = (messageData) => {
    emit('send_message', messageData);
  };

  const startTyping = (chatId) => {
    emit('typing', { chatId, isTyping: true });
  };

  const stopTyping = (chatId) => {
    emit('typing', { chatId, isTyping: false });
  };

  const markAsRead = (chatId, messageId) => {
    emit('mark_as_read', { chatId, messageId });
  };

  const joinGroup = (groupId) => {
    emit('join_group', groupId);
  };

  const leaveGroup = (groupId) => {
    emit('leave_group', groupId);
  };

  return {
    socket,
    isConnected,
    onlineUsers,
    typingUsers,
    emit,
    on,
    off,
    joinRoom,
    leaveRoom,
    sendMessage,
    startTyping,
    stopTyping,
    markAsRead,
    joinGroup,
    leaveGroup
  };
};
