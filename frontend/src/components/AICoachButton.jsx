import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Sparkles } from 'lucide-react';

const AICoachButton = ({ onClick, hasUnreadMessages = false }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      className="fixed bottom-6 right-6 z-40 w-14 h-14 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group"
    >
      {/* Unread indicator */}
      {hasUnreadMessages && (
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
          <span className="text-xs text-white font-bold">!</span>
        </div>
      )}

      {/* Icon */}
      <motion.div
        animate={{ 
          rotate: isHovered ? 360 : 0,
          scale: isHovered ? 1.1 : 1
        }}
        transition={{ duration: 0.3 }}
      >
        <MessageCircle className="w-6 h-6 text-white" />
      </motion.div>

      {/* Sparkle effect on hover */}
      {isHovered && (
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0 }}
          className="absolute inset-0 rounded-full bg-gradient-to-r from-blue-400 to-purple-500 opacity-20"
        />
      )}

      {/* Tooltip */}
      <motion.div
        initial={{ opacity: 0, x: 10 }}
        animate={{ 
          opacity: isHovered ? 1 : 0, 
          x: isHovered ? 0 : 10 
        }}
        transition={{ duration: 0.2 }}
        className="absolute right-16 bg-gray-900 text-white text-sm px-3 py-2 rounded-lg whitespace-nowrap pointer-events-none"
      >
        Chat with AI Coach
        <div className="absolute right-0 top-1/2 transform translate-x-1 -translate-y-1/2 w-0 h-0 border-l-4 border-l-gray-900 border-t-4 border-t-transparent border-b-4 border-b-transparent" />
      </motion.div>
    </motion.button>
  );
};

export default AICoachButton;
