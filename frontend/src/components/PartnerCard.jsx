import React from "react";
import { motion } from "framer-motion";
import { MapPin, MessageCircle, UserPlus, Clock } from "lucide-react";
import { getAvatarSrc } from "../utils/avatarUtils";

const PartnerCard = ({ partner, onConnect, onCancelRequest, onProfileClick, index, tabType = "find" }) => {
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

  const getConnectionButton = () => {
    // For Pending Requests tab - show Accept/Reject buttons
    if (tabType === "pending") {
      return (
        <div className="flex gap-2">
          <button
            onClick={() => onConnect(partner.connectionStatus?.connectionId)}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            <UserPlus className="w-4 h-4" />
            Accept
          </button>
          <button
            onClick={() => onCancelRequest(partner.connectionStatus?.connectionId)}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            <Clock className="w-4 h-4" />
            Reject
          </button>
        </div>
      );
    }

    // For Sent Invitations tab - show disabled "Sent" button and Cancel option
    if (tabType === "sent") {
      return (
        <div className="flex gap-2">
          <button
            disabled
            className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-gray-400 text-white rounded-lg cursor-not-allowed font-medium"
          >
            <Clock className="w-4 h-4" />
            Sent
          </button>
          <button
            onClick={() => onCancelRequest(partner.connectionStatus?.connectionId)}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            Cancel
          </button>
        </div>
      );
    }

    // For Active Partners tab - show Message button
    if (tabType === "active") {
      return (
        <button
          onClick={() => onProfileClick(partner._id)}
          className="w-full flex items-center justify-center gap-2 py-2 px-4 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-lg font-medium"
        >
          <MessageCircle className="w-4 h-4" />
          Message
        </button>
      );
    }

    // For Find Partners tab - show Connect button
    if (!partner.connectionStatus) {
      return (
        <button
          onClick={() => onConnect(partner._id)}
          className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <UserPlus className="w-4 h-4" />
          Connect
        </button>
      );
    }

    switch (partner.connectionStatus.status) {
      case 'PENDING':
        if (partner.connectionStatus.isRequester) {
          return (
            <button
              onClick={() => onCancelRequest(partner.connectionStatus.connectionId)}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors font-medium"
            >
              <Clock className="w-4 h-4" />
              Cancel Request
            </button>
          );
        } else {
          return (
            <button
              onClick={() => onConnect(partner._id)}
              className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              <UserPlus className="w-4 h-4" />
              Accept
            </button>
          );
        }
      case 'ACCEPTED':
        return (
          <button
            onClick={() => onProfileClick(partner._id)}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-lg font-medium"
          >
            <MessageCircle className="w-4 h-4" />
            Message
          </button>
        );
      case 'REJECTED':
        return (
          <button
            onClick={() => onConnect(partner._id)}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <UserPlus className="w-4 h-4" />
            Connect
          </button>
        );
      default:
        return (
          <button
            onClick={() => onConnect(partner._id)}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <UserPlus className="w-4 h-4" />
            Connect
          </button>
        );
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      whileHover={{ scale: 1.02 }}
      className="p-6 rounded-xl bg-white dark:bg-[#1e293b] shadow-md border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
    >
      {/* Header with Avatar and Name */}
      <div className="flex items-center gap-4 mb-4">
        <div
          onClick={() => onProfileClick(partner._id)}
          className="cursor-pointer"
        >
          <img
            src={getAvatarSrc(partner.avatar, partner.name)}
            alt={partner.name}
            className="w-12 h-12 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600"
          />
        </div>
        <div className="flex-1">
          <h3
            onClick={() => onProfileClick(partner._id)}
            className="text-lg font-semibold text-gray-800 dark:text-white cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
          >
            {partner.name}
          </h3>
          <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
            <MapPin className="w-3 h-3" />
            <span>{partner.location}</span>
          </div>
        </div>
      </div>

      {/* Shared Goals */}
      {partner.sharedGoals && partner.sharedGoals.length > 0 && (
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Shared Goals:
          </p>
          <div className="flex flex-wrap gap-2">
            {partner.sharedGoals.map((goal, goalIndex) => (
              <span
                key={goalIndex}
                className={`px-2 py-1 rounded-full text-xs font-medium ${getGoalColor(goal, goalIndex)}`}
              >
                {goal}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Bio */}
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-3">
        {partner.bio || 'No bio available'}
      </p>

      {/* Stats */}
      <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400 mb-4">
        <span>{partner.connectionCount} partners</span>
        <span>{partner.postsCount} posts</span>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2">
        {getConnectionButton()}
        {tabType !== 'find' && (
          <button
            onClick={() => onProfileClick(partner._id)}
            className="py-2 px-4 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <MessageCircle className="w-4 h-4" />
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default PartnerCard;
