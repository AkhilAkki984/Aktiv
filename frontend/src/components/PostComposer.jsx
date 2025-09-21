import { useState, useRef, useContext } from 'react';
import { useSnackbar } from 'notistack';
import { AuthContext } from '../context/AuthContext';
import { getAvatarSrc } from '../utils/avatarUtils';
import { 
  Image, 
  Video, 
  X, 
  Send,
  Paperclip,
  Smile
} from 'lucide-react';
import EmojiPicker from 'emoji-picker-react';

const PostComposer = ({ onPostCreated, socket }) => {
  const { user } = useContext(AuthContext);
  const { enqueueSnackbar } = useSnackbar();
  
  const [text, setText] = useState('');
  const [category, setCategory] = useState('General');
  const [mediaFile, setMediaFile] = useState(null);
  const [mediaPreview, setMediaPreview] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  
  const fileInputRef = useRef();
  const textareaRef = useRef();

  const categories = [
    'Fitness', 'Yoga', 'Running', 'Nutrition', 'Wellness', 'Motivation', 'General'
  ];

  const categoryColors = {
    'Fitness': 'bg-red-100 text-red-800 border-red-200',
    'Yoga': 'bg-purple-100 text-purple-800 border-purple-200',
    'Running': 'bg-green-100 text-green-800 border-green-200',
    'Nutrition': 'bg-orange-100 text-orange-800 border-orange-200',
    'Wellness': 'bg-blue-100 text-blue-800 border-blue-200',
    'Motivation': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'General': 'bg-gray-100 text-gray-800 border-gray-200'
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'video/mp4', 'video/mov', 'video/avi', 'video/webm'];
    if (!allowedTypes.includes(file.type)) {
      enqueueSnackbar('Only image and video files are allowed', { variant: 'error' });
      return;
    }

    // Validate file size (50MB for videos, 10MB for images)
    const maxSize = file.type.startsWith('video/') ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      enqueueSnackbar(`File too large. Max size: ${file.type.startsWith('video/') ? '50MB' : '10MB'}`, { variant: 'error' });
      return;
    }

    setMediaFile(file);
    
    // Create preview
    const previewUrl = URL.createObjectURL(file);
    setMediaPreview({
      url: previewUrl,
      type: file.type.startsWith('image/') ? 'image' : 'video'
    });
  };

  const removeMedia = () => {
    setMediaFile(null);
    if (mediaPreview) {
      URL.revokeObjectURL(mediaPreview.url);
      setMediaPreview(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleEmojiClick = (emojiObject) => {
    setText(prev => prev + emojiObject.emoji);
    setShowEmojiPicker(false);
    textareaRef.current?.focus();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!text.trim() && !mediaFile) {
      enqueueSnackbar('Please add some content to your post', { variant: 'warning' });
      return;
    }

    try {
      setIsUploading(true);
      
      const formData = new FormData();
      formData.append('text', text);
      formData.append('category', category);
      if (mediaFile) {
        formData.append('media', mediaFile);
      }

      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error('Failed to create post');
      }

      const newPost = await response.json();
      
      // Emit socket event for real-time updates
      if (socket) {
        socket.emit('new_post', newPost);
      }

      // Reset form
      setText('');
      setMediaFile(null);
      removeMedia();
      setCategory('General');
      
      // Notify parent component
      if (onPostCreated) {
        onPostCreated(newPost);
      }

      enqueueSnackbar('Post created successfully!', { variant: 'success' });
    } catch (error) {
      console.error('Error creating post:', error);
      enqueueSnackbar('Failed to create post', { variant: 'error' });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
      <form onSubmit={handleSubmit}>
        {/* User info and category selector */}
        <div className="flex items-center gap-3 mb-4">
          <img
            src={getAvatarSrc(user.avatar, user.username)}
            alt={user.username}
            className="w-10 h-10 rounded-full object-cover"
          />
          <div className="flex-1">
            <p className="font-medium text-gray-900 dark:text-white">{user.username}</p>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={`text-xs px-2 py-1 rounded-full border ${categoryColors[category]} focus:outline-none focus:ring-2 focus:ring-blue-500`}
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Text input */}
        <div className="mb-4">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="What's on your mind? Share your fitness journey..."
            className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            rows={3}
            maxLength={2000}
          />
          <div className="flex justify-between items-center mt-2">
            <span className="text-xs text-gray-500">{text.length}/2000</span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-500 transition-colors"
              >
                <Smile size={20} />
              </button>
            </div>
          </div>
        </div>

        {/* Media preview */}
        {mediaPreview && (
          <div className="mb-4 relative">
            <button
              type="button"
              onClick={removeMedia}
              className="absolute top-2 right-2 p-1 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-colors z-10"
            >
              <X size={16} />
            </button>
            {mediaPreview.type === 'image' ? (
              <img
                src={mediaPreview.url}
                alt="Preview"
                className="w-full max-h-64 object-cover rounded-lg"
              />
            ) : (
              <video
                src={mediaPreview.url}
                controls
                className="w-full max-h-64 rounded-lg"
              />
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Paperclip size={20} />
              <span className="text-sm">Media</span>
            </button>
            
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              accept="image/jpeg,image/jpg,image/png,image/gif,video/mp4,video/mov,video/avi,video/webm"
              className="hidden"
            />
          </div>

          <button
            type="submit"
            disabled={(!text.trim() && !mediaFile) || isUploading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isUploading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Send size={16} />
            )}
            <span>{isUploading ? 'Posting...' : 'Share'}</span>
          </button>
        </div>

        {/* Emoji picker */}
        {showEmojiPicker && (
          <div className="absolute bottom-16 left-4 z-50">
            <EmojiPicker
              onEmojiClick={handleEmojiClick}
              width={300}
              height={400}
              searchDisabled={false}
              skinTonesDisabled={false}
              previewConfig={{
                showPreview: true
              }}
            />
          </div>
        )}
      </form>
    </div>
  );
};

export default PostComposer;
