import React, { useContext, useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ThemeContext } from "../context/ThemeContext.jsx";
import { AuthContext } from "../context/AuthContext.jsx";
import { partnersAPI, postsAPI } from "../utils/api.js";
import { useSnackbar } from "notistack";
import { getAvatarSrc } from "../utils/avatarUtils";
import { useSocket } from "../hooks/useSocket";
import PostCard from "../components/PostCard";
import {
  Sun,
  Moon,
  Bell,
  ArrowLeft,
  MapPin,
  Users,
  MessageCircle,
  UserPlus,
  ChevronDown,
  LogOut,
  Edit3,
  Target,
  Image,
} from "lucide-react";
import { motion } from "framer-motion";

const UserProfile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { mode, toggleMode } = useContext(ThemeContext);
  const { user: currentUser, logout } = useContext(AuthContext);
  const { enqueueSnackbar } = useSnackbar();
  const { socket } = useSocket();

  const [menuOpen, setMenuOpen] = useState(false);
  const [profileUser, setProfileUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('posts'); // 'posts', 'mentions'
  const [userPosts, setUserPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);

  // Count only image posts for display
  const imagePostsCount = React.useMemo(() => {
    return Array.isArray(userPosts)
      ? userPosts.filter(p => !p?.isShared && p?.mediaUrl && p?.mediaType === 'image').length
      : 0;
  }, [userPosts]);

  // Helpers
  const stripPostalCode = (loc) => {
    if (!loc || typeof loc !== 'string') return loc || '';
    const parts = loc.split(',').map(p => p.trim());
    if (parts.length === 0) return loc;
    const last = parts[parts.length - 1];
    // Remove last segment if it's purely digits (postal code)
    if (/^\d+$/.test(last)) {
      return parts.slice(0, -1).join(', ');
    }
    return loc;
  };

  const getPreferredActivity = (pu) => {
    if (pu?.preferredActivity && typeof pu.preferredActivity === 'string') {
      return pu.preferredActivity;
    }
    if (Array.isArray(pu?.preferences) && pu.preferences.length > 0) {
      return pu.preferences[0];
    }
    if (typeof pu?.preferences === 'string' && pu.preferences.trim()) {
      return pu.preferences.trim();
    }
    // Fallback: if bio looks like a short activity word/phrase, use it as preferred activity
    if (typeof pu?.bio === 'string') {
      const bio = pu.bio.trim();
      // Heuristic: up to 3 words and <= 30 chars
      if (bio && bio.split(/\s+/).length <= 3 && bio.length <= 30) {
        return bio;
      }
    }
    return null;
  };

  const getPreferencesList = (pu) => {
    if (Array.isArray(pu?.preferences)) {
      return pu.preferences.filter(Boolean);
    }
    if (typeof pu?.preferences === 'string' && pu.preferences.trim()) {
      return [pu.preferences.trim()];
    }
    return [];
  };

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
  };

  // Fetch user profile data
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        const response = await partnersAPI.getPartner(userId);
        setProfileUser(response.data);
      } catch (err) {
        console.error('Failed to fetch profile:', err);
        enqueueSnackbar('Failed to load profile', { variant: 'error' });
        navigate('/find-partners');
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchProfile();
    }
  }, [userId, enqueueSnackbar, navigate]);

  // Fetch posts for this user
  useEffect(() => {
    const fetchPosts = async () => {
      if (!userId) return;
      try {
        setLoadingPosts(true);
        const { data } = await postsAPI.getPosts({ userId, limit: 20, page: 1 });
        setUserPosts(data.posts || []);
      } catch (err) {
        console.error('Failed to fetch user posts:', err);
      } finally {
        setLoadingPosts(false);
      }
    };
    fetchPosts();
  }, [userId]);

  const handlePostUpdate = (postId, changes) => {
    if (changes === null) {
      setUserPosts(prev => prev.filter(p => p._id !== postId));
      return;
    }
    setUserPosts(prev => prev.map(p => (p._id === postId ? { ...p, ...changes } : p)));
  };

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

  const handleConnect = async () => {
    try {
      const response = await partnersAPI.connect(userId, { message: '' });
      setProfileUser(prev => ({
        ...prev,
        connectionStatus: { status: 'PENDING', isRequester: true }
      }));
      enqueueSnackbar('Connection request sent!', { variant: 'success' });
    } catch (err) {
      console.error('Connection error:', err);
      enqueueSnackbar(err.response?.data?.msg || 'Failed to send connection request', { variant: 'error' });
    }
  };

  const getConnectionButton = () => {
    const buttonBase = "flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg font-medium text-sm sm:text-base transition-colors whitespace-nowrap";
    
    if (!profileUser?.connectionStatus) {
      return (
        <button
          onClick={handleConnect}
          className={`${buttonBase} bg-blue-600 text-white hover:bg-blue-700`}
          aria-label="Connect with this user"
        >
          <UserPlus className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>Connect</span>
        </button>
      );
    }

    switch (profileUser.connectionStatus.status) {
      case 'PENDING':
        if (profileUser.connectionStatus.isRequester) {
          return (
            <button
              disabled
              className={`${buttonBase} bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 cursor-not-allowed`}
              aria-label="Connection request pending"
            >
              <UserPlus className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Pending</span>
            </button>
          );
        } else {
          return (
            <button
              onClick={handleConnect}
              className={`${buttonBase} bg-green-600 text-white hover:bg-green-700`}
              aria-label="Accept connection request"
            >
              <UserPlus className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Accept</span>
            </button>
          );
        }
      case 'ACCEPTED':
        return (
          <button
            onClick={() => navigate(`/chat/${userId}`)}
            className={`${buttonBase} bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-800/50`}
            aria-label="Send message"
          >
            <MessageCircle className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Message</span>
          </button>
        );
      default:
        return (
          <button
            onClick={handleConnect}
            className={`${buttonBase} bg-blue-600 text-white hover:bg-blue-700`}
            aria-label="Connect with this user"
          >
            <UserPlus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Connect</span>
          </button>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-[#0f172a] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-[#0f172a] flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Profile not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-[#0f172a] transition-colors">
      {/* 🔹 Navbar */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-4 sm:px-6 py-2 sm:py-3 bg-white dark:bg-[#1e293b] shadow-md">
        {/* Back Button + Logo */}
        <div className="flex items-center gap-2 sm:gap-4">
          <button
            onClick={() => navigate('/find-partners')}
            className="p-1.5 sm:p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
          <div
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-1.5 sm:gap-2 cursor-pointer"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-full bg-blue-600 text-white font-bold text-sm sm:text-base">
              A
            </div>
            <span className="text-lg sm:text-xl font-bold text-blue-600">Aktiv</span>
          </div>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-2 sm:gap-4 relative">
          {/* Theme toggle */}
          <button
            onClick={toggleMode}
            className="p-1.5 sm:p-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition cursor-pointer"
            aria-label="Toggle theme"
          >
            {mode === "light" ? (
              <Moon className="w-5 h-5 text-gray-800" />
            ) : (
              <Sun className="w-5 h-5 text-yellow-400" />
            )}
          </button>

          {/* Notifications */}
          <div className="relative cursor-pointer p-1.5 sm:p-2">
            <Bell className="w-5 h-5 sm:w-6 sm:h-6 text-gray-600 dark:text-gray-300" />
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500"></span>
          </div>

          {/* Profile Dropdown */}
          <div
            className="flex items-center gap-1.5 sm:gap-2 cursor-pointer"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-haspopup="true"
            aria-expanded={menuOpen}
          >
            <img
              src={getAvatarSrc(currentUser?.avatar, currentUser?.username)}
              alt="profile"
              className="w-8 h-8 sm:w-9 sm:h-9 rounded-full border border-gray-300 dark:border-gray-600"
              width="36"
              height="36"
            />
            <span className="hidden sm:block font-medium text-sm sm:text-base text-gray-800 dark:text-gray-100 truncate max-w-[120px]">
              {currentUser?.username || "Guest User"}
            </span>
            <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-300 flex-shrink-0" />
          </div>

          {/* Dropdown Menu */}
          <div 
            className={`absolute right-0 top-12 sm:top-14 w-56 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 z-50 transition-all duration-200 ${menuOpen ? 'opacity-100 translate-y-0' : 'opacity-0 pointer-events-none -translate-y-2'}`}
            role="menu"
            aria-orientation="vertical"
            aria-hidden={!menuOpen}
          >
            <button
              onClick={() => {
                navigate("/profile");
                setMenuOpen(false);
              }}
              className="flex items-center gap-2 w-full px-4 py-3 text-sm sm:text-base text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-left"
              role="menuitem"
            >
              <Edit3 className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              <span>Edit Profile</span>
            </button>
            <hr className="border-gray-200 dark:border-gray-700 my-1" />
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 w-full px-4 py-3 text-sm sm:text-base text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer text-left"
              role="menuitem"
            >
              <LogOut className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </header>

      {/* 🔹 Main Content */}
      <main className="max-w-4xl mx-auto p-4 sm:p-6">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6 md:p-8 mb-6"
        >
          <div className="flex flex-col sm:flex-row items-start gap-4 sm:gap-6">
            {/* Avatar */}
            <div className="flex items-center gap-4 w-full sm:w-auto sm:flex-col">
              <div className="relative">
                <img
                  src={getAvatarSrc(profileUser.avatar, profileUser.name)}
                  alt={profileUser.name}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-gray-200 dark:border-gray-600"
                  width="96"
                  height="96"
                  loading="eager"
                />
              </div>
              {/* Mobile-only connection button */}
              <div className="sm:hidden">
                {getConnectionButton()}
              </div>
            </div>

            {/* Profile Info */}
            <div className="flex-1 w-full">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-800 dark:text-white break-words">
                  {profileUser.name}
                </h1>
                {/* Desktop connection button */}
                <div className="hidden sm:block">
                  {getConnectionButton()}
                </div>
              </div>
              
              {/* Username */}
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm text-gray-600 dark:text-gray-400">@{profileUser.username}</span>
                
                {/* Mobile counts */}
                <div className="flex items-center gap-3 text-xs sm:text-sm text-gray-500 dark:text-gray-400 ml-auto sm:hidden">
                  <span><span className="font-semibold">{imagePostsCount}</span> posts</span>
                  <span><span className="font-semibold">{profileUser.connectionCount || 0}</span> connections</span>
                </div>
              </div>

              {/* Info rows */}
              <div className="space-y-2.5 mb-3 text-sm">
                {Array.isArray(profileUser.goals) && profileUser.goals.length > 0 && (
                  <div className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                    <Target className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium text-gray-900 dark:text-gray-100">Goals: </span>
                      <span className="text-gray-700 dark:text-gray-300">{profileUser.goals.join(', ')}</span>
                    </div>
                  </div>
                )}
                {(() => {
                  const pref = getPreferredActivity(profileUser);
                  return pref ? (
                    <div className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                      <span className="w-4 h-4 rounded-full border border-purple-400 flex items-center justify-center text-[10px] text-purple-600 mt-0.5 flex-shrink-0">❤</span>
                      <div>
                        <span className="font-medium text-gray-900 dark:text-gray-100">Preferred Activity: </span>
                        <span className="text-gray-700 dark:text-gray-300">{pref}</span>
                      </div>
                    </div>
                  ) : null;
                })()}
                {(() => {
                  const prefs = getPreferencesList(profileUser);
                  return prefs.length > 0 ? (
                    <div className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                      <span className="w-4 h-4 rounded-full border border-purple-400 flex items-center justify-center text-[10px] text-purple-600 mt-0.5 flex-shrink-0">❤</span>
                      <div>
                        <span className="font-medium text-gray-900 dark:text-gray-100">Preferences: </span>
                        <span className="text-gray-700 dark:text-gray-300">{prefs.join(', ')}</span>
                      </div>
                    </div>
                  ) : null;
                })()}
                {profileUser.location && (
                  <div className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                    <MapPin className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="font-medium text-gray-900 dark:text-gray-100">Location: </span>
                      <span className="text-gray-700 dark:text-gray-300">{stripPostalCode(profileUser.location)}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Bio */}
              {(() => {
                const pref = getPreferredActivity(profileUser);
                const bio = (profileUser.bio || '').trim();
                const isDuplicateOfPref = pref && bio && bio.toLowerCase() === pref.toLowerCase();
                const content = bio && !isDuplicateOfPref ? bio : null;
                
                return content ? (
                  <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                      {content}
                    </p>
                  </div>
                ) : null;
              })()}
            </div>
          </div>
        </motion.div>

        {/* Content Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
        >
          {/* Tab Navigation */}
          <div className="flex items-stretch border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('posts')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 py-3 sm:py-4 px-2 sm:px-6 font-medium transition-colors text-sm sm:text-base ${
                activeTab === 'posts'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
              }`}
              aria-label="View posts"
            >
              <span className="inline-flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 rounded bg-blue-100 text-blue-700 text-[10px] sm:text-xs">▣</span>
              <span>Posts</span>
              <span className="ml-1 text-xs bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full px-2 py-0.5">
                {imagePostsCount}
              </span>
            </button>
            
            <button
              onClick={() => setActiveTab('mentions')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 sm:gap-2 py-3 sm:py-4 px-2 sm:px-6 font-medium transition-colors text-sm sm:text-base ${
                activeTab === 'mentions'
                  ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50'
              }`}
              aria-label="View mentions"
            >
              <span className="inline-flex items-center justify-center w-4 h-4 sm:w-5 sm:h-5 rounded border text-[10px] sm:text-xs">💬</span>
              <span>Mentions</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="min-h-[200px] p-4 sm:p-6">
            {activeTab === 'posts' && (
              <>
                {loadingPosts ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-3 sm:mb-4"></div>
                    <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400">Loading posts...</p>
                  </div>
                ) : userPosts.length === 0 ? (
                  <div className="text-center py-8 sm:py-12">
                    <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                      <Image className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
                    </div>
                    <h3 className="text-base sm:text-lg font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                      No posts yet
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                      {profileUser.name} hasn't shared any posts yet
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 sm:space-y-4">
                    {userPosts.map(p => (
                      <div key={p._id} className="border-b border-gray-100 dark:border-gray-700 last:border-0 pb-3 sm:pb-4 last:pb-0">
                        <PostCard post={p} onUpdate={handlePostUpdate} socket={socket} />
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {activeTab === 'mentions' && (
              <div className="text-center py-8 sm:py-12">
                <div className="w-14 h-14 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 flex items-center justify-center rounded-full bg-gray-100 dark:bg-gray-800">
                  <Users className="w-8 h-8 sm:w-10 sm:h-10 text-gray-400" />
                </div>
                <h3 className="text-base sm:text-lg font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-2">
                  No mentions yet
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                  Posts that mention @{profileUser.username} will show up here
                </p>
              </div>
            )}
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default UserProfile;
