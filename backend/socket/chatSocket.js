import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Message from '../models/Message.js';
import Chat from '../models/Chat.js';
import Group from '../models/Group.js';

// Store online users
const onlineUsers = new Map();

// Initialize chat socket events
export const initializeChatSocket = (io) => {
  // Authentication is handled in server.js

  io.on('connection', (socket) => {
    console.log(`User ${socket.user.username} connected with socket ${socket.id}`);
    
    // Add user to online users
    onlineUsers.set(socket.userId, {
      socketId: socket.id,
      user: socket.user,
      lastSeen: new Date()
    });

    // Update user online status in database
    User.findByIdAndUpdate(socket.userId, { 
      isOnline: true, 
      lastSeen: new Date() 
    }).exec();

    // Join user to their personal room
    socket.join(`user_${socket.userId}`);

    // Notify contacts about user coming online
    socket.broadcast.emit('user_online', {
      userId: socket.userId,
      user: {
        _id: socket.user._id,
        username: socket.user.username,
        firstName: socket.user.firstName,
        lastName: socket.user.lastName,
        avatar: socket.user.avatar
      },
      lastSeen: new Date()
    });

    // Handle sending messages
    socket.on('send_message', async (data) => {
      try {
        const { chatId, content, media, messageType = 'text', replyTo } = data;
        
        if (!chatId || (!content && !media)) {
          return socket.emit('error', { message: 'Invalid message data' });
        }

        let messageData = {
          sender: socket.userId,
          content: content || null,
          messageType: messageType,
          replyTo: replyTo || null
        };

        // Add media if present
        if (media) {
          messageData.media = media;
        }

        // Determine if it's a group or direct message
        let chat, isGroupMessage = false;
        
        if (chatId.startsWith('group_')) {
          // Group message
          const groupId = chatId.replace('group_', '');
          const group = await Group.findById(groupId);
          
          if (!group || !group.isMember(socket.userId)) {
            return socket.emit('error', { message: 'Group not found or access denied' });
          }

          messageData.groupId = groupId;
          isGroupMessage = true;
          chat = group;
        } else {
          // Direct message
          const directChat = await Chat.findById(chatId);
          if (!directChat || !directChat.participants.includes(socket.userId)) {
            return socket.emit('error', { message: 'Chat not found or access denied' });
          }

          const otherParticipant = directChat.participants.find(p => p.toString() !== socket.userId);
          messageData.receiver = otherParticipant;
          chat = directChat;
        }

        // Create message
        const message = new Message(messageData);
        await message.save();

        // Populate sender info
        await message.populate('sender', 'username firstName lastName avatar');
        if (message.replyTo) {
          await message.populate('replyTo', 'content sender');
        }

        // Update chat/group last message
        chat.updateLastMessage(message);
        chat.incrementUnreadCount(socket.userId);
        await chat.save();

        // Prepare message data for emission
        const messageDataToEmit = {
          _id: message._id,
          sender: message.sender,
          content: message.content,
          media: message.media,
          messageType: message.messageType,
          status: message.status,
          replyTo: message.replyTo,
          createdAt: message.createdAt,
          chatId: chatId
        };

        if (isGroupMessage) {
          // Emit to all group members
          const group = await Group.findById(messageData.groupId).populate('members.user', 'username firstName lastName avatar');
          const memberIds = group.members.map(member => member.user._id.toString());
          
          // Join sender to group room if not already joined
          socket.join(`group_${messageData.groupId}`);
          
          // Emit to all group members
          io.to(`group_${messageData.groupId}`).emit('receive_message', {
            ...messageDataToEmit,
            groupId: messageData.groupId,
            groupName: group.name
          });

          // Update unread counts for all members except sender
          memberIds.forEach(memberId => {
            if (memberId !== socket.userId) {
              io.to(`user_${memberId}`).emit('update_unread_count', {
                chatId: chatId,
                unreadCount: chat.getUnreadCount(memberId)
              });
            }
          });
        } else {
          // Direct message - emit to both participants
          const otherParticipant = messageData.receiver.toString();
          
          // Emit to sender
          socket.emit('message_sent', messageDataToEmit);
          
          // Emit to receiver
          io.to(`user_${otherParticipant}`).emit('receive_message', messageDataToEmit);
          
          // Update unread count for receiver
          io.to(`user_${otherParticipant}`).emit('update_unread_count', {
            chatId: chatId,
            unreadCount: chat.getUnreadCount(otherParticipant)
          });
        }

        // Emit typing stop
        if (isGroupMessage) {
          socket.to(`group_${messageData.groupId}`).emit('stop_typing', {
            userId: socket.userId,
            groupId: messageData.groupId
          });
        } else {
          socket.to(`user_${messageData.receiver}`).emit('stop_typing', {
            userId: socket.userId,
            chatId: chatId
          });
        }

      } catch (error) {
        console.error('Error sending message:', error);
        socket.emit('error', { message: 'Failed to send message' });
      }
    });

    // Handle typing indicators
    socket.on('typing', async (data) => {
      try {
        const { conversationId, isGroup, isTyping } = data;
        
        if (!conversationId) {
          return socket.emit('error', { message: 'conversationId is required' });
        }

        if (isGroup) {
          // Group typing - broadcast to all group members except sender
          const groupId = conversationId.replace('group_', '');
          const group = await Group.findById(groupId);
          
          if (!group || !group.isMember(socket.userId)) {
            return socket.emit('error', { message: 'Group not found or access denied' });
          }

          // Join sender to group room if not already joined
          socket.join(`group_${groupId}`);
          
          // Broadcast to all group members except sender
          socket.to(`group_${groupId}`).emit('user_typing', {
            userId: socket.userId,
            user: {
              _id: socket.user._id,
              username: socket.user.username,
              firstName: socket.user.firstName,
              lastName: socket.user.lastName
            },
            groupId: groupId,
            groupName: group.name,
            isTyping: isTyping
          });
        } else {
          // Direct message typing - send only to recipient
          const chat = await Chat.findById(conversationId);
          if (!chat || !chat.participants.includes(socket.userId)) {
            return socket.emit('error', { message: 'Chat not found or access denied' });
          }

          const otherParticipant = chat.participants.find(p => p.toString() !== socket.userId);
          if (otherParticipant) {
            socket.to(`user_${otherParticipant}`).emit('user_typing', {
              userId: socket.userId,
              user: {
                _id: socket.user._id,
                username: socket.user.username,
                firstName: socket.user.firstName,
                lastName: socket.user.lastName
              },
              chatId: conversationId,
              isTyping: isTyping
            });
          }
        }
      } catch (error) {
        console.error('Error handling typing:', error);
        socket.emit('error', { message: 'Failed to handle typing event' });
      }
    });

    // Handle joining group room
    socket.on('join_group', (groupId) => {
      socket.join(`group_${groupId}`);
      console.log(`User ${socket.user.username} joined group ${groupId}`);
    });

    // Handle leaving group room
    socket.on('leave_group', (groupId) => {
      socket.leave(`group_${groupId}`);
      console.log(`User ${socket.user.username} left group ${groupId}`);
    });

    // Handle marking messages as read
    socket.on('mark_as_read', async (data) => {
      try {
        const { chatId, messageId } = data;
        
        let chat;
        if (chatId.startsWith('group_')) {
          const groupId = chatId.replace('group_', '');
          chat = await Group.findById(groupId);
        } else {
          chat = await Chat.findById(chatId);
        }

        if (chat && messageId) {
          chat.markAsRead(socket.userId, messageId);
          await chat.save();

          // Notify sender that message was read
          const message = await Message.findById(messageId);
          if (message && message.sender.toString() !== socket.userId) {
            io.to(`user_${message.sender}`).emit('message_read', {
              messageId: messageId,
              readBy: socket.userId,
              readAt: new Date()
            });
          }
        }
      } catch (error) {
        console.error('Error marking message as read:', error);
      }
    });

    // Handle user going offline
    socket.on('disconnect', async () => {
      console.log(`User ${socket.user.username} disconnected`);
      
      // Remove from online users
      onlineUsers.delete(socket.userId);

      // Update user offline status in database
      await User.findByIdAndUpdate(socket.userId, { 
        isOnline: false, 
        lastSeen: new Date() 
      }).exec();

      // Notify contacts about user going offline
      socket.broadcast.emit('user_offline', {
        userId: socket.userId,
        lastSeen: new Date()
      });
    });
  });

  // Return online users getter
  return {
    getOnlineUsers: () => onlineUsers,
    getOnlineUser: (userId) => onlineUsers.get(userId)
  };
};
