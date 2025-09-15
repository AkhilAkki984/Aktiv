import React from "react";
import { motion } from "framer-motion";
import { Check, X, Clock } from "lucide-react";

const PendingRequestCard = ({ request, onAccept, onReject, index }) => {
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
    } else if (diffInDays < 7) {
      return `${diffInDays} days ago`;
    } else if (diffInDays < 14) {
      return '1 week ago';
    } else {
      return `${Math.floor(diffInDays / 7)} weeks ago`;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="p-6 rounded-xl bg-white dark:bg-[#1e293b] shadow-md border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
    >
      {/* Header with Avatar and Name */}
      <div className="flex items-center gap-4 mb-4">
        {request.user.avatar ? (
          <img
            src={request.user.avatar}
            alt={request.user.name}
            className="w-16 h-16 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-300 font-semibold text-lg border-2 border-gray-200 dark:border-gray-600">
            {getInitials(request.user.name)}
          </div>
        )}
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-1">
            {request.user.name}
          </h3>
          <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
            <Clock className="w-4 h-4" />
            <span>Requested {formatTimeAgo(request.createdAt)}</span>
          </div>
        </div>
      </div>

      {/* Activities */}
      {request.user.goals && request.user.goals.length > 0 && (
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Activities:
          </p>
          <div className="flex flex-wrap gap-2">
            {request.user.goals.slice(0, 4).map((goal, goalIndex) => (
              <span
                key={goalIndex}
                className={`px-3 py-1 rounded-full text-sm font-medium ${getGoalColor(goal, goalIndex)}`}
              >
                {goal}
              </span>
            ))}
            {request.user.goals.length > 4 && (
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                +{request.user.goals.length - 4} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Mutual Goals */}
      <div className="mb-6">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Mutual Goals:
        </p>
        <div className="flex flex-wrap gap-2">
          {request.user.goals.slice(0, 3).map((goal, goalIndex) => (
            <span
              key={goalIndex}
              className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
            >
              {goal}
            </span>
          ))}
          {request.user.goals.length > 3 && (
            <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
              +{request.user.goals.length - 3} more
            </span>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => onAccept(request._id)}
          className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
        >
          <Check className="w-5 h-5" />
          Accept
        </button>
        <button
          onClick={() => onReject(request._id)}
          className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
        >
          <X className="w-5 h-5" />
          Decline
        </button>
      </div>
    </motion.div>
  );
};

export default PendingRequestCard;
