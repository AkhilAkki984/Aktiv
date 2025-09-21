import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageCircle, Sparkles } from 'lucide-react';

const AICoachPopup = ({ user, onClose, onOpenChat }) => {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Auto-hide after 5 seconds
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(() => onClose(), 300); // Wait for animation to complete
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  const handleOpenChat = () => {
    onOpenChat();
    onClose();
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 20 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="fixed bottom-6 right-6 z-50 max-w-sm"
        >
          <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 p-6 relative">
            {/* Close button */}
            <button
              onClick={() => {
                setIsVisible(false);
                setTimeout(() => onClose(), 300);
              }}
              className="absolute top-3 right-3 p-1 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>

            {/* AI Coach Avatar */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">AI Fitness Coach</h3>
                <p className="text-sm text-gray-600">Your personal trainer</p>
              </div>
            </div>

            {/* Welcome message */}
            <div className="mb-4">
              <p className="text-gray-800 leading-relaxed">
                👋 Hi <span className="font-semibold">{user?.username || 'there'}</span>, I'm your Fitness AI Coach!
              </p>
              <p className="text-sm text-gray-600 mt-2">
                I can help you with workouts, nutrition, and staying motivated. Let's chat!
              </p>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2">
              <button
                onClick={handleOpenChat}
                className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-4 h-4" />
                Start Chat
              </button>
              <button
                onClick={() => {
                  setIsVisible(false);
                  setTimeout(() => onClose(), 300);
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Maybe later
              </button>
            </div>

            {/* Auto-hide indicator */}
            <div className="mt-3">
              <div className="w-full bg-gray-200 rounded-full h-1">
                <motion.div
                  className="bg-gradient-to-r from-blue-500 to-purple-600 h-1 rounded-full"
                  initial={{ width: "100%" }}
                  animate={{ width: "0%" }}
                  transition={{ duration: 5, ease: "linear" }}
                />
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AICoachPopup;
