import React, { useContext, useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ThemeContext } from "../context/ThemeContext.jsx";
import { AuthContext } from "../context/AuthContext.jsx";
import { partnersAPI } from "../utils/api.js";
import { useSnackbar } from "notistack";
import {
  Sun,
  Moon,
  Bell,
  ArrowLeft,
  MapPin,
  Calendar,
  Users,
  MessageCircle,
  UserPlus,
  ChevronDown,
  LogOut,
  Edit3,
  Globe,
  Target,
  Image,
  Video,
} from "lucide-react";
import { motion } from "framer-motion";

const UserProfile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { mode, toggleMode } = useContext(ThemeContext);
  const { user: currentUser, logout } = useContext(AuthContext);
  const { enqueueSnackbar } = useSnackbar();

  const [menuOpen, setMenuOpen] = useState(false);
  const [profileUser, setProfileUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('posts'); // 'posts', 'connections', 'requests'

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
              src={currentUser?.profilePic || "https://placehold.co/40x40"}
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
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="bg-white dark:bg-[#1e293b] rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-8 mb-6"
        >
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            {/* Avatar */}
            <div className="flex-shrink-0">
              {profileUser.avatar ? (
                <img
                  src={profileUser.avatar}
                  alt={profileUser.name}
                  className="w-24 h-24 rounded-full object-cover border-4 border-gray-200 dark:border-gray-600"
                />
              ) : (
                <div className="w-24 h-24 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center text-gray-600 dark:text-gray-300 font-bold text-2xl border-4 border-gray-200 dark:border-gray-600">
                  {getInitials(profileUser.name)}
                </div>
              )}
            </div>

            {/* Profile Info */}
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
                {profileUser.name}
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-4">
                @{profileUser.username}
              </p>
              
              {/* Location */}
              <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 mb-4">
                <MapPin className="w-4 h-4" />
                <span>{profileUser.location}</span>
                {profileUser.distance && (
                  <span className="text-sm">({profileUser.distance} miles away)</span>
                )}
              </div>

              {/* Bio */}
              {profileUser.bio && (
                <p className="text-gray-700 dark:text-gray-300 mb-4">
                  {profileUser.bio}
                </p>
              )}

              {/* Goals */}
              {profileUser.goals && profileUser.goals.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Goals:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {profileUser.goals.map((goal, index) => (
                      <span
                        key={index}
                        className={`px-3 py-1 rounded-full text-sm font-medium ${getGoalColor(goal, index)}`}
                      >
                        {goal}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Shared Goals */}
              {profileUser.sharedGoals && profileUser.sharedGoals.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Shared Goals:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {profileUser.sharedGoals.map((goal, index) => (
                      <span
                        key={index}
                        className={`px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200`}
                      >
                        {goal}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Action Button */}
            <div className="flex-shrink-0">
              {getConnectionButton()}
            </div>
          </div>
        </motion.div>

        {/* Stats Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-white dark:bg-[#1e293b] rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6 mb-6"
        >
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white mb-4">
            Stats
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div
              onClick={() => setActiveTab('connections')}
              className="p-4 rounded-lg bg-gray-50 dark:bg-[#0f172a] cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-blue-600" />
                <div>
                  <p className="text-2xl font-bold text-gray-800 dark:text-white">
                    {profileUser.connectionCount}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Connected Partners
                  </p>
                </div>
              </div>
            </div>
            <div
              onClick={() => setActiveTab('requests')}
              className="p-4 rounded-lg bg-gray-50 dark:bg-[#0f172a] cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center gap-3">
                <UserPlus className="w-8 h-8 text-green-600" />
                <div>
                  <p className="text-2xl font-bold text-gray-800 dark:text-white">
                    {profileUser.sentRequestsCount || 0}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Requests Sent
                  </p>
                </div>
              </div>
            </div>
            <div
              onClick={() => setActiveTab('posts')}
              className="p-4 rounded-lg bg-gray-50 dark:bg-[#0f172a] cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
            >
              <div className="flex items-center gap-3">
                <Image className="w-8 h-8 text-purple-600" />
                <div>
                  <p className="text-2xl font-bold text-gray-800 dark:text-white">
                    {profileUser.postsCount || 0}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Posts
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Content Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="bg-white dark:bg-[#1e293b] rounded-xl shadow-md border border-gray-200 dark:border-gray-700 p-6"
        >
          {/* Tab Navigation */}
          <div className="flex gap-4 mb-6 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab('posts')}
              className={`pb-2 px-1 font-medium transition-colors ${
                activeTab === 'posts'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Posts
            </button>
            <button
              onClick={() => setActiveTab('connections')}
              className={`pb-2 px-1 font-medium transition-colors ${
                activeTab === 'connections'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Connections
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`pb-2 px-1 font-medium transition-colors ${
                activeTab === 'requests'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Requests
            </button>
          </div>

          {/* Tab Content */}
          <div className="min-h-[200px]">
            {activeTab === 'posts' && (
              <div className="text-center py-12">
                <Image className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">
                  No posts yet
                </h3>
                <p className="text-gray-500 dark:text-gray-500">
                  {profileUser.name} hasn't shared any posts yet
                </p>
              </div>
            )}

            {activeTab === 'connections' && (
              <div className="text-center py-12">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">
                  No connections to show
                </h3>
                <p className="text-gray-500 dark:text-gray-500">
                  Connection details are private
                </p>
              </div>
            )}

            {activeTab === 'requests' && (
              <div className="text-center py-12">
                <UserPlus className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">
                  No requests to show
                </h3>
                <p className="text-gray-500 dark:text-gray-500">
                  Request details are private
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
