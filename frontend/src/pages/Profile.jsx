import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { getAvatarSrc } from '../utils/avatarUtils';
import { postsAPI, dashboardAPI } from '../utils/api';
import BackButton from '../components/BackButton';
import { 
  Settings, 
  Grid3X3, 
  MessageSquare, 
  MapPin, 
  Users, 
  Target,
  Heart,
  Calendar,
  Trophy,
  MoreVertical,
  Trash2,
  X,
  Eye
} from 'lucide-react';

const Profile = () => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();

  const [activeTab, setActiveTab] = useState('posts');
  const [userStats, setUserStats] = useState({
    postsCount: 0,
    connectionsCount: 0,
    mentionsCount: 0
  });
  const [userPosts, setUserPosts] = useState([]);
  const [userMentions, setUserMentions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState(null);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showDeleteMenu, setShowDeleteMenu] = useState(null);

  // Fetch user data
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        
        // Fetch user stats
        const statsResponse = await dashboardAPI.getStats();
        const stats = statsResponse.data;
        setUserStats({
          postsCount: stats.postsCount || 0,
          connectionsCount: stats.connectionsCount || 0,
          mentionsCount: stats.mentionsCount || 0
        });

        // Fetch user posts - only image posts
        console.log('Current user:', user);
        console.log('Fetching posts for user ID:', user._id);
        const postsResponse = await postsAPI.getPosts({ userId: user._id });
        const allPosts = postsResponse.data.posts || [];
        console.log('All posts:', allPosts.length);
        console.log('All posts details:', allPosts.map(p => ({ 
          id: p._id, 
          text: p.text, 
          mediaUrl: p.mediaUrl, 
          mediaType: p.mediaType,
          userId: p.user?._id,
          username: p.user?.username 
        })));
        
        // Filter to show ONLY posts with images AND belonging to current user
        const imagePosts = allPosts.filter(post => {
          // Must belong to current user
          const belongsToUser = post.user?._id === user._id || post.user?._id === user.id;
          // Must have mediaUrl AND mediaType must be 'image'
          const hasImage = post.mediaUrl && post.mediaType === 'image';
          console.log(`Post ${post._id}: text="${post.text?.substring(0, 20)}...", belongsToUser=${belongsToUser}, hasImage=${hasImage}, mediaUrl=${post.mediaUrl}, mediaType=${post.mediaType}, postUserId=${post.user?._id}, currentUserId=${user._id}`);
          return belongsToUser && hasImage;
        });
        
        console.log('Image posts after filter:', imagePosts.length);
        console.log('Image posts details:', imagePosts.map(p => ({ id: p._id, text: p.text, mediaUrl: p.mediaUrl, mediaType: p.mediaType })));
        setUserPosts(imagePosts);

        // Mock mentions data (you can replace with actual API call)
        setUserMentions([
          {
            id: 1,
            title: "Morning Run Challenge",
            date: "2024-01-15",
            achievedBy: "Sarah Johnson",
            type: "running"
          },
          {
            id: 2,
            title: "Yoga Flow Session",
            date: "2024-01-14",
            achievedBy: "Mike Chen",
            type: "yoga"
          }
        ]);
      } catch (error) {
        console.error('Error fetching user data:', error);
        enqueueSnackbar('Failed to load profile data', { variant: 'error' });
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, [user._id, enqueueSnackbar]);

  // Close delete menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDeleteMenu && !event.target.closest('.delete-menu-container')) {
        setShowDeleteMenu(null);
      }
    };

    if (showDeleteMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDeleteMenu]);

  const formatLocation = (user) => {
    if (!user) return 'Location not set';
    
    // Check for new address fields first (for backward compatibility)
    const addressParts = [];
    if (user.area) addressParts.push(user.area);
    if (user.city) addressParts.push(user.city);
    if (user.state) addressParts.push(user.state);
    if (user.country) addressParts.push(user.country);
    
    if (addressParts.length > 0) {
      return addressParts.join(', ');
    }
    
    // Use the location field (new format: comma-separated string)
    if (user.location) {
      if (typeof user.location === 'string' && user.location.includes(',')) {
        // Check if it's coordinates (contains numbers and comma)
        const coordsPattern = /^-?\d+\.?\d*,-?\d+\.?\d*$/;
        if (coordsPattern.test(user.location.trim())) {
          return 'Location set (coordinates)';
        }
      }
      return user.location;
    }
    
    return 'Location not set';
  };

  const getGoalTypeIcon = (type) => {
    switch (type) {
      case 'running': return <Target className="w-4 h-4 text-green-500" />;
      case 'yoga': return <Heart className="w-4 h-4 text-purple-500" />;
      case 'fitness': return <Trophy className="w-4 h-4 text-blue-500" />;
      default: return <Target className="w-4 h-4 text-gray-500" />;
    }
  };

  const categoryColors = {
    'Fitness': 'bg-red-100 text-red-800 border-red-200',
    'Yoga': 'bg-purple-100 text-purple-800 border-purple-200',
    'Running': 'bg-green-100 text-green-800 border-green-200',
    'Nutrition': 'bg-orange-100 text-orange-800 border-orange-200',
    'Wellness': 'bg-blue-100 text-blue-800 border-blue-200',
    'Motivation': 'bg-yellow-100 text-yellow-800 border-yellow-200',
    'General': 'bg-gray-100 text-gray-800 border-gray-200'
  };

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post?')) return;

    try {
      console.log('Deleting post:', postId);
      console.log('Token:', localStorage.getItem('token') ? 'Present' : 'Missing');
      
      const response = await fetch(`/api/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      console.log('Delete response status:', response.status);
      console.log('Delete response headers:', response.headers);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Delete failed with status:', response.status);
        console.error('Error response:', errorText);
        throw new Error(`Failed to delete post: ${response.status} ${errorText}`);
      }

      // Remove from local state
      setUserPosts(prevPosts => {
        const updatedPosts = prevPosts.filter(post => post._id !== postId);
        console.log('Updated posts count:', updatedPosts.length);
        return updatedPosts;
      });
      
      // Update stats
      setUserStats(prevStats => ({
        ...prevStats,
        postsCount: prevStats.postsCount - 1
      }));

      setShowDeleteMenu(null);
      enqueueSnackbar('Post deleted successfully', { variant: 'success' });
    } catch (error) {
      console.error('Error deleting post:', error);
      enqueueSnackbar('Failed to delete post', { variant: 'error' });
    }
  };

  const handlePostClick = (post) => {
    setSelectedPost(post);
    setShowPostModal(true);
  };

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Back Button */}
        <div className="mb-6">
        <BackButton />
      </div>

        {/* Header Section - Instagram Style */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-start gap-6">
            {/* Left Side - Avatar */}
            <div className="flex-shrink-0">
              <img
          src={getAvatarSrc(user?.avatar, user?.username)}
                alt={user?.username}
                className="w-24 h-24 rounded-full object-cover"
              />
            </div>

            {/* Right Side - Profile Info */}
            <div className="flex-1">
              {/* Username and Edit Button */}
              <div className="flex items-center gap-4 mb-4">
                <h1 className="text-xl font-normal text-gray-900 dark:text-white">
          {user?.username}
                </h1>
                <button
          onClick={() => navigate('/onboarding')}
                  className="px-4 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-md hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium cursor-pointer"
                >
                  Edit profile
                </button>
                <button
                  onClick={() => navigate('/feed')}
                  className="px-4 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium cursor-pointer"
                >
                  Create Post
                </button>
              </div>

              {/* Stats Row */}
              <div className="flex gap-8 mb-4">
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {userStats.postsCount}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">posts</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {userStats.connectionsCount}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400">connections</div>
                </div>
              </div>

              {/* Full Name */}
              <div className="mb-2">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                  {user?.firstName} {user?.lastName}
                </h2>
              </div>

              {/* About Section - Above Bio */}
              <div className="mb-3">
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-blue-600" />
                    <span className="text-gray-600 dark:text-gray-400">
                      {user?.goals?.length > 0 ? user.goals.slice(0, 2).join(', ') : 'No goals set'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-green-600" />
                    <span className="text-gray-600 dark:text-gray-400">
                      {formatLocation(user)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bio */}
              <div className="mb-2">
                <p className="text-sm text-gray-900 dark:text-white">
                  {user?.bio || 'Fitness enthusiast on a journey to better health and wellness. Join me in achieving our goals together! 💪'}
                </p>
              </div>

              {/* Username Display */}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">@{user?.username}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('posts')}
              className={`flex-1 flex items-center justify-center gap-2 py-4 px-6 font-medium transition-colors cursor-pointer ${
                activeTab === 'posts'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <Grid3X3 size={20} />
              Posts
            </button>
            <button
              onClick={() => setActiveTab('mentions')}
              className={`flex-1 flex items-center justify-center gap-2 py-4 px-6 font-medium transition-colors cursor-pointer ${
                activeTab === 'mentions'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              <MessageSquare size={20} />
              Mentions
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'posts' && (
              <div className="transition-all duration-300">
                {userPosts.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {userPosts.map((post) => (
                      <div
                        key={post._id}
                        className="relative bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden cursor-pointer hover:shadow-md transition-all duration-200"
                        onClick={() => handlePostClick(post)}
                      >
                        {/* Delete Menu */}
                        <div className="absolute top-3 right-3 z-10 delete-menu-container">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              console.log('Delete menu clicked for post:', post._id);
                              setShowDeleteMenu(showDeleteMenu === post._id ? null : post._id);
                            }}
                            className="p-2 rounded-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm hover:bg-white dark:hover:bg-gray-700 transition-colors cursor-pointer shadow-sm"
                          >
                            <MoreVertical size={16} className="text-gray-600 dark:text-gray-400" />
                          </button>
                          
                          {showDeleteMenu === post._id && (
                            <div className="absolute right-0 top-10 bg-white dark:bg-gray-700 rounded-lg shadow-lg border border-gray-200 dark:border-gray-600 py-1 z-20 min-w-[120px]">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  console.log('Delete button clicked for post:', post._id);
                                  handleDeletePost(post._id);
                                }}
                                className="flex items-center gap-2 w-full px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 cursor-pointer transition-colors text-sm"
                              >
                                <Trash2 size={16} />
                                Delete
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Post Image */}
                        <div className="relative">
                          <img
                            src={post.mediaUrl}
                            alt="Post media"
                            className="w-full h-64 object-cover"
                          />
                          
                          {/* Category Badge Overlay */}
                          <div className="absolute top-3 left-3">
                            <span className={`text-xs px-2 py-1 rounded-full border backdrop-blur-sm ${categoryColors[post.category] || categoryColors['General']}`}>
                              {post.category}
                            </span>
                          </div>

                          {/* Hover Overlay with Stats */}
                          <div className="absolute inset-0 bg-black/50 opacity-0 hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                            <div className="text-white text-center">
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-1">
                                  <Heart size={16} className="fill-current" />
                                  <span className="text-sm font-medium">{post.likeCount || 0}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <MessageSquare size={16} />
                                  <span className="text-sm font-medium">{post.commentCount || 0}</span>
                                </div>
                              </div>
                              <p className="text-xs mt-2 opacity-80">Click to view</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Grid3X3 size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      No image posts yet
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400 mb-6">
                      Only posts with images are shown here. Text-only posts are not displayed.
                    </p>
                    <button
                      onClick={() => navigate('/feed')}
                      className="px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors cursor-pointer"
                    >
                      Create Image Post
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'mentions' && (
              <div className="transition-all duration-300">
                {userMentions.length > 0 ? (
                  <div className="space-y-4">
                    {userMentions.map((mention) => (
                      <div
                        key={mention.id}
                        className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4 border border-gray-200 dark:border-gray-600"
                      >
                        <div className="flex items-center gap-3 mb-3">
                          {getGoalTypeIcon(mention.type)}
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {mention.title}
                          </h3>
                        </div>
                        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400">
                          <span>Achieved by {mention.achievedBy}</span>
                          <span className="flex items-center gap-1">
                            <Calendar size={14} />
                            {mention.date}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <MessageSquare size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                      No mentions yet
                    </h3>
                    <p className="text-gray-600 dark:text-gray-400">
                      You'll appear here when others tag you in their goals
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </div>

      {/* Post Modal - Instagram Style */}
      {showPostModal && selectedPost && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex">
            {/* Left Side - Image */}
            <div className="flex-1 bg-black flex items-center justify-center">
              {selectedPost.mediaUrl ? (
                selectedPost.mediaType === 'image' ? (
                  <img
                    src={selectedPost.mediaUrl}
                    alt="Post media"
                    className="max-h-[90vh] w-full object-contain"
                  />
                ) : (
                  <video
                    src={selectedPost.mediaUrl}
                    controls
                    className="max-h-[90vh] w-full object-contain"
                    preload="metadata"
                  />
                )
              ) : (
                <div className="text-white text-center">
                  <Grid3X3 size={48} className="mx-auto mb-4" />
                  <p>No media available</p>
                </div>
              )}
            </div>

            {/* Right Side - Comments and Details */}
            <div className="w-96 bg-white dark:bg-gray-800 flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-3">
                  <img
                    src={getAvatarSrc(user?.avatar, user?.username)}
                    alt={user?.username}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm">
                      {user?.username}
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {formatTime(selectedPost.createdAt)}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowPostModal(false)}
                  className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Post Content */}
              <div className="flex-1 overflow-y-auto p-4">
                {/* Category Badge */}
                <div className="mb-3">
                  <span className={`text-xs px-2 py-1 rounded-full border ${categoryColors[selectedPost.category] || categoryColors['General']}`}>
                    {selectedPost.category}
                  </span>
                </div>

                {/* Post Text */}
                {selectedPost.text && (
                  <div className="mb-4">
                    <p className="text-gray-900 dark:text-white text-sm leading-relaxed whitespace-pre-wrap">
                      {selectedPost.text}
                    </p>
                  </div>
                )}

                {/* Comments Section */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Comments</h4>
                  
                  {/* Real Comments */}
                  {selectedPost.comments && selectedPost.comments.length > 0 ? (
                    <div className="space-y-2">
                      {selectedPost.comments.map((comment, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <img
                            src={getAvatarSrc(comment.user?.avatar, comment.user?.username)}
                            alt={comment.user?.username}
                            className="w-6 h-6 rounded-full object-cover"
                          />
                          <div className="flex-1">
                            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
                              <p className="text-sm text-gray-900 dark:text-white">
                                <span className="font-semibold">{comment.user?.username}</span> {comment.text}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {formatTime(comment.createdAt)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4">
                      <p className="text-sm text-gray-500 dark:text-gray-400">No comments yet</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="border-t border-gray-200 dark:border-gray-700 p-4">
                {/* Action Buttons */}
                <div className="flex items-center gap-4 mb-3">
                  <button className="flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-red-500 transition-colors">
                    <Heart size={20} />
                    <span className="text-sm">{selectedPost.likeCount || 0}</span>
                  </button>
                  <button className="flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-blue-500 transition-colors">
                    <MessageSquare size={20} />
                    <span className="text-sm">{selectedPost.commentCount || 0}</span>
                  </button>
                  <button className="text-gray-600 dark:text-gray-400 hover:text-blue-500 transition-colors">
                    <Eye size={20} />
                  </button>
                </div>

                {/* Add Comment */}
                <div className="flex items-center gap-2">
                  <img
                    src={getAvatarSrc(user?.avatar, user?.username)}
                    alt={user?.username}
                    className="w-6 h-6 rounded-full object-cover"
                  />
                  <input
                    type="text"
                    placeholder="Add a comment..."
                    className="flex-1 px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                  <button className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm">
                    Post
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default Profile;