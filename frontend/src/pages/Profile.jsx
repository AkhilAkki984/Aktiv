import React, { useState, useContext, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { getAvatarSrc } from '../utils/avatarUtils';
import { postsAPI, dashboardAPI } from '../utils/api';
import BackButton from '../components/BackButton';
import { 
  Settings, 
  Plus, 
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
        const postsResponse = await postsAPI.getPosts({ userId: user._id });
        const allPosts = postsResponse.data.posts || [];
        console.log('All posts:', allPosts.length);
        console.log('All posts details:', allPosts.map(p => ({ id: p._id, text: p.text, mediaUrl: p.mediaUrl, mediaType: p.mediaType })));
        
        // Filter to show ONLY posts with images (exclude text-only posts)
        const imagePosts = allPosts.filter(post => {
          // Must have mediaUrl AND mediaType must be 'image'
          const hasImage = post.mediaUrl && post.mediaType === 'image';
          console.log(`Post ${post._id}: text="${post.text?.substring(0, 20)}...", hasImage=${hasImage}, mediaUrl=${post.mediaUrl}, mediaType=${post.mediaType}`);
          return hasImage;
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

  const formatLocation = (location) => {
    if (!location) return 'Location not set';
    if (typeof location === 'string' && location.includes(',')) {
      // Extract city from coordinates if available
      return 'Your City';
    }
    return location;
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

        {/* Header Section */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-8 mb-6">
          <div className="text-center">
            {/* Circular Profile Picture */}
            <div className="relative inline-block mb-6">
              <img
          src={getAvatarSrc(user?.avatar, user?.username)}
                alt={user?.username}
                className="w-32 h-32 rounded-full object-cover border-4 border-white dark:border-gray-700 shadow-lg"
              />
              <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-green-500 rounded-full border-4 border-white dark:border-gray-800 flex items-center justify-center">
                <Trophy className="w-4 h-4 text-white" />
              </div>
            </div>

            {/* Username and Bio */}
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
              {user?.firstName} {user?.lastName}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              @{user?.username}
            </p>
            <p className="text-gray-700 dark:text-gray-300 max-w-md mx-auto mb-6">
              {user?.bio || 'Fitness enthusiast on a journey to better health and wellness. Join me in achieving our goals together! 💪'}
            </p>

            {/* Edit Profile Button + Settings */}
            <div className="flex items-center justify-center gap-3 mb-8">
              <button
          onClick={() => navigate('/onboarding')}
                className="px-6 py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors font-medium cursor-pointer"
        >
          Edit Profile
              </button>
              <button
                onClick={() => navigate('/settings')}
                className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors cursor-pointer"
              >
                <Settings size={20} />
              </button>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-8 max-w-md mx-auto">
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {userStats.postsCount}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Posts</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {userStats.connectionsCount}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Connections</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-900 dark:text-white">
                  {userStats.mentionsCount}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Mentions</div>
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

                          {/* Timestamp Overlay */}
                          <div className="absolute top-3 left-3 mt-8">
                            <span className="text-xs text-white bg-black/50 px-2 py-1 rounded-full backdrop-blur-sm">
                              {formatTime(post.createdAt)}
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

        {/* Middle Section - Create Post CTA */}
        <div className="text-center mb-6">
          <button
            onClick={() => navigate('/feed')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-green-600 text-white rounded-full hover:from-blue-700 hover:to-green-700 transition-all duration-200 shadow-lg hover:shadow-xl cursor-pointer"
          >
            <Plus size={20} />
            Create New Post
          </button>
        </div>

        {/* Bottom Section - User Details Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Goals Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Target className="w-6 h-6 text-blue-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Goals</h3>
            </div>
            <div className="space-y-2">
              {user?.goals?.length > 0 ? (
                user.goals.map((goal, index) => (
                  <div key={index} className="text-sm text-gray-600 dark:text-gray-400">
                    • {goal}
                  </div>
                ))
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-sm">No goals set yet</p>
              )}
            </div>
          </div>

          {/* Preferences Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Heart className="w-6 h-6 text-red-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Preferences</h3>
            </div>
            <div className="space-y-2">
              {user?.preferences?.length > 0 ? (
                user.preferences.map((pref, index) => (
                  <div key={index} className="text-sm text-gray-600 dark:text-gray-400">
                    • {pref}
                  </div>
                ))
              ) : (
                <p className="text-gray-500 dark:text-gray-400 text-sm">No preferences set</p>
              )}
            </div>
          </div>

          {/* Location Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-4">
              <MapPin className="w-6 h-6 text-green-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Location</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {formatLocation(user?.location)}
            </p>
          </div>

          {/* Connections Card */}
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center gap-3 mb-4">
              <Users className="w-6 h-6 text-purple-600" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Connections</h3>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
              {userStats.connectionsCount} fitness partners
            </p>
            <button
              onClick={() => navigate('/partners')}
              className="text-sm text-blue-600 hover:text-blue-700 transition-colors cursor-pointer"
            >
              View all connections →
            </button>
          </div>
        </div>
      </div>

      {/* Post Modal */}
      {showPostModal && selectedPost && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <img
                  src={getAvatarSrc(user?.avatar, user?.username)}
                  alt={user?.username}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">
                    {user?.firstName} {user?.lastName}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {formatTime(selectedPost.createdAt)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowPostModal(false)}
                className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 max-h-[calc(90vh-120px)] overflow-y-auto">
              {/* Category Badge */}
              <div className="mb-4">
                <span className={`text-sm px-3 py-1 rounded-full border ${categoryColors[selectedPost.category] || categoryColors['General']}`}>
                  {selectedPost.category}
                </span>
              </div>

              {/* Post Text */}
              {selectedPost.text && (
                <div className="mb-6">
                  <p className="text-gray-900 dark:text-white text-lg leading-relaxed whitespace-pre-wrap">
                    {selectedPost.text}
                  </p>
                </div>
              )}

              {/* Media */}
              {selectedPost.mediaUrl && (
                <div className="mb-6">
                  {selectedPost.mediaType === 'image' ? (
                    <img
                      src={selectedPost.mediaUrl}
                      alt="Post media"
                      className="w-full max-h-96 object-contain rounded-lg bg-gray-50 dark:bg-gray-900"
                    />
                  ) : (
                    <video
                      src={selectedPost.mediaUrl}
                      controls
                      className="w-full max-h-96 rounded-lg bg-gray-50 dark:bg-gray-900"
                      preload="metadata"
                    />
                  )}
                </div>
              )}

              {/* Post Stats */}
              <div className="flex items-center gap-6 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Heart size={20} />
                  <span className="text-sm font-medium">{selectedPost.likeCount || 0}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <MessageSquare size={20} />
                  <span className="text-sm font-medium">{selectedPost.commentCount || 0}</span>
                </div>
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Eye size={20} />
                  <span className="text-sm font-medium">View</span>
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