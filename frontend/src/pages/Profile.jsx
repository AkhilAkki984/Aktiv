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
  Eye,
  ChevronLeft,
  ChevronRight
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
  const [userPosts, setUserPosts] = useState([]); // image posts
  const [userTextPosts, setUserTextPosts] = useState([]); // text-only posts
  const [userMentions, setUserMentions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPost, setSelectedPost] = useState(null);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showDeleteMenu, setShowDeleteMenu] = useState(null);
  const [showAllPosts, setShowAllPosts] = useState(false);
  const [previewIndex, setPreviewIndex] = useState(0);

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
        
        // Split posts into image posts and text-only posts, only current user's
        const imagePosts = allPosts.filter(post => {
          // Must belong to current user
          const belongsToUser = post.user?._id === user._id || post.user?._id === user.id;
          // Must have mediaUrl AND mediaType must be 'image'
          const hasImage = post.mediaUrl && post.mediaType === 'image';
          console.log(`Post ${post._id}: text="${post.text?.substring(0, 20)}...", belongsToUser=${belongsToUser}, hasImage=${hasImage}, mediaUrl=${post.mediaUrl}, mediaType=${post.mediaType}, postUserId=${post.user?._id}, currentUserId=${user._id}`);
          return belongsToUser && hasImage;
        });
        const textOnlyPosts = allPosts
          .filter(post => {
            const belongsToUser = post.user?._id === user._id || post.user?._id === user.id;
            const noMedia = !post.mediaUrl && (!post.mediaType || post.mediaType === 'text');
            return belongsToUser && noMedia && post.text && post.text.trim();
          })
          .sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        console.log('Image posts after filter:', imagePosts.length);
        console.log('Image posts details:', imagePosts.map(p => ({ id: p._id, text: p.text, mediaUrl: p.mediaUrl, mediaType: p.mediaType })));
        setUserPosts(imagePosts);
        setUserTextPosts(textOnlyPosts);

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
        
        // For comma-separated location strings, remove postal code (last part if it's numeric)
        const locationParts = user.location.split(',').map(part => part.trim());
        
        // Check if last part is a postal code (numeric)
        const lastPart = locationParts[locationParts.length - 1];
        if (lastPart && /^\d+$/.test(lastPart)) {
          // Remove the postal code (last part)
          return locationParts.slice(0, -1).join(', ');
        }
        
        return user.location;
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

  // Combined posts: images + text-only, newest first
  const combinedPosts = React.useMemo(() => {
    const list = [...userPosts, ...userTextPosts];
    return list.sort((a,b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [userPosts, userTextPosts]);

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
      <div className="max-w-4xl mx-auto px-2 sm:px-4 py-3 sm:py-6">
        {/* Back Button */}
        <div className="mb-4 sm:mb-6">
          <BackButton />
        </div>

        {/* Header Section - Instagram Style */}
        <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-3 sm:p-4 md:p-6 mb-4 sm:mb-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 md:gap-6">
            {/* Left Side - Avatar */}
            <div className="flex-shrink-0 mx-auto sm:mx-0">
              <img
                src={getAvatarSrc(user?.avatar, user?.username)}
                alt={user?.username}
                className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-full object-cover border-2 border-white dark:border-gray-700 shadow-sm"
              />
            </div>

            {/* Right Side - Profile Info */}
            <div className="flex-1 w-full mt-3 sm:mt-0">
              {/* Username and Edit Button */}
              <div className="flex flex-col items-center sm:items-start w-full mb-3 sm:mb-4">
                <h1 className="text-xl sm:text-2xl font-medium text-gray-900 dark:text-white text-center sm:text-left w-full mb-2 sm:mb-3">
                  {user?.username}
                </h1>
                <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
                  <button
                    onClick={() => navigate('/onboarding')}
                    className="px-3 py-1.5 sm:py-2 bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors text-sm font-medium cursor-pointer flex-1 sm:flex-none text-center"
                  >
                    Edit profile
                  </button>
                  <button
                    onClick={() => navigate('/feed')}
                    className="px-3 py-1.5 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium cursor-pointer flex-1 sm:flex-none text-center"
                  >
                    Create Post
                  </button>
                </div>
              </div>

              {/* Stats Row */}
              <div className="flex flex-wrap gap-4 sm:gap-6 md:gap-8 mb-3 sm:mb-4">
                <div className="text-center sm:text-left flex-1 sm:flex-none">
                  <div className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                    {userStats.postsCount}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">posts</div>
                </div>
                <div className="text-center sm:text-left flex-1 sm:flex-none">
                  <div className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white">
                    {userStats.connectionsCount}
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">connections</div>
                </div>
              </div>

              {/* Full Name */}
              <div className="mb-1 sm:mb-2">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">
                  {user?.firstName} {user?.lastName}
                </h2>
              </div>

              {/* About Section - Above Bio */}
              <div className="mb-2 sm:mb-3">
                <div className="space-y-2 text-xs sm:text-sm">
                  <div className="flex items-start gap-2">
                    <Target className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-600 dark:text-gray-400 break-words">
                      <strong className="font-medium">Goals:</strong> {user?.goals?.length > 0 ? user.goals.slice(0, 2).join(', ') : 'No goals set'}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <Heart className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-600 dark:text-gray-400 break-words">
                      <strong className="font-medium">Activity:</strong> {user?.preferences?.length > 0 ? user.preferences.join(', ') : 'No preference set'}
                    </span>
                  </div>
                  <div className="flex items-start gap-2">
                    <MapPin className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <span className="text-gray-600 dark:text-gray-400 break-words">
                      <strong className="font-medium">Location:</strong> {formatLocation(user)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Bio */}
              <div className="mb-2 sm:mb-3">
                <p className="text-sm text-gray-900 dark:text-white break-words">
                  {user?.bio || 'Fitness enthusiast on a journey to better health and wellness. Join me in achieving our goals together! 💪'}
                </p>
              </div>

              {/* Username Display */}
              <div className="flex items-center gap-2">
                <span className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">@{user?.username}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Content Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 mb-4 sm:mb-6">
          {/* Tab Navigation */}
          <div className="flex border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('posts')}
              className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-3 sm:py-4 px-2 sm:px-6 font-medium transition-colors cursor-pointer text-sm sm:text-base ${
                activeTab === 'posts'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
              aria-label="View posts"
            >
              <Grid3X3 size={18} className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Posts</span>
            </button>
            <button
              onClick={() => setActiveTab('mentions')}
              className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 py-3 sm:py-4 px-2 sm:px-6 font-medium transition-colors cursor-pointer text-sm sm:text-base ${
                activeTab === 'mentions'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
              aria-label="View mentions"
            >
              <MessageSquare size={18} className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Mentions</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-3 sm:p-4 md:p-6">
            {activeTab === 'posts' && (
              <div className="transition-all duration-300">
                {combinedPosts.length > 0 ? (
                  <>
                    {/* Preview mode: two-card carousel with arrows */}
                    {!showAllPosts && (
                      <div className="relative">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
                          {[0, 1].map((offset) => {
                            const idx = (previewIndex + offset) % combinedPosts.length;
                            const post = combinedPosts[idx];
                            if (!post) return null;
                            return (
                              <div key={post._id || idx} className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                                {/* Header */}
                                <div className="p-2 sm:p-3 flex items-center gap-2 sm:gap-3">
                                  <img 
                                    src={getAvatarSrc(user?.avatar, user?.username)} 
                                    alt={user?.username} 
                                    className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover flex-shrink-0" 
                                  />
                                  <div className="min-w-0 flex-1">
                                    <p className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white truncate">{user?.username}</p>
                                    <div className="flex items-center flex-wrap gap-1 sm:gap-2 text-2xs sm:text-xs text-gray-500 dark:text-gray-400">
                                      <span className="whitespace-nowrap">{new Date(post.createdAt).toLocaleDateString()}</span>
                                      {post.category && (
                                        <span className={`px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-full border text-2xs sm:text-xs ${categoryColors[post.category] || categoryColors['General']}`}>
                                          {post.category}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Content clickable (desktop only) */}
                                <div
                                  onClick={() => { if (window.innerWidth >= 768) handlePostClick(post); }}
                                  className="cursor-pointer select-none"
                                >
                                  {post.text && (
                                    <div className="p-2 sm:p-3">
                                      <p className="text-xs sm:text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap line-clamp-3 sm:line-clamp-4">
                                        {post.text}
                                      </p>
                                    </div>
                                  )}
                                  {post.mediaUrl && (
                                    <div className="border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
                                      <img 
                                        src={post.mediaUrl} 
                                        alt="Post media" 
                                        className="w-auto max-w-full max-h-40 sm:max-h-56 md:max-h-64 object-contain" 
                                        loading="lazy"
                                      />
                                    </div>
                                  )}
                                </div>

                                {/* Footer */}
                                <div className="px-2 sm:px-3 py-1.5 sm:py-2 flex items-center gap-4 sm:gap-6 text-gray-600 dark:text-gray-400 text-xs">
                                  <div className="flex items-center gap-1">
                                    <Heart size={12} className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                    <span>{post.likeCount || 0}</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handlePostClick(post)}
                                    className="flex items-center gap-1 hover:text-gray-800 dark:hover:text-gray-200"
                                    aria-label="View comments"
                                  >
                                    <MessageSquare size={12} className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                    <span>{post.commentCount || 0}</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {combinedPosts.length > 1 && (
                          <>
                            <button
                              onClick={() => setPreviewIndex((i) => (i - 1 + combinedPosts.length) % combinedPosts.length)}
                              className="hidden md:flex items-center justify-center absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-gray-800/80 text-white hover:bg-gray-800 cursor-pointer"
                              aria-label="Previous"
                            >
                              <ChevronLeft size={18} />
                            </button>
                            <button
                              onClick={() => setPreviewIndex((i) => (i + 1) % combinedPosts.length)}
                              className="hidden md:flex items-center justify-center absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-gray-800/80 text-white hover:bg-gray-800 cursor-pointer"
                              aria-label="Next"
                            >
                              <ChevronRight size={18} />
                            </button>
                          </>
                        )}

                        <div className="mt-4 sm:mt-6 text-center">
                          <button
                            onClick={() => setShowAllPosts(true)}
                            className="px-4 sm:px-5 py-1.5 sm:py-2 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors cursor-pointer text-sm sm:text-base"
                            aria-label="Show all posts"
                          >
                            Show all posts →
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Full view: single-column vertical feed with text above image */}
                    {showAllPosts && (
                      <div className="space-y-4 sm:space-y-6">
                        {combinedPosts.map((post) => (
                          <div key={post._id} className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                            {/* Header */}
                            <div className="p-3 sm:p-4 flex items-center justify-between">
                              <div className="flex items-center gap-2 sm:gap-3">
                                <img 
                                  src={getAvatarSrc(user?.avatar, user?.username)} 
                                  alt={user?.username} 
                                  className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover flex-shrink-0" 
                                />
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">{user?.username}</p>
                                  <div className="flex items-center flex-wrap gap-1 sm:gap-2 text-2xs sm:text-xs text-gray-500 dark:text-gray-400">
                                    <span className="whitespace-nowrap">{new Date(post.createdAt).toLocaleDateString()}</span>
                                    {post.category && (
                                      <span className={`px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-full border text-2xs sm:text-xs ${categoryColors[post.category] || categoryColors['General']}`}>
                                        {post.category}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="relative delete-menu-container">
                                <button
                                  className="p-1 sm:p-1.5 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400"
                                  aria-label="More options"
                                  onClick={() => setShowDeleteMenu(prev => prev === post._id ? null : post._id)}
                                >
                                  <MoreVertical size={16} className="w-4 h-4 sm:w-4.5 sm:h-4.5" />
                                </button>
                                {showDeleteMenu === post._id && (
                                  <div className="absolute right-0 mt-2 w-28 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-10">
                                    <button
                                      onClick={() => { setShowDeleteMenu(null); handleDeletePost(post._id); }}
                                      className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md"
                                      aria-label="Delete post"
                                    >
                                      Delete
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Text first */}
                            {post.text && (
                              <div className="px-3 sm:px-4 pb-1 sm:pb-2">
                                <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words">
                                  {post.text}
                                </p>
                              </div>
                            )}

                            {/* Image container (object-contain to avoid cropping). Click opens only on md+ */}
                            {post.mediaUrl && (
                              <div 
                                onClick={() => { if (window.innerWidth >= 768) handlePostClick(post); }} 
                                className="w-full bg-gray-50 dark:bg-gray-900 flex items-center justify-center cursor-pointer"
                              >
                                <img 
                                  src={post.mediaUrl} 
                                  alt="Post media" 
                                  className="max-h-64 sm:max-h-80 md:max-h-96 w-auto object-contain" 
                                  loading="lazy"
                                />
                              </div>
                            )}

                            {/* Footer */}
                            <div className="px-3 sm:px-4 py-2 sm:py-3 flex items-center gap-4 sm:gap-6 text-gray-600 dark:text-gray-400 text-xs sm:text-sm">
                              <div className="flex items-center gap-1">
                                <Heart size={14} className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                <span>{post.likeCount || 0}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handlePostClick(post)}
                                className="flex items-center gap-1 hover:text-gray-800 dark:hover:text-gray-200"
                                aria-label="View comments"
                              >
                                <MessageSquare size={14} className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                <span>{post.commentCount || 0}</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8 sm:py-12 px-4">
                    <Grid3X3 size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3 sm:mb-4 w-10 h-10 sm:w-12 sm:h-12" />
                    <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-1.5 sm:mb-2">
                      No posts yet
                    </h3>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-4 sm:mb-6 max-w-md mx-auto">
                      Posts with images are displayed here. Create your first post to get started!
                    </p>
                    <button
                      onClick={() => navigate('/feed')}
                      className="px-5 sm:px-6 py-1.5 sm:py-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors cursor-pointer text-sm sm:text-base"
                      aria-label="Create new post"
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
                  <div className="space-y-3 sm:space-y-4">
                    {userMentions.map((mention) => (
                      <div
                        key={mention.id}
                        className="bg-gray-50 dark:bg-gray-700 rounded-lg sm:rounded-xl p-3 sm:p-4 border border-gray-200 dark:border-gray-600"
                      >
                        <div className="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-3">
                          <div className="mt-0.5">
                            {getGoalTypeIcon(mention.type)}
                          </div>
                          <h3 className="font-semibold text-sm sm:text-base text-gray-900 dark:text-white">
                            {mention.title}
                          </h3>
                        </div>
                        <div className="flex flex-col xs:flex-row xs:items-center justify-between text-xs sm:text-sm text-gray-600 dark:text-gray-400 gap-1 sm:gap-2">
                          <span className="truncate">Achieved by {mention.achievedBy}</span>
                          <span className="flex items-center gap-1 whitespace-nowrap">
                            <Calendar size={12} className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                            {mention.date}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 sm:py-12 px-4">
                    <MessageSquare size={40} className="mx-auto text-gray-300 dark:text-gray-600 mb-3 sm:mb-4 w-10 h-10 sm:w-12 sm:h-12" />
                    <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-1.5 sm:mb-2">
                      No mentions yet
                    </h3>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 max-w-md mx-auto">
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg sm:rounded-2xl shadow-xl max-w-6xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col sm:flex-row">
            {/* Media Section - Full width on mobile, 2/3 on larger screens */}
            <div className="relative w-full sm:flex-1 bg-black flex items-center justify-center max-h-[50vh] sm:max-h-none">
              <button 
                onClick={() => setShowPostModal(false)}
                className="absolute top-2 right-2 sm:hidden p-1.5 bg-black/50 text-white rounded-full z-10"
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
              {selectedPost.mediaUrl ? (
                selectedPost.mediaType === 'image' ? (
                  <img
                    src={selectedPost.mediaUrl}
                    alt="Post media"
                    className="max-h-[calc(100%-1rem)] w-full object-contain"
                    onClick={(e) => e.stopPropagation()}
                  />
                ) : (
                  <video
                    src={selectedPost.mediaUrl}
                    controls
                    className="max-h-[calc(100%-1rem)] w-full object-contain"
                    preload="metadata"
                    onClick={(e) => e.stopPropagation()}
                  />
                )
              ) : (
                <div className="text-white text-center p-4">
                  <Grid3X3 size={40} className="mx-auto mb-3 w-10 h-10" />
                  <p className="text-sm">No media available</p>
                </div>
              )}
            </div>

            {/* Right Side - Comments and Details - Full width on mobile, 1/3 on larger screens */}
            <div className="w-full sm:w-96 bg-white dark:bg-gray-800 flex flex-col flex-shrink-0 border-t sm:border-t-0 border-gray-200 dark:border-gray-700">
              {/* Header - Hidden on mobile as we have a close button on the media section */}
              <div className="hidden sm:flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
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
                  aria-label="Close modal"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Post Content */}
              <div className="flex-1 overflow-y-auto p-3 sm:p-4">
                {/* Category Badge - Only show if category exists */}
                {selectedPost.category && (
                  <div className="mb-2 sm:mb-3">
                    <span className={`inline-block text-xs px-2 py-1 rounded-full border ${
                      categoryColors[selectedPost.category] || categoryColors['General']
                    }`}>
                      {selectedPost.category}
                    </span>
                  </div>
                )}

                {/* Post Text */}
                {selectedPost.text && (
                  <div className="mb-3 sm:mb-4">
                    <p className="text-gray-900 dark:text-white text-sm leading-relaxed whitespace-pre-wrap break-words">
                      {selectedPost.text}
                    </p>
                  </div>
                )}

                {/* Comments Section */}
                <div className="space-y-2 sm:space-y-3">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">Comments</h4>
                  
                  {/* Real Comments */}
                  {selectedPost.comments && selectedPost.comments.length > 0 ? (
                    <div className="space-y-2 max-h-[200px] sm:max-h-[300px] overflow-y-auto pr-1 -mr-1">
                      {selectedPost.comments.map((comment, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <img
                            src={getAvatarSrc(comment.user?.avatar, comment.user?.username)}
                            alt={comment.user?.username}
                            className="w-6 h-6 rounded-full object-cover flex-shrink-0 mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-2">
                              <p className="text-xs sm:text-sm text-gray-900 dark:text-white break-words">
                                <span className="font-semibold">{comment.user?.username}</span> {comment.text}
                              </p>
                              <p className="text-2xs sm:text-xs text-gray-500 dark:text-gray-400 mt-1">
                                {formatTime(comment.createdAt)}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-3 sm:py-4">
                      <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">No comments yet</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="border-t border-gray-200 dark:border-gray-700 p-3 sm:p-4">
                {/* Action Buttons */}
                <div className="flex items-center gap-3 sm:gap-4 mb-2 sm:mb-3">
                  <button 
                    className="flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-red-500 transition-colors"
                    aria-label="Like"
                  >
                    <Heart size={18} className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="text-xs sm:text-sm">{selectedPost.likeCount || 0}</span>
                  </button>
                  <button 
                    className="flex items-center gap-1 text-gray-600 dark:text-gray-400 hover:text-blue-500 transition-colors"
                    aria-label="Comments"
                  >
                    <MessageSquare size={18} className="w-4 h-4 sm:w-5 sm:h-5" />
                    <span className="text-xs sm:text-sm">{selectedPost.commentCount || 0}</span>
                  </button>
                  <button 
                    className="text-gray-600 dark:text-gray-400 hover:text-blue-500 transition-colors"
                    aria-label="View post details"
                  >
                    <Eye size={18} className="w-4 h-4 sm:w-5 sm:h-5" />
                  </button>
                </div>

                {/* Add Comment */}
                <div className="flex items-center gap-2">
                  <img
                    src={getAvatarSrc(user?.avatar, user?.username)}
                    alt={user?.username}
                    className="w-6 h-6 rounded-full object-cover flex-shrink-0"
                  />
                  <input
                    type="text"
                    placeholder="Add a comment..."
                    className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 text-xs sm:text-sm"
                    aria-label="Write a comment"
                  />
                  <button 
                    className="px-2 sm:px-3 py-1 sm:py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs sm:text-sm whitespace-nowrap"
                    aria-label="Post comment"
                  >
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