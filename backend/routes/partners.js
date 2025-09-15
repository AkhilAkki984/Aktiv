import express from 'express';
import auth from '../middleware/auth.js';
import User from '../models/User.js';
import Connection from '../models/Connection.js';

const router = express.Router();

// Get partners based on status filter
router.get('/', auth, async (req, res) => {
  try {
    const { 
      status, // 'available', 'pending', 'accepted'
      q, // search query
      type, // 'local' or 'virtual'
      page = 1, 
      limit = 20 
    } = req.query;
    
    const currentUserId = req.user.id;
    const currentUser = await User.findById(currentUserId);
    
    if (!currentUser) {
      return res.status(404).json({ msg: 'User not found' });
    }

    let query = { _id: { $ne: currentUserId } }; // Exclude current user
    let filteredUserIds = [];

    // Filter users based on status
    if (status === 'available') {
      // Show users with no connection or rejected connections
      const allUsers = await User.find(query, '_id').lean();
      const connections = await Connection.find({
        $or: [
          { requester: currentUserId },
          { receiver: currentUserId }
        ]
      });
      
      const connectionMap = {};
      connections.forEach(conn => {
        const otherUserId = conn.requester.toString() === currentUserId 
          ? conn.receiver.toString() 
          : conn.requester.toString();
        connectionMap[otherUserId] = conn.status;
      });
      
      filteredUserIds = allUsers
        .filter(user => {
          const connectionStatus = connectionMap[user._id.toString()];
          return !connectionStatus || connectionStatus === 'REJECTED';
        })
        .map(user => user._id);
        
    } else if (status === 'pending') {
      // Show users who sent requests to current user
      const pendingConnections = await Connection.find({
        receiver: currentUserId,
        status: 'PENDING'
      }).populate('requester', '_id');
      
      filteredUserIds = pendingConnections.map(conn => conn.requester._id);
      
    } else if (status === 'accepted') {
      // Show users who are connected (accepted)
      const acceptedConnections = await Connection.find({
        $or: [
          { requester: currentUserId, status: 'ACCEPTED' },
          { receiver: currentUserId, status: 'ACCEPTED' }
        ]
      }).populate('requester receiver', '_id');
      
      filteredUserIds = acceptedConnections.map(conn => {
        return conn.requester._id.toString() === currentUserId 
          ? conn.receiver._id 
          : conn.requester._id;
      });
    }

    // If no users match the filter, return empty result
    if (filteredUserIds.length === 0) {
      return res.json({
        partners: [],
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalCount: 0,
          hasNext: false,
          hasPrev: false
        }
      });
    }

    // Update query to include only filtered user IDs
    query._id = { $in: filteredUserIds };

    // Add search filter
    if (q) {
      const searchRegex = new RegExp(q, 'i');
      query.$and = [
        { _id: { $in: filteredUserIds } },
        {
          $or: [
            { firstName: searchRegex },
            { lastName: searchRegex },
            { username: searchRegex },
            { city: searchRegex },
            { state: searchRegex },
            { bio: searchRegex },
            { goals: { $in: [searchRegex] } }
          ]
        }
      ];
    }

    // Add partner preference filter
    if (type === 'local') {
      query.partnerPreference = { $in: ['LOCAL', 'BOTH'] };
      query['geoLocation.latitude'] = { $exists: true };
      query['geoLocation.longitude'] = { $exists: true };
    } else if (type === 'virtual') {
      query.partnerPreference = { $in: ['VIRTUAL', 'BOTH'] };
    }

    // Execute query with pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const users = await User.find(query)
      .select('firstName lastName username avatar bio city state geoLocation partnerPreference goals connectionCount postsCount createdAt')
      .skip(skip)
      .limit(parseInt(limit))
      .sort({ createdAt: -1 });

    // Get connection statuses for all users
    const userIds = users.map(user => user._id);
    const connections = await Connection.find({
      $or: [
        { requester: currentUserId, receiver: { $in: userIds } },
        { requester: { $in: userIds }, receiver: currentUserId }
      ]
    });

    // Create connection status map
    const connectionMap = {};
    connections.forEach(conn => {
      const otherUserId = conn.requester.toString() === currentUserId 
        ? conn.receiver.toString() 
        : conn.requester.toString();
      connectionMap[otherUserId] = {
        status: conn.status,
        isRequester: conn.requester.toString() === currentUserId,
        connectionId: conn._id
      };
    });

    // Process users and add additional data
    const partners = await Promise.all(users.map(async (user) => {
      // Calculate shared goals
      const sharedGoals = currentUser.getSharedGoals(user);
      
      // Calculate distance for local users
      let distance = null;
      let locationString = 'Virtual Partner';
      
      if (type === 'local' || (type !== 'virtual' && user.geoLocation)) {
        distance = currentUser.calculateDistance(user);
        locationString = user.getLocationString();
        if (distance !== null) {
          locationString += ` (${distance} miles)`;
        }
      } else if (user.partnerPreference === 'VIRTUAL') {
        locationString = 'Virtual Partner';
      } else {
        locationString = user.getLocationString();
      }

      return {
        _id: user._id,
        name: user.getFullName(),
        username: user.username,
        avatar: user.avatar,
        bio: user.bio,
        location: locationString,
        distance: distance,
        sharedGoals: sharedGoals,
        connectionCount: user.connectionCount,
        postsCount: user.postsCount,
        connectionStatus: connectionMap[user._id] || null,
        createdAt: user.createdAt
      };
    }));

    // Sort by shared goals count (descending) and then by distance (ascending for local)
    partners.sort((a, b) => {
      if (a.sharedGoals.length !== b.sharedGoals.length) {
        return b.sharedGoals.length - a.sharedGoals.length;
      }
      if (type === 'local' && a.distance !== null && b.distance !== null) {
        return a.distance - b.distance;
      }
      return 0;
    });

    // Get total count for pagination
    const totalCount = await User.countDocuments(query);

    res.json({
      partners,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalCount / parseInt(limit)),
        totalCount,
        hasNext: skip + parseInt(limit) < totalCount,
        hasPrev: parseInt(page) > 1
      }
    });

  } catch (err) {
    console.error('Get partners error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get a specific user's profile
router.get('/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.id;

    const user = await User.findById(userId)
      .select('-password -email');

    if (!user) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Get connection status
    const connectionStatus = await Connection.getConnectionStatus(currentUserId, userId);

    // Get user's connections count
    const connections = await Connection.getUserConnections(userId);
    const pendingRequests = await Connection.getPendingRequests(userId);
    const sentRequests = await Connection.getSentRequests(userId);

    // Get shared goals with current user
    const currentUser = await User.findById(currentUserId);
    const sharedGoals = currentUser ? currentUser.getSharedGoals(user) : [];

    // Calculate distance if both users have location data
    let distance = null;
    if (currentUser && currentUser.geoLocation && user.geoLocation) {
      distance = currentUser.calculateDistance(user);
    }

    const profile = {
      _id: user._id,
      name: user.getFullName(),
      username: user.username,
      avatar: user.avatar,
      bio: user.bio,
      city: user.city,
      state: user.state,
      location: user.getLocationString(),
      distance: distance,
      goals: user.goals,
      sharedGoals: sharedGoals,
      partnerPreference: user.partnerPreference,
      connectionCount: connections.length,
      pendingRequestsCount: pendingRequests.length,
      sentRequestsCount: sentRequests.length,
      postsCount: user.postsCount,
      connectionStatus: connectionStatus,
      createdAt: user.createdAt
    };

    res.json(profile);

  } catch (err) {
    console.error('Get user profile error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Send connection request
router.post('/connect/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { message } = req.body;
    const currentUserId = req.user.id;

    if (currentUserId === userId) {
      return res.status(400).json({ msg: 'Cannot connect to yourself' });
    }

    // Check if user exists
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ msg: 'User not found' });
    }

    // Check if connection already exists
    const existingConnection = await Connection.findOne({
      $or: [
        { requester: currentUserId, receiver: userId },
        { requester: userId, receiver: currentUserId }
      ]
    });

    if (existingConnection) {
      return res.status(400).json({ 
        msg: 'Connection request already exists',
        status: existingConnection.status 
      });
    }

        // Create new connection request
        const connection = new Connection({
          requester: currentUserId,
          receiver: userId,
          message: message || ''
        });

        await connection.save();

    // Populate the connection for response
    await connection.populate('requester receiver', 'username firstName lastName avatar');

    res.status(201).json({
      msg: 'Connection request sent successfully',
      connection: {
        _id: connection._id,
        status: connection.status,
        message: connection.message,
        createdAt: connection.createdAt,
        requester: {
          _id: connection.requester._id,
          name: connection.requester.getFullName(),
          username: connection.requester.username,
          avatar: connection.requester.avatar
        },
        receiver: {
          _id: connection.receiver._id,
          name: connection.receiver.getFullName(),
          username: connection.receiver.username,
          avatar: connection.receiver.avatar
        }
      }
    });

  } catch (err) {
    console.error('Send connection request error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Accept connection request
router.put('/accept/:connectionId', auth, async (req, res) => {
  try {
    const { connectionId } = req.params;
    const currentUserId = req.user.id;

    const connection = await Connection.findById(connectionId)
      .populate('requester receiver', 'username firstName lastName avatar');

    if (!connection) {
      return res.status(404).json({ msg: 'Connection request not found' });
    }

    if (connection.receiver._id.toString() !== currentUserId) {
      return res.status(403).json({ msg: 'Not authorized to accept this request' });
    }

    if (connection.status !== 'PENDING') {
      return res.status(400).json({ msg: 'Connection request is not pending' });
    }

    // Update connection status
    connection.status = 'ACCEPTED';
    await connection.save();

    // Update connection counts for both users
    await User.findByIdAndUpdate(connection.requester._id, { $inc: { connectionCount: 1 } });
    await User.findByIdAndUpdate(connection.receiver._id, { $inc: { connectionCount: 1 } });

    res.json({
      msg: 'Connection request accepted',
      connection: {
        _id: connection._id,
        status: connection.status,
        requester: {
          _id: connection.requester._id,
          name: connection.requester.getFullName(),
          username: connection.requester.username,
          avatar: connection.requester.avatar
        },
        receiver: {
          _id: connection.receiver._id,
          name: connection.receiver.getFullName(),
          username: connection.receiver.username,
          avatar: connection.receiver.avatar
        }
      }
    });

  } catch (err) {
    console.error('Accept connection error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Reject connection request
router.put('/reject/:connectionId', auth, async (req, res) => {
  try {
    const { connectionId } = req.params;
    const currentUserId = req.user.id;

    const connection = await Connection.findById(connectionId);

    if (!connection) {
      return res.status(404).json({ msg: 'Connection request not found' });
    }

    if (connection.receiver._id.toString() !== currentUserId) {
      return res.status(403).json({ msg: 'Not authorized to reject this request' });
    }

    if (connection.status !== 'PENDING') {
      return res.status(400).json({ msg: 'Connection request is not pending' });
    }

    // Update connection status
    connection.status = 'REJECTED';
    await connection.save();

    res.json({ msg: 'Connection request rejected' });

  } catch (err) {
    console.error('Reject connection error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Cancel connection request
router.delete('/cancel/:connectionId', auth, async (req, res) => {
  try {
    const { connectionId } = req.params;
    const currentUserId = req.user.id;

    const connection = await Connection.findById(connectionId);

    if (!connection) {
      return res.status(404).json({ msg: 'Connection request not found' });
    }

    if (connection.requester._id.toString() !== currentUserId) {
      return res.status(403).json({ msg: 'Not authorized to cancel this request' });
    }

    if (connection.status !== 'PENDING') {
      return res.status(400).json({ msg: 'Connection request is not pending' });
    }

    await Connection.findByIdAndDelete(connectionId);

    res.json({ msg: 'Connection request cancelled' });

  } catch (err) {
    console.error('Cancel connection error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get pending requests for current user
router.get('/pending-requests', auth, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    
    const pendingRequests = await Connection.getPendingRequests(currentUserId);
    
    const formattedRequests = pendingRequests.map(conn => {
      const requester = conn.requester;
      return {
        _id: conn._id,
        message: conn.message,
        createdAt: conn.createdAt,
        user: {
          _id: requester._id,
          name: requester.getFullName(),
          username: requester.username,
          avatar: requester.avatar,
          location: requester.getLocationString(),
          goals: requester.goals,
          bio: requester.bio
        }
      };
    });

    res.json(formattedRequests);

  } catch (err) {
    console.error('Get pending requests error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get active partners for current user
router.get('/active-partners', auth, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    
    const activeConnections = await Connection.getUserConnections(currentUserId, 'ACCEPTED');
    
    const formattedPartners = activeConnections.map(conn => {
      const partner = conn.requester._id.toString() === currentUserId ? conn.receiver : conn.requester;
      return {
        _id: partner._id,
        name: partner.getFullName(),
        username: partner.username,
        avatar: partner.avatar,
        location: partner.getLocationString(),
        goals: partner.goals,
        bio: partner.bio,
        connectionCount: partner.connectionCount,
        postsCount: partner.postsCount,
        connectedAt: conn.updatedAt
      };
    });

    res.json(formattedPartners);

  } catch (err) {
    console.error('Get active partners error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get user's connections
router.get('/connections/:userId', auth, async (req, res) => {
  try {
    const { userId } = req.params;
    const { type = 'all' } = req.query; // 'all', 'pending', 'sent'

    let connections = [];

    switch (type) {
      case 'pending':
        connections = await Connection.getPendingRequests(userId);
        break;
      case 'sent':
        connections = await Connection.getSentRequests(userId);
        break;
      default:
        connections = await Connection.getUserConnections(userId);
    }

    const formattedConnections = connections.map(conn => {
      const otherUser = conn.requester._id.toString() === userId ? conn.receiver : conn.requester;
      return {
        _id: conn._id,
        status: conn.status,
        message: conn.message,
        createdAt: conn.createdAt,
        user: {
          _id: otherUser._id,
          name: otherUser.getFullName(),
          username: otherUser.username,
          avatar: otherUser.avatar,
          location: otherUser.getLocationString(),
          goals: otherUser.goals
        }
      };
    });

    res.json(formattedConnections);

  } catch (err) {
    console.error('Get connections error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// Get partner counts for all statuses
router.get('/count', auth, async (req, res) => {
  try {
    const currentUserId = req.user.id;
    
    // Get all connections for the current user
    const connections = await Connection.find({
      $or: [
        { requester: currentUserId },
        { receiver: currentUserId }
      ]
    });

    // Create connection status map
    const connectionMap = {};
    connections.forEach(conn => {
      const otherUserId = conn.requester.toString() === currentUserId 
        ? conn.receiver.toString() 
        : conn.requester.toString();
      connectionMap[otherUserId] = conn.status;
    });

    // Get total user count (excluding current user)
    const totalUsers = await User.countDocuments({ _id: { $ne: currentUserId } });

    // Calculate counts
    let availableCount = 0;
    let pendingCount = 0;
    let activeCount = 0;

    // Get all other users to check their status
    const allUsers = await User.find({ _id: { $ne: currentUserId } }, '_id').lean();
    
    allUsers.forEach(user => {
      const connectionStatus = connectionMap[user._id.toString()];
      
      if (!connectionStatus || connectionStatus === 'REJECTED') {
        availableCount++;
      } else if (connectionStatus === 'ACCEPTED') {
        activeCount++;
      }
    });

    // Count pending requests (where current user is receiver)
    pendingCount = await Connection.countDocuments({
      receiver: currentUserId,
      status: 'PENDING'
    });

    res.json({
      availableCount,
      pendingCount,
      activeCount,
      totalCount: totalUsers
    });

  } catch (err) {
    console.error('Get partner counts error:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

export default router;