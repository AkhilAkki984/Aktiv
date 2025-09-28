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
    if (!profileUser?.connectionStatus) {
      return (
        <button
          onClick={handleConnect}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          <UserPlus className="w-5 h-5" />
          Connect
        </button>
      );
    }

    switch (profileUser.connectionStatus.status) {
      case 'PENDING':
        if (profileUser.connectionStatus.isRequester) {
          return (
            <button
              disabled
              className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-500 rounded-lg cursor-not-allowed font-medium"
            >
              <UserPlus className="w-5 h-5" />
              Pending
            </button>
          );
        } else {
          return (
            <button
              onClick={handleConnect}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium"
            >
              <UserPlus className="w-5 h-5" />
              Accept Request
            </button>
          );
        }
      case 'ACCEPTED':
        return (
          <button
            onClick={() => navigate(`/chat/${userId}`)}
            className="flex items-center gap-2 px-6 py-3 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded-lg font-medium"
          >
            <MessageCircle className="w-5 h-5" />
            Message
          </button>
        );
      default:
        return (
          <button
            onClick={handleConnect}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <UserPlus className="w-5 h-5" />
            Connect
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
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 bg-white dark:bg-[#1e293b] shadow-md">
        {/* Back Button + Logo */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/find-partners')}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600 dark:text-gray-300" />
          </button>
          <div
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 cursor-pointer"
          >
            <div className="w-9 h-9 flex items-center justify-center rounded-full bg-blue-600 text-white font-bold">
              A
            </div>
            <span className="text-xl font-bold text-blue-600">Aktiv</span>
          </div>
        </div>

        {/* Right Side */}
        <div className="flex items-center gap-4 relative">
          {/* Theme toggle */}
          <button
            onClick={toggleMode}
            className="p-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition cursor-pointer"
          >
            {mode === "light" ? (
              <Moon className="w-5 h-5 text-gray-800" />
            ) : (
              <Sun className="w-5 h-5 text-yellow-400" />
            )}
          </button>

          {/* Notifications */}
          <div className="relative cursor-pointer">
            <Bell className="w-6 h-6 text-gray-600 dark:text-gray-300" />
            <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-red-500"></span>
          </div>

          {/* Profile Dropdown */}
          <div
            className="flex items-center gap-2 cursor-pointer"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <img
              src={getAvatarSrc(currentUser?.avatar, currentUser?.username)}
              alt="profile"
              className="w-9 h-9 rounded-full border border-gray-300 dark:border-gray-600"
            />
            <span className="hidden sm:block font-medium text-gray-800 dark:text-gray-100">
              {currentUser?.username || "Guest User"}
            </span>
            <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-300" />
          </div>

          {/* Dropdown Menu */}
          {menuOpen && (
            <div className="absolute right-0 top-14 w-48 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-2">
              <button
                onClick={() => {
                  navigate("/profile");
                  setMenuOpen(false);
                }}
                className="flex items-center gap-2 w-full px-4 py-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
              >
                <Edit3 className="w-4 h-4" />
                Edit Profile
              </button>
              <hr className="border-gray-200 dark:border-gray-700 my-1" />
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 w-full px-4 py-2 text-red-600 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      {/* 🔹 Main Content */}
      <main className="max-w-4xl mx-auto p-6">
        {/* Profile Header (match clean card design) */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 md:p-8 mb-6"
        >
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Avatar */}
            <div className="flex-shrink-0">
              <img
                src={getAvatarSrc(profileUser.avatar, profileUser.name)}
                alt={profileUser.name}
                className="w-24 h-24 rounded-full object-cover border-4 border-gray-200 dark:border-gray-600"
              />
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-800 dark:text-white">
                  {profileUser.name}
                </h1>
                {/* Inline counts */}
                <div className="hidden md:flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300">
                  <span><span className="font-semibold">{imagePostsCount}</span> posts</span>
                  <span><span className="font-semibold">{profileUser.connectionCount || 0}</span> connections</span>
                </div>
              </div>

              {/* Info rows */}
              <div className="space-y-2 mb-3">
                {Array.isArray(profileUser.goals) && profileUser.goals.length > 0 && (
                  <div className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                    <Target className="w-4 h-4 text-blue-600" />
                    <span className="text-sm"><span className="font-medium">Goals:</span> {profileUser.goals.join(', ')}</span>
                  </div>
                )}
                {(() => {
                  const pref = getPreferredActivity(profileUser);
                  return pref ? (
                    <div className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                      <span className="w-4 h-4 rounded-full border border-purple-400 flex items-center justify-center text-[10px] text-purple-600">❤</span>
                      <span className="text-sm"><span className="font-medium">Preferred Activity:</span> {pref}</span>
                    </div>
                  ) : null;
                })()}
                {(() => {
                  const prefs = getPreferencesList(profileUser);
                  return prefs.length > 0 ? (
                  <div className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                    <span className="w-4 h-4 rounded-full border border-purple-400 flex items-center justify-center text-[10px] text-purple-600">❤</span>
                    <span className="text-sm"><span className="font-medium">Preferences:</span> {prefs.join(', ')}</span>
                  </div>
                  ) : null;
                })()}
                {profileUser.location && (
                  <div className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                    <MapPin className="w-4 h-4 text-green-600" />
                    <span className="text-sm"><span className="font-medium">Location:</span> {stripPostalCode(profileUser.location)}</span>
                  </div>
                )}
              </div>

              {(() => {
                const pref = getPreferredActivity(profileUser);
                const bio = (profileUser.bio || '').trim();
                const isDuplicateOfPref = pref && bio && bio.toLowerCase() === pref.toLowerCase();
                const content = bio && !isDuplicateOfPref ? bio : null;
                return (
                  <p className="text-sm text-gray-700 dark:text-gray-300 mb-1">
                    {content || 'No bio'}
                  </p>
                );
              })()}
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600 dark:text-gray-400">@{profileUser.username}</span>
              </div>
            </div>

            {/* Action Button */}
            <div className="flex-shrink-0">
              {getConnectionButton()}
            </div>
          </div>
        </motion.div>

        {/* Tabs card */}
        
        {/* Content Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="bg-white dark:bg-[#1e293b] rounded-2xl shadow-sm border border-gray-200 dark:border-gray-700 p-0"
        >
          {/* Tab Navigation */}
          <div className="flex items-center gap-6 px-6 pt-4">
            <button
              onClick={() => setActiveTab('posts')}
              className={`flex items-center gap-2 pb-3 font-medium transition-colors ${
                activeTab === 'posts'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-blue-100 text-blue-700 text-xs">▣</span>
              Posts
            </button>
            <button
              onClick={() => setActiveTab('mentions')}
              className={`flex items-center gap-2 pb-3 font-medium transition-colors ${
                activeTab === 'mentions'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              <span className="inline-flex items-center justify-center w-5 h-5 rounded border text-xs">💬</span>
              Mentions
            </button>
          </div>
          <div className="border-b border-gray-200 dark:border-gray-700" />

          {/* Tab Content */}
          <div className="min-h-[200px] p-6">
            {activeTab === 'posts' && (
              <>
                {loadingPosts ? (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-600 dark:text-gray-400">Loading posts...</p>
                  </div>
                ) : userPosts.length === 0 ? (
                  <div className="text-center py-12">
                    <Image className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">
                      No posts yet
                    </h3>
                    <p className="text-gray-500 dark:text-gray-500">
                      {profileUser.name} hasn't shared any posts yet
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {userPosts.map(p => (
                      <PostCard key={p._id} post={p} onUpdate={handlePostUpdate} socket={socket} />
                    ))}
                  </div>
                )}
              </>
            )}

            {activeTab === 'mentions' && (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">
                  No mentions yet
                </h3>
                <p className="text-gray-500 dark:text-gray-500">
                  Posts that mention @{profileUser.username} will show up here
                </p>
              </div>
            )}

            {/* Requests tab removed for public profile */}
          </div>
        </motion.div>
      </main>
    </div>
  );
};

export default UserProfile;
