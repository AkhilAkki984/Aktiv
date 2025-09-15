import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, UserPlus, UserX, MapPin, Clock } from "lucide-react";
import { partnersAPI } from "../utils/api.js";
import { useSnackbar } from "notistack";

const PendingRequests = ({ isOpen, onClose, onRequestUpdate }) => {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const { enqueueSnackbar } = useSnackbar();

  // Fetch pending requests
  useEffect(() => {
    if (isOpen) {
      fetchPendingRequests();
    }
  }, [isOpen]);

  const fetchPendingRequests = async () => {
    try {
      setLoading(true);
      const response = await partnersAPI.getPendingRequests();
      setPendingRequests(response.data);
    } catch (err) {
      console.error('Failed to fetch pending requests:', err);
      enqueueSnackbar('Failed to load pending requests', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (name) => {
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const getGoalColor = (goal, index) => {
    const colors = [
      'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
      'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200'
    ];
    return colors[index % colors.length];
  };

  const handleAccept = async (connectionId) => {
    try {
      await partnersAPI.acceptRequest(connectionId);
      setPendingRequests(prev => prev.filter(req => req._id !== connectionId));
      enqueueSnackbar('Connection request accepted!', { variant: 'success' });
      onRequestUpdate(); // Notify parent component to refresh data
    } catch (err) {
      console.error('Accept request error:', err);
      enqueueSnackbar(err.response?.data?.msg || 'Failed to accept request', { variant: 'error' });
    }
  };

  const handleReject = async (connectionId) => {
    try {
      await partnersAPI.rejectRequest(connectionId);
      setPendingRequests(prev => prev.filter(req => req._id !== connectionId));
      enqueueSnackbar('Connection request rejected', { variant: 'info' });
      onRequestUpdate(); // Notify parent component to refresh data
    } catch (err) {
      console.error('Reject request error:', err);
      enqueueSnackbar(err.response?.data?.msg || 'Failed to reject request', { variant: 'error' });
    }
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const diffInMs = now - new Date(date);
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    const diffInDays = Math.floor(diffInHours / 24);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${diffInHours}h ago`;
    } else if (diffInDays === 1) {
      return '1 day ago';
    } else {
      return `${diffInDays} days ago`;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
          />

          {/* Sidebar */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed right-0 top-0 h-full w-full max-w-md bg-white dark:bg-[#1e293b] shadow-xl z-50 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-white">
                Pending Requests
              </h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {loading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, idx) => (
                    <div key={idx} className="animate-pulse">
                      <div className="flex items-center gap-4 p-4 rounded-lg bg-gray-50 dark:bg-[#0f172a]">
                        <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                        <div className="flex-1">
                          <div className="h-4 w-32 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
                          <div className="h-3 w-24 bg-gray-300 dark:bg-gray-600 rounded"></div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : pendingRequests.length > 0 ? (
                <div className="space-y-4">
                  {pendingRequests.map((request, index) => (
                    <motion.div
                      key={request._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="p-4 rounded-lg bg-gray-50 dark:bg-[#0f172a] border border-gray-200 dark:border-gray-700"
                    >
                      {/* User Info */}
                      <div className="flex items-start gap-4 mb-4">
                        {request.user.avatar ? (
                          <img
                            src={request.user.avatar}
                            alt={request.user.name}
                            className="w-12 h-12 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-300 font-semibold text-sm border-2 border-gray-200 dark:border-gray-600">
                            {getInitials(request.user.name)}
                          </div>
                        )}
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-800 dark:text-white mb-1">
                            {request.user.name}
                          </h3>
                          <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 mb-2">
                            <MapPin className="w-3 h-3" />
                            <span>{request.user.location}</span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-400">
                            <Clock className="w-3 h-3" />
                            <span>{formatTimeAgo(request.createdAt)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Message */}
                      {request.message && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3 p-2 bg-white dark:bg-[#1e293b] rounded border">
                          "{request.message}"
                        </p>
                      )}

                      {/* Goals */}
                      {request.user.goals && request.user.goals.length > 0 && (
                        <div className="mb-4">
                          <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Goals:
                          </p>
                          <div className="flex flex-wrap gap-1">
                            {request.user.goals.slice(0, 3).map((goal, goalIndex) => (
                              <span
                                key={goalIndex}
                                className={`px-2 py-1 rounded-full text-xs font-medium ${getGoalColor(goal, goalIndex)}`}
                              >
                                {goal}
                              </span>
                            ))}
                            {request.user.goals.length > 3 && (
                              <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                                +{request.user.goals.length - 3} more
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Bio */}
                      {request.user.bio && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
                          {request.user.bio}
                        </p>
                      )}

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleAccept(request._id)}
                          className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
                        >
                          <UserPlus className="w-4 h-4" />
                          Accept
                        </button>
                        <button
                          onClick={() => handleReject(request._id)}
                          className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
                        >
                          <UserX className="w-4 h-4" />
                          Reject
                        </button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <UserPlus className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">
                    No pending requests
                  </h3>
                  <p className="text-gray-500 dark:text-gray-500">
                    You don't have any pending connection requests
                  </p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default PendingRequests;
