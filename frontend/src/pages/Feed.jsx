import { useState, useEffect, useContext, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSnackbar } from 'notistack';
import { AuthContext } from '../context/AuthContext';
import { useSocket } from '../hooks/useSocket';
import PostComposer from '../components/PostComposer';
import PostCard from '../components/PostCard';
import { getAvatarSrc } from '../utils/avatarUtils';
import BackButton from '../components/BackButton';
import { postsAPI, dashboardAPI, goalsAPI } from '../utils/api';
import { 
  Filter, 
  RefreshCw,
  Users,
  TrendingUp,
  Activity,
  X
} from 'lucide-react';

const Feed = () => {
  const { user } = useContext(AuthContext);
  const { enqueueSnackbar } = useSnackbar();
  const { socket, isConnected } = useSocket();
  const navigate = useNavigate();
  
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showFilters, setShowFilters] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [userStats, setUserStats] = useState({
    consistency: 0,
    postsCount: 0,
    connectionsCount: 0,
    currentStreak: 0,
    goalsAchieved: 0
  });
  
  const observerRef = useRef();
  const loadMoreRef = useRef();

  const categories = [
    'All', 'Fitness', 'Yoga', 'Running', 'Nutrition', 'Wellness', 'Motivation', 'General'
  ];

  const categoryStats = {
    'Fitness': { icon: Activity, color: 'text-red-600', bg: 'bg-red-100' },
    'Yoga': { icon: Users, color: 'text-purple-600', bg: 'bg-purple-100' },
    'Running': { icon: TrendingUp, color: 'text-green-600', bg: 'bg-green-100' },
    'Nutrition': { icon: Activity, color: 'text-orange-600', bg: 'bg-orange-100' },
    'Wellness': { icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
    'Motivation': { icon: TrendingUp, color: 'text-yellow-600', bg: 'bg-yellow-100' },
    'General': { icon: Activity, color: 'text-gray-600', bg: 'bg-gray-100' }
  };

  // Fetch user statistics (ensure current streak is displayed by using best of API or goals data)
  const fetchUserStats = async () => {
    try {
      const response = await dashboardAPI.getStats();
      const data = response.data;

      // In parallel, try to fetch active goals to derive a fallback/augment for current streak
      let maxGoalStreak = 0;
      try {
        const goalsResp = await goalsAPI.getGoals({ status: 'active' });
        const activeGoals = goalsResp?.data || [];
        maxGoalStreak = Math.max(0, ...activeGoals.map(g => g?.progress?.currentStreak || 0));
      } catch (goalsErr) {
        console.warn('Unable to fetch active goals for streak derivation:', goalsErr);
      }

      const derivedStreak = Math.max(data.currentStreak || 0, maxGoalStreak);

      console.log('Dashboard API response:', data);
      console.log('Derived current streak (max of API and goals):', derivedStreak);

      setUserStats({
        consistency: data.consistencyScore || 0,
        postsCount: data.postsCount || 0,
        connectionsCount: data.connectionsCount || 0,
        currentStreak: derivedStreak,
        goalsAchieved: data.goalsAchieved || 0
      });

      console.log('User stats set:', {
        consistency: data.consistencyScore || 0,
        postsCount: data.postsCount || 0,
        connectionsCount: data.connectionsCount || 0,
        currentStreak: derivedStreak,
        goalsAchieved: data.goalsAchieved || 0
      });

      console.log('Raw dashboard data:', {
        postsCount: data.postsCount,
        connectionsCount: data.connectionsCount,
        consistencyScore: data.consistencyScore,
        currentStreak: data.currentStreak,
        goalsAchieved: data.goalsAchieved
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
      // Keep default values if fetch fails
    }
  };

  // Fetch posts
  const fetchPosts = async (pageNum = 1, category = selectedCategory, reset = false) => {
    try {
      if (reset) {
        setLoading(true);
        setPage(1);
      } else {
        setLoadingMore(true);
      }

      const params = {
        page: pageNum,
        limit: 10
      };
      
      if (category !== 'All') {
        params.category = category;
      }

      console.log('Fetching posts with params:', params);
      const response = await postsAPI.getPosts(params);
      const data = response.data;
      
      console.log('Posts response:', data);
      console.log('Posts array:', data.posts);
      console.log('Number of posts:', data.posts?.length || 0);
      
      if (reset) {
        setPosts(data.posts || []);
      } else {
        setPosts(prev => [...prev, ...(data.posts || [])]);
      }
      
      setHasMore(data.pagination.hasNextPage);
      setPage(pageNum);
    } catch (error) {
      console.error('Error fetching posts:', error);
      enqueueSnackbar('Failed to load posts', { variant: 'error' });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  // Load more posts
  const loadMore = () => {
    if (!loadingMore && hasMore) {
      fetchPosts(page + 1, selectedCategory);
    }
  };

  // Handle category change
  const handleCategoryChange = (category) => {
    setSelectedCategory(category);
    fetchPosts(1, category, true);
  };

  // Handle new post creation
  const handlePostCreated = (newPost) => {
    setPosts(prev => [newPost, ...prev]);
    // Refresh user stats when a new post is created
    fetchUserStats();
  };

  // Handle post updates
  const handlePostUpdate = (postId, updates) => {
    if (updates === null) {
      // Remove post (deleted)
      setPosts(prev => prev.filter(post => post._id !== postId));
      // Refresh user stats when a post is deleted
      fetchUserStats();
    } else {
      // Update post
      setPosts(prev => prev.map(post => 
        post._id === postId ? { ...post, ...updates } : post
      ));
    }
  };

  // Socket event handlers
  useEffect(() => {
    if (!socket) return;

    const handlePostCreated = (newPost) => {
      setPosts(prev => [newPost, ...prev]);
      // Refresh user stats when a new post is created via socket
      fetchUserStats();
    };

    const handlePostUpdated = (data) => {
      setPosts(prev => prev.map(post => {
        if (post._id === data.postId) {
          switch (data.type) {
            case 'like':
              return { ...post, likeCount: data.likeCount };
            case 'comment':
              return { ...post, commentCount: data.commentCount };
            case 'share':
              return { ...post, shareCount: data.shareCount };
            case 'congratulations':
              return { ...post, congratulationsCount: data.congratulationsCount };
            default:
              return post;
          }
        }
        return post;
      }));
    };

    const handleUserStatus = (data) => {
      if (data.status === 'online') {
        setOnlineUsers(prev => new Set([...prev, data.userId]));
      } else {
        setOnlineUsers(prev => {
          const newSet = new Set(prev);
          newSet.delete(data.userId);
          return newSet;
        });
      }
    };

    socket.on('post_created', handlePostCreated);
    socket.on('post_updated', handlePostUpdated);
    socket.on('user_status', handleUserStatus);

    // Emit user online status
    socket.emit('user_online');

    return () => {
      socket.off('post_created', handlePostCreated);
      socket.off('post_updated', handlePostUpdated);
      socket.off('user_status', handleUserStatus);
      socket.emit('user_offline');
    };
  }, [socket]);

  // Intersection observer for infinite scroll
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, loadingMore]);

  // Initial load
  useEffect(() => {
    fetchPosts(1, selectedCategory, true);
    fetchUserStats();
  }, []);

  // Refresh posts
  const handleRefresh = () => {
    fetchPosts(1, selectedCategory, true);
    // Also refresh user stats when manually refreshing
    fetchUserStats();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-gray-600 dark:text-gray-400 text-sm sm:text-base">Loading feed...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 sm:mb-6 gap-3 sm:gap-4">
          <div className="flex items-center gap-3">
            <div className="sm:hidden">
              <BackButton />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                  Community Feed
                </h1>
                {isConnected && (
                  <div className="hidden sm:flex items-center gap-1.5 text-green-600 text-xs bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded-full">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                    <span>{onlineUsers.size} online</span>
                  </div>
                )}
              </div>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">
                Share your fitness journey with the community
              </p>
            </div>
          </div>
          
          <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3">
            {isConnected && (
              <div className="sm:hidden flex items-center gap-1.5 text-green-600 text-xs bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded-full">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                <span>{onlineUsers.size} online</span>
              </div>
            )}
            
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={handleRefresh}
                className="p-2 sm:p-2.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400 transition-colors"
                title="Refresh feed"
                aria-label="Refresh feed"
              >
                <RefreshCw size={18} className="sm:w-5 sm:h-5" />
              </button>
              
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2 sm:p-2.5 rounded-lg transition-colors ${
                  showFilters 
                    ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/50 dark:text-blue-400' 
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-400'
                }`}
                title="Filter posts"
                aria-label="Filter posts"
              >
                <Filter size={18} className="sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-4 sm:mb-6 overflow-hidden">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-base sm:text-lg text-gray-900 dark:text-white">Filter by Category</h3>
              <button 
                onClick={() => setShowFilters(false)}
                className="sm:hidden p-1 -mr-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                aria-label="Close filters"
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex flex-wrap gap-2 overflow-x-auto pb-2 -mx-1 px-1">
              {categories.map(category => {
                const stats = categoryStats[category] || { icon: Activity, color: 'text-gray-600', bg: 'bg-gray-100' };
                const Icon = stats.icon;
                const isSelected = selectedCategory === category;
                
                return (
                  <button
                    key={category}
                    onClick={() => {
                      handleCategoryChange(category);
                      // On mobile, close filters after selection
                      if (window.innerWidth < 640) {
                        setShowFilters(false);
                      }
                    }}
                    className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 sm:py-2 rounded-full border text-sm transition-colors ${
                      isSelected
                        ? 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400'
                        : 'bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-600'
                    }`}
                    aria-pressed={isSelected}
                  >
                    <Icon size={14} className="flex-shrink-0" />
                    <span>{category}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Left Sidebar - Profile Card - Hidden on mobile */}
          <div className="hidden lg:block lg:col-span-1">
            {/* User Profile Card - Sticky */}
            <div className="sticky top-6 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="p-6 text-center">
                <img
                  src={getAvatarSrc(user.avatar, user.username)}
                  alt={user.username}
                  className="w-20 h-20 rounded-full mx-auto mb-4 object-cover cursor-pointer"
                  onClick={() => navigate('/profile')}
                />
                <h3
                  className="text-lg font-semibold text-gray-900 dark:text-white cursor-pointer hover:underline"
                  onClick={() => navigate('/profile')}
                  title="View your profile"
                >
                  {user.username}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {user.bio || 'Fitness Enthusiast'}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-500 mb-4">
                  {user.location ? 'Bengaluru, India' : 'Your Location'}
                </p>
                
                {/* Fitness Profile - 5 items with real data */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-3">
                  <div className="text-center">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Fitness Profile</h4>
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Consistency</span>
                        <span className="font-medium text-green-600">
                          {userStats.consistency}%
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Images Posted</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {userStats.postsCount}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Connections</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {userStats.connectionsCount}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Current Streak</span>
                        <span className="font-medium text-orange-600">
                          {userStats.currentStreak > 0 ? `${userStats.currentStreak} 🔥` : '0 ❄️'}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600 dark:text-gray-400">Goals Achieved</span>
                        <span className="font-medium text-purple-600">
                          {userStats.goalsAchieved}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Feed */}
          <div className="lg:col-span-3 space-y-4 sm:space-y-6">
            {/* Post Composer */}
            <PostComposer onPostCreated={handlePostCreated} socket={socket} />

            {/* Posts Feed */}
            <div className="space-y-4 sm:space-y-6">
              {posts.length === 0 ? (
                <div className="text-center py-8 sm:py-12 px-2">
                  <div className="w-14 h-14 sm:w-16 sm:h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                    <Activity size={28} className="text-gray-400 w-6 h-6 sm:w-8 sm:h-8" />
                  </div>
                  <h3 className="text-base sm:text-lg font-medium text-gray-900 dark:text-white mb-1 sm:mb-2">
                    No posts yet
                  </h3>
                  <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 max-w-md mx-auto">
                    Be the first to share your fitness journey!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:gap-6">
                  {posts.map(post => (
                    <div key={post._id} className="w-full">
                      <PostCard
                        post={post}
                        onUpdate={handlePostUpdate}
                        socket={socket}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Load more indicator */}
        {hasMore && (
          <div ref={loadMoreRef} className="flex justify-center py-6 sm:py-8">
            {loadingMore ? (
              <div className="flex items-center gap-2 text-sm sm:text-base text-gray-600 dark:text-gray-400">
                <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                <span>Loading more posts...</span>
              </div>
            ) : (
              <button
                onClick={loadMore}
                className="px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm sm:text-base font-medium"
                disabled={loadingMore}
              >
                Load More Posts
              </button>
            )}
          </div>
        )}

        {/* End of feed */}
        {!hasMore && posts.length > 0 && (
          <div className="text-center py-6 sm:py-8 text-gray-500 dark:text-gray-400 text-sm sm:text-base">
            <p>You've reached the end of the feed</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Feed;