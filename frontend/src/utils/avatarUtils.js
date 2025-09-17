// Avatar utility functions
import avatar1 from '../assets/avatar1.png';
import avatar2 from '../assets/avatar2.png';
import avatar3 from '../assets/avatar3.png';
import avatar4 from '../assets/avatar4.png';
import avatar5 from '../assets/avatar5.png';
import avatar6 from '../assets/avatar6.png';

// Avatar mapping
const avatarMap = {
  'avatar1.png': avatar1,
  'avatar2.png': avatar2,
  'avatar3.png': avatar3,
  'avatar4.png': avatar4,
  'avatar5.png': avatar5,
  'avatar6.png': avatar6,
};

/**
 * Get the avatar source for a user
 * @param {string} avatarName - The avatar filename (e.g., 'avatar1.png')
 * @param {string} username - Fallback username for generating avatar
 * @returns {string} - The avatar source URL
 */
export const getAvatarSrc = (avatarName, username = 'User') => {
  if (avatarName && avatarMap[avatarName]) {
    return avatarMap[avatarName];
  }
  
  // Fallback to generated avatar
  return `https://ui-avatars.com/api/?name=${username}&background=random`;
};

/**
 * Get all available avatars
 * @returns {Array} - Array of avatar objects with name and src
 */
export const getAllAvatars = () => {
  return [
    { name: 'avatar1.png', src: avatar1 },
    { name: 'avatar2.png', src: avatar2 },
    { name: 'avatar3.png', src: avatar3 },
    { name: 'avatar4.png', src: avatar4 },
    { name: 'avatar5.png', src: avatar5 },
    { name: 'avatar6.png', src: avatar6 },
  ];
};
