import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const initializeFeedSocket = (io) => {
  // Middleware to authenticate socket connections
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select('-password');
      
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.userId = user._id;
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    console.log(`User ${socket.user.username} connected to feed`);

    // Join user to their personal room for notifications
    socket.join(`user_${socket.userId}`);

    // Join feed room for real-time updates
    socket.join('feed');

    // Handle new post creation
    socket.on('new_post', (postData) => {
      // Broadcast to all users in feed room
      socket.to('feed').emit('post_created', postData);
    });

    // Handle post like/unlike
    socket.on('post_liked', (data) => {
      socket.to('feed').emit('post_updated', {
        type: 'like',
        postId: data.postId,
        likeCount: data.likeCount,
        userId: socket.userId
      });
    });

    // Handle post comment
    socket.on('post_commented', (data) => {
      socket.to('feed').emit('post_updated', {
        type: 'comment',
        postId: data.postId,
        commentCount: data.commentCount,
        comment: data.comment,
        userId: socket.userId
      });
    });

    // Handle post share
    socket.on('post_shared', (data) => {
      socket.to('feed').emit('post_updated', {
        type: 'share',
        postId: data.postId,
        shareCount: data.shareCount,
        userId: socket.userId
      });
    });

    // Handle post congratulations
    socket.on('post_congratulated', (data) => {
      socket.to('feed').emit('post_updated', {
        type: 'congratulations',
        postId: data.postId,
        congratulationsCount: data.congratulationsCount,
        userId: socket.userId
      });
    });

    // Handle user online status
    socket.on('user_online', () => {
      socket.to('feed').emit('user_status', {
        userId: socket.userId,
        status: 'online',
        username: socket.user.username
      });
    });

    // Handle user offline status
    socket.on('user_offline', () => {
      socket.to('feed').emit('user_status', {
        userId: socket.userId,
        status: 'offline',
        username: socket.user.username
      });
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log(`User ${socket.user.username} disconnected from feed`);
      socket.to('feed').emit('user_status', {
        userId: socket.userId,
        status: 'offline',
        username: socket.user.username
      });
    });
  });
};
