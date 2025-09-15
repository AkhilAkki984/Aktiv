import React from "react";
import { motion } from "framer-motion";
import { MessageCircle, MapPin, Users, Image } from "lucide-react";

const ActivePartnerCard = ({ partner, onProfileClick, index }) => {
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

  const formatConnectedTime = (date) => {
    const now = new Date();
    const diffInMs = now - new Date(date);
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

    if (diffInDays === 0) {
      return 'Connected today';
    } else if (diffInDays === 1) {
      return 'Connected 1 day ago';
    } else if (diffInDays < 7) {
      return `Connected ${diffInDays} days ago`;
    } else if (diffInDays < 30) {
      const weeks = Math.floor(diffInDays / 7);
      return `Connected ${weeks} week${weeks > 1 ? 's' : ''} ago`;
    } else {
      const months = Math.floor(diffInDays / 30);
      return `Connected ${months} month${months > 1 ? 's' : ''} ago`;
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
        {partner.avatar ? (
          <img
            src={partner.avatar}
            alt={partner.name}
            className="w-16 h-16 rounded-full object-cover border-2 border-gray-200 dark:border-gray-600"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-300 font-semibold text-lg border-2 border-gray-200 dark:border-gray-600">
            {getInitials(partner.name)}
          </div>
        )}
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-1">
            {partner.name}
          </h3>
          <div className="flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400">
            <MapPin className="w-4 h-4" />
            <span>{partner.location}</span>
          </div>
        </div>
      </div>

      {/* Connection Info */}
      <div className="mb-4">
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {formatConnectedTime(partner.connectedAt)}
        </p>
      </div>

      {/* Activities */}
      {partner.goals && partner.goals.length > 0 && (
        <div className="mb-4">
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Activities:
          </p>
          <div className="flex flex-wrap gap-2">
            {partner.goals.slice(0, 4).map((goal, goalIndex) => (
              <span
                key={goalIndex}
                className={`px-3 py-1 rounded-full text-sm font-medium ${getGoalColor(goal, goalIndex)}`}
              >
                {goal}
              </span>
            ))}
            {partner.goals.length > 4 && (
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400">
                +{partner.goals.length - 4} more
              </span>
            )}
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mb-4">
        <div className="flex items-center gap-1">
          <Users className="w-4 h-4" />
          <span>{partner.connectionCount} partners</span>
        </div>
        <div className="flex items-center gap-1">
          <Image className="w-4 h-4" />
          <span>{partner.postsCount} posts</span>
        </div>
      </div>

      {/* Bio */}
      {partner.bio && (
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
          {partner.bio}
        </p>
      )}

      {/* Action Button */}
      <button
        onClick={() => onProfileClick(partner._id)}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
      >
        <MessageCircle className="w-5 h-5" />
        Message Partner
      </button>
    </motion.div>
  );
};

export default ActivePartnerCard;
