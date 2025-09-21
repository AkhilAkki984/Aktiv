import { useState, useContext } from 'react';
import { useSnackbar } from 'notistack';
import { AuthContext } from '../context/AuthContext';
import { getAvatarSrc } from '../utils/avatarUtils';
import { 
  Heart, 
  MessageCircle, 
  Share2, 
  PartyPopper,
  MoreVertical,
  Trash2,
  Edit3,
  ExternalLink
} from 'lucide-react';

const PostCard = ({ post, onUpdate, socket }) => {
  const { user } = useContext(AuthContext);
  const { enqueueSnackbar } = useSnackbar();
  
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [isCommenting, setIsCommenting] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareText, setShareText] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [showActions, setShowActions] = useState(false);

  const categoryColors = {
    'Fitness': 'bg-red-100 text-red-800 border-red-200',
    'Yoga': 'bg-purple-100 text-purple-800 border-purple-200',
    'Running': 'bg-green-100 text-green-800 border-green-200',
    'Nutrition': 'bg-orange-100 text-orange-800 border-orange-200',
    'Wellness': 'bg-blue-100 text-blue-800 border-blue-200',
    'Motivation': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'General': 'bg-gray-100 text-gray-800 border-gray-200'
  };

  const isLiked = post.likes?.some(like => like.user._id === user.id);
  const isCongratulated = post.congratulations?.some(congrats => congrats.user._id === user.id);
  const isOwnPost = post.user._id === user.id;

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return 'now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}d`;
    return date.toLocaleDateString();
  };

  const handleLike = async () => {
    try {
      const response = await fetch(`/api/posts/${post._id}/like`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to like post');

      const data = await response.json();
      
      // Emit socket event
      if (socket) {
        socket.emit('post_liked', {
          postId: post._id,
          likeCount: data.likeCount,
          userId: user.id
        });
      }

      // Update local state
      if (onUpdate) {
        onUpdate(post._id, { likes: data.likes, likeCount: data.likeCount });
      }
    } catch (error) {
      console.error('Error liking post:', error);
      enqueueSnackbar('Failed to like post', { variant: 'error' });
    }
  };

  const handleComment = async () => {
    if (!commentText.trim()) return;

    try {
      setIsCommenting(true);
      const response = await fetch(`/api/posts/${post._id}/comment`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ text: commentText })
      });

      if (!response.ok) throw new Error('Failed to add comment');

      const data = await response.json();
      
      // Emit socket event
      if (socket) {
        socket.emit('post_commented', {
          postId: post._id,
          commentCount: data.commentCount,
          comment: data.comments[data.comments.length - 1],
          userId: user.id
        });
      }

      // Update local state
      if (onUpdate) {
        onUpdate(post._id, { comments: data.comments, commentCount: data.commentCount });
      }

      setCommentText('');
    } catch (error) {
      console.error('Error adding comment:', error);
      enqueueSnackbar('Failed to add comment', { variant: 'error' });
    } finally {
      setIsCommenting(false);
    }
  };

  const handleShare = async () => {
    if (!shareText.trim()) {
      enqueueSnackbar('Please add a message for your share', { variant: 'warning' });
      return;
    }

    try {
      setIsSharing(true);
      const response = await fetch(`/api/posts/${post._id}/share`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ text: shareText })
      });

      if (!response.ok) throw new Error('Failed to share post');

      const sharedPost = await response.json();
      
      // Emit socket event
      if (socket) {
        socket.emit('post_shared', {
          postId: post._id,
          shareCount: post.shareCount + 1,
          userId: user.id
        });
      }

      // Update local state
      if (onUpdate) {
        onUpdate(post._id, { shareCount: post.shareCount + 1 });
      }

      setShareText('');
      setShowShareModal(false);
      enqueueSnackbar('Post shared successfully!', { variant: 'success' });
    } catch (error) {
      console.error('Error sharing post:', error);
      enqueueSnackbar('Failed to share post', { variant: 'error' });
    } finally {
      setIsSharing(false);
    }
  };

  const handleCongratulate = async () => {
    try {
      const response = await fetch(`/api/posts/${post._id}/congratulate`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to congratulate');

      const data = await response.json();
      
      // Emit socket event
      if (socket) {
        socket.emit('post_congratulated', {
          postId: post._id,
          congratulationsCount: data.congratulationsCount,
          userId: user.id
        });
      }

      // Update local state
      if (onUpdate) {
        onUpdate(post._id, { congratulations: data.congratulations, congratulationsCount: data.congratulationsCount });
      }
    } catch (error) {
      console.error('Error congratulating:', error);
      enqueueSnackbar('Failed to congratulate', { variant: 'error' });
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;

    try {
      const response = await fetch(`/api/posts/${post._id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) throw new Error('Failed to delete post');

      if (onUpdate) {
        onUpdate(post._id, null); // Remove from feed
      }

      enqueueSnackbar('Post deleted successfully', { variant: 'success' });
    } catch (error) {
      console.error('Error deleting post:', error);
      enqueueSnackbar('Failed to delete post', { variant: 'error' });
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden ${categoryColors[post.category]}`}>
      {/* Header */}
      <div className="p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={getAvatarSrc(post.user.avatar, post.user.username)}
              alt={post.user.username}
              className="w-10 h-10 rounded-full object-cover"
            />
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {post.user.firstName} {post.user.lastName}
              </h3>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500">{formatTime(post.createdAt)}</span>
                <span className={`text-xs px-2 py-1 rounded-full border ${categoryColors[post.category]}`}>
                  {post.category}
                </span>
              </div>
            </div>
          </div>
          
          <div className="relative">
            <button
              onClick={() => setShowActions(!showActions)}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"
            >
              <MoreVertical size={20} />
            </button>
            
            {showActions && isOwnPost && (
              <div className="absolute right-0 top-10 bg-white dark:bg-gray-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 py-1 z-10">
                <button
                  onClick={handleDelete}
                  className="flex items-center gap-2 w-full px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <Trash2 size={16} />
                  Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-4">
        {/* Text content */}
        {post.text && (
          <p className="text-gray-900 dark:text-white mb-4 whitespace-pre-wrap">
            {post.text}
          </p>
        )}

        {/* Media content */}
        {post.mediaUrl && (
          <div className="mb-4">
            {post.mediaType === 'image' ? (
              <img
                src={post.mediaUrl}
                alt="Post media"
                className="w-full max-h-96 object-cover rounded-lg cursor-pointer"
                onClick={() => window.open(post.mediaUrl, '_blank')}
              />
            ) : (
              <video
                src={post.mediaUrl}
                controls
                className="w-full max-h-96 rounded-lg"
                preload="metadata"
              />
            )}
          </div>
        )}

        {/* Shared post */}
        {post.isShared && post.originalPost && (
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600">
            <div className="flex items-center gap-2 mb-2">
              <Share2 size={16} className="text-gray-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Shared from {post.originalPost.user.firstName} {post.originalPost.user.lastName}
              </span>
            </div>
            {post.originalPost.text && (
              <p className="text-gray-900 dark:text-white text-sm mb-2">
                {post.originalPost.text}
              </p>
            )}
            {post.originalPost.mediaUrl && (
              <div className="relative">
                {post.originalPost.mediaType === 'image' ? (
                  <img
                    src={post.originalPost.mediaUrl}
                    alt="Original post media"
                    className="w-full max-h-48 object-cover rounded cursor-pointer"
                    onClick={() => window.open(post.originalPost.mediaUrl, '_blank')}
                  />
                ) : (
                  <video
                    src={post.originalPost.mediaUrl}
                    controls
                    className="w-full max-h-48 rounded"
                    preload="metadata"
                  />
                )}
                <button
                  onClick={() => window.open(post.originalPost.mediaUrl, '_blank')}
                  className="absolute top-2 right-2 p-1 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70"
                >
                  <ExternalLink size={14} />
                </button>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-6">
            <button
              onClick={handleLike}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                isLiked 
                  ? 'bg-red-100 text-red-600 dark:bg-red-900/20' 
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              <Heart size={20} className={isLiked ? 'fill-current' : ''} />
              <span className="text-sm">{post.likeCount || 0}</span>
            </button>

            <button
              onClick={() => setShowComments(!showComments)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
            >
              <MessageCircle size={20} />
              <span className="text-sm">{post.commentCount || 0}</span>
            </button>

            <button
              onClick={() => setShowShareModal(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400 transition-colors"
            >
              <Share2 size={20} />
              <span className="text-sm">{post.shareCount || 0}</span>
            </button>

            <button
              onClick={handleCongratulate}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                isCongratulated 
                  ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/20' 
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
              }`}
            >
              <PartyPopper size={20} className={isCongratulated ? 'fill-current' : ''} />
              <span className="text-sm">{post.congratulationsCount || 0}</span>
            </button>
          </div>
        </div>

        {/* Comments section */}
        {showComments && (
          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            {/* Existing comments */}
            {post.comments && post.comments.length > 0 && (
              <div className="space-y-3 mb-4">
                {post.comments.map((comment, index) => (
                  <div key={index} className="flex items-start gap-3">
                    <img
                      src={getAvatarSrc(comment.user.avatar, comment.user.username)}
                      alt={comment.user.username}
                      className="w-8 h-8 rounded-full object-cover"
                    />
                    <div className="flex-1">
                      <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-3">
                        <p className="font-medium text-sm text-gray-900 dark:text-white">
                          {comment.user.firstName} {comment.user.lastName}
                        </p>
                        <p className="text-gray-700 dark:text-gray-300 text-sm mt-1">
                          {comment.text}
                        </p>
                      </div>
                      <span className="text-xs text-gray-500 mt-1">
                        {formatTime(comment.createdAt)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Add comment */}
            <div className="flex items-center gap-3">
              <img
                src={getAvatarSrc(user.avatar, user.username)}
                alt={user.username}
                className="w-8 h-8 rounded-full object-cover"
              />
              <div className="flex-1 flex gap-2">
                <input
                  type="text"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Write a comment..."
                  className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  onKeyPress={(e) => e.key === 'Enter' && handleComment()}
                />
                <button
                  onClick={handleComment}
                  disabled={!commentText.trim() || isCommenting}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isCommenting ? 'Posting...' : 'Post'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Share modal */}
      {showShareModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Share Post
            </h3>
            <textarea
              value={shareText}
              onChange={(e) => setShareText(e.target.value)}
              placeholder="Add a message to your share..."
              className="w-full p-3 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              rows={3}
            />
            <div className="flex gap-3 mt-4">
              <button
                onClick={() => setShowShareModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleShare}
                disabled={!shareText.trim() || isSharing}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isSharing ? 'Sharing...' : 'Share'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PostCard;
