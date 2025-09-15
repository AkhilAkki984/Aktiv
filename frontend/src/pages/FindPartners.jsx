import React, { useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ThemeContext } from "../context/ThemeContext.jsx";
import { AuthContext } from "../context/AuthContext.jsx";
import { partnersAPI } from "../utils/api.js";
import { useSnackbar } from "notistack";
import {
  Sun,
  Moon,
  Bell,
  Search,
  MapPin,
  Globe,
  ChevronDown,
  LogOut,
  Edit3,
  Users,
  MessageCircle,
  UserPlus,
} from "lucide-react";
import { motion } from "framer-motion";
import PartnerCard from "../components/PartnerCard.jsx";

const FindPartners = () => {
  const navigate = useNavigate();
  const { mode, toggleMode } = useContext(ThemeContext);
  const { user, logout } = useContext(AuthContext);
  const { enqueueSnackbar } = useSnackbar();

  const [menuOpen, setMenuOpen] = useState(false);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("find"); // 'find', 'active', 'pending'
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all"); // 'all', 'local', 'virtual'
  const [counts, setCounts] = useState({
    availableCount: 0,
    pendingCount: 0,
    activeCount: 0,
    totalCount: 0
  });
  const [countsLoading, setCountsLoading] = useState(true);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    hasNext: false,
    hasPrev: false
  });

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
  };

  // Fetch partner counts
  const fetchCounts = async () => {
    try {
      console.log('Fetching partner counts...');
      setCountsLoading(true);
      const response = await partnersAPI.getPartnerCounts();
      console.log('Partner counts response:', response.data);
      console.log('Setting counts to:', response.data);
      setCounts(response.data);
    } catch (err) {
      console.error('Failed to fetch partner counts:', err);
      console.log('Setting default counts due to error');
      // Set default counts on error
      setCounts({
        availableCount: 0,
        pendingCount: 0,
        activeCount: 0,
        totalCount: 0
      });
    } finally {
      setCountsLoading(false);
      console.log('Counts loading set to false');
    }
  };

  // Fetch counts on component mount
  useEffect(() => {
    console.log('Component mounted, fetching counts...');
    fetchCounts();
  }, []);

  // Debug: Log counts changes
  useEffect(() => {
    console.log('Counts state changed:', counts);
  }, [counts]);

  // Fetch partners data based on active tab
  useEffect(() => {
    const fetchPartners = async () => {
      try {
        setLoading(true);
        const params = {
          page: pagination.currentPage,
          limit: 20
        };

        if (searchQuery.trim()) {
          params.q = searchQuery.trim();
        }

        if (filterType !== 'all') {
          params.type = filterType;
        }

        let response;
        switch (activeTab) {
          case 'find':
            response = await partnersAPI.getAvailablePartners(params);
            break;
          case 'pending':
            response = await partnersAPI.getPendingPartners(params);
            break;
          case 'active':
            response = await partnersAPI.getAcceptedPartners(params);
            break;
          default:
            response = await partnersAPI.getAvailablePartners(params);
        }

        setPartners(response.data.partners);
        setPagination(response.data.pagination);
      } catch (err) {
        console.error('Failed to fetch partners:', err);
        enqueueSnackbar('Failed to load partners', { variant: 'error' });
        setPartners([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPartners();
  }, [activeTab, searchQuery, filterType, pagination.currentPage, enqueueSnackbar]);

  // Dummy data for demonstration
  const getDummyPartners = () => [
    {
      _id: '1',
      name: 'Sarah Miller',
      username: 'sarahm',
      avatar: null,
      bio: 'Looking for a workout buddy to stay motivated! 💪 Love early morning sessions.',
      location: 'New York, NY (2.3 miles)',
      distance: 2.3,
      sharedGoals: ['Fitness', 'Morning Routine'],
      connectionCount: 12,
      postsCount: 8,
      connectionStatus: null
    },
    {
      _id: '2',
      name: 'David Johnson',
      username: 'davidj',
      avatar: null,
      bio: 'Reading 50 books this year! Currently diving into productivity and psychology books.',
      location: 'Virtual Partner',
      distance: null,
      sharedGoals: ['Reading', 'Learning'],
      connectionCount: 5,
      postsCount: 3,
      connectionStatus: null
    },
    {
      _id: '3',
      name: 'Emma Liu',
      username: 'emmal',
      avatar: null,
      bio: 'Daily meditation practice for mental clarity. Love sharing mindfulness tips! 🙏',
      location: 'San Francisco, CA (1.8 miles)',
      distance: 1.8,
      sharedGoals: ['Meditation', 'Mindfulness'],
      connectionCount: 8,
      postsCount: 12,
      connectionStatus: null
    },
    {
      _id: '4',
      name: 'Mike Rodriguez',
      username: 'miker',
      avatar: null,
      bio: 'Training for my first marathon! Looking for a running partner to keep me accountable.',
      location: 'Austin, TX (0.5 miles)',
      distance: 0.5,
      sharedGoals: ['Running', 'Nutrition'],
      connectionCount: 15,
      postsCount: 6,
      connectionStatus: null
    },
    {
      _id: '5',
      name: 'Lisa Kim',
      username: 'lisak',
      avatar: null,
      bio: 'Learning Python and improving my Spanish! Love connecting with fellow learners.',
      location: 'Virtual Partner',
      distance: null,
      sharedGoals: ['Language Learning', 'Coding'],
      connectionCount: 7,
      postsCount: 4,
      connectionStatus: null
    },
    {
      _id: '6',
      name: 'James Wilson',
      username: 'jamesw',
      avatar: null,
      bio: 'Gym enthusiast working on better sleep schedule. Let\'s motivate each other!',
      location: 'Chicago, IL (3.1 miles)',
      distance: 3.1,
      sharedGoals: ['Fitness', 'Sleep Schedule'],
      connectionCount: 10,
      postsCount: 9,
      connectionStatus: null
    }
  ];

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const handleFilterChange = (type) => {
    setFilterType(type);
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const handleConnect = async (partnerId) => {
    try {
      const response = await partnersAPI.connect(partnerId, { message: '' });
      enqueueSnackbar('Connection request sent!', { variant: 'success' });
      
      // Refresh counts and current tab data
      await fetchCounts();
      setPagination(prev => ({ ...prev, currentPage: 1 }));
    } catch (err) {
      console.error('Connection error:', err);
      enqueueSnackbar(err.response?.data?.msg || 'Failed to send connection request', { variant: 'error' });
    }
  };

  const handleCancelRequest = async (connectionId) => {
    try {
      await partnersAPI.cancelRequest(connectionId);
      enqueueSnackbar('Connection request cancelled', { variant: 'info' });
      
      // Refresh counts and current tab data
      await fetchCounts();
      setPagination(prev => ({ ...prev, currentPage: 1 }));
    } catch (err) {
      console.error('Cancel request error:', err);
      enqueueSnackbar(err.response?.data?.msg || 'Failed to cancel request', { variant: 'error' });
    }
  };

  const handleAcceptRequest = async (connectionId) => {
    try {
      await partnersAPI.acceptRequest(connectionId);
      enqueueSnackbar('Connection request accepted!', { variant: 'success' });
      
      // Remove the accepted request from the list immediately
      setPartners(prev => prev.filter(partner => 
        partner.connectionStatus?.connectionId !== connectionId
      ));
      
      // Update counts optimistically
      setCounts(prev => ({
        ...prev,
        pendingCount: Math.max(0, (prev.pendingCount || 0) - 1),
        activeCount: (prev.activeCount || 0) + 1
      }));
      
      // Refresh counts from backend to ensure accuracy
      await fetchCounts();
      setPagination(prev => ({ ...prev, totalCount: prev.totalCount - 1 }));
    } catch (err) {
      console.error('Accept request error:', err);
      enqueueSnackbar(err.response?.data?.msg || 'Failed to accept request', { variant: 'error' });
    }
  };

  const handleRejectRequest = async (connectionId) => {
    try {
      await partnersAPI.rejectRequest(connectionId);
      enqueueSnackbar('Connection request rejected', { variant: 'info' });
      
      // Remove the rejected request from the list immediately
      setPartners(prev => prev.filter(partner => 
        partner.connectionStatus?.connectionId !== connectionId
      ));
      
      // Update counts optimistically
      setCounts(prev => ({
        ...prev,
        pendingCount: Math.max(0, (prev.pendingCount || 0) - 1)
      }));
      
      // Refresh counts from backend to ensure accuracy
      await fetchCounts();
      setPagination(prev => ({ ...prev, totalCount: prev.totalCount - 1 }));
    } catch (err) {
      console.error('Reject request error:', err);
      enqueueSnackbar(err.response?.data?.msg || 'Failed to reject request', { variant: 'error' });
    }
  };

  const handleProfileClick = (partnerId) => {
    navigate(`/profile/${partnerId}`);
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-[#0f172a] transition-colors">
      {/* 🔹 Navbar */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 bg-white dark:bg-[#1e293b] shadow-md">
        {/* Logo + Name */}
        <div
          onClick={() => navigate("/dashboard")}
          className="flex items-center gap-2 cursor-pointer"
        >
          <div className="w-9 h-9 flex items-center justify-center rounded-full bg-blue-600 text-white font-bold">
            A
          </div>
          <span className="text-xl font-bold text-blue-600">Aktiv</span>
        </div>

        {/* Nav Links */}
        <nav className="hidden md:flex items-center gap-6 text-gray-700 dark:text-gray-200 font-medium">
          <button onClick={() => navigate("/dashboard")} className="cursor-pointer">Dashboard</button>
          <button onClick={() => navigate("/goals")} className="cursor-pointer">Goals</button>
          <button onClick={() => navigate("/find-partners")} className="cursor-pointer text-blue-600 font-semibold">Find Partners</button>
          <button onClick={() => navigate("/chat/samplePartnerId")} className="cursor-pointer">Chat</button>
          <button onClick={() => navigate("/feed")} className="cursor-pointer">Feed</button>
          <button onClick={() => navigate("/leaderboard")} className="cursor-pointer">Leaderboard</button>
        </nav>

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

          {/* Pending Requests Button */}
          <button
            onClick={() => setActiveTab("pending")}
            className="relative p-2 rounded-full bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 transition cursor-pointer"
          >
            <UserPlus className="w-5 h-5 text-gray-600 dark:text-gray-300" />
            {(counts.pendingCount || 0) > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                {counts.pendingCount || 0}
              </span>
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
              src={user?.profilePic || "https://placehold.co/40x40"}
              alt="profile"
              className="w-9 h-9 rounded-full border border-gray-300 dark:border-gray-600"
            />
            <span className="hidden sm:block font-medium text-gray-800 dark:text-gray-100">
              {user?.username || "Guest User"}
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
      <main className="max-w-7xl mx-auto p-6">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white mb-2">
            Manage your fitness partnerships and check-ins
          </h1>
          
          {/* Tab Navigation */}
          <div className="flex gap-1 mt-6 border-b border-gray-200 dark:border-gray-700">
            <button
              onClick={() => setActiveTab("find")}
              className={`pb-3 px-1 font-medium transition-colors ${
                activeTab === "find"
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Find Partners
            </button>
            <button
              onClick={() => setActiveTab("active")}
              className={`pb-3 px-1 font-medium transition-colors ${
                activeTab === "active"
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Active Partners ({counts.activeCount || 0})
            </button>
            <button
              onClick={() => setActiveTab("pending")}
              className={`pb-3 px-1 font-medium transition-colors ${
                activeTab === "pending"
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Pending Requests ({counts.pendingCount || 0})
            </button>
          </div>
        </motion.div>

        {/* Tab Content */}
        {activeTab === "find" && (
          <>
            {/* Search and Filter Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="mb-8"
            >
              <div className="flex flex-col lg:flex-row gap-4">
                {/* Search Bar */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search by goals, interests, or location..."
                    value={searchQuery}
                    onChange={handleSearch}
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-[#1e293b] text-gray-900 dark:text-white"
                  />
                </div>

                {/* Filter Buttons */}
                <div className="flex gap-2">
                  <button
                    onClick={() => handleFilterChange('all')}
                    className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                      filterType === 'all'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white dark:bg-[#1e293b] text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    All Partners
                  </button>
                  <button
                    onClick={() => handleFilterChange('local')}
                    className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                      filterType === 'local'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white dark:bg-[#1e293b] text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <MapPin className="w-4 h-4" />
                    Local Partners
                  </button>
                  <button
                    onClick={() => handleFilterChange('virtual')}
                    className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium transition-colors ${
                      filterType === 'virtual'
                        ? 'bg-blue-600 text-white'
                        : 'bg-white dark:bg-[#1e293b] text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                    }`}
                  >
                    <Globe className="w-4 h-4" />
                    Virtual Partners
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Partners Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {loading ? (
                // Loading skeleton
                Array.from({ length: 6 }).map((_, idx) => (
                  <div key={idx} className="p-6 rounded-xl bg-white dark:bg-[#1e293b] shadow-md border border-gray-200 dark:border-gray-700 animate-pulse">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                      <div className="flex-1">
                        <div className="h-5 w-32 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
                        <div className="h-4 w-24 bg-gray-300 dark:bg-gray-600 rounded"></div>
                      </div>
                    </div>
                    <div className="h-4 w-20 bg-gray-300 dark:bg-gray-600 rounded mb-3"></div>
                    <div className="h-3 w-full bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
                    <div className="h-3 w-3/4 bg-gray-300 dark:bg-gray-600 rounded mb-4"></div>
                    <div className="flex gap-2">
                      <div className="h-8 w-20 bg-gray-300 dark:bg-gray-600 rounded"></div>
                      <div className="h-8 w-16 bg-gray-300 dark:bg-gray-600 rounded"></div>
                    </div>
                  </div>
                ))
              ) : partners.length > 0 ? (
                partners.map((partner, index) => (
                  <PartnerCard
                    key={partner._id}
                    partner={partner}
                    onConnect={handleConnect}
                    onCancelRequest={handleCancelRequest}
                    onProfileClick={handleProfileClick}
                    index={index}
                    tabType="find"
                  />
                ))
              ) : (
                <div className="col-span-full text-center py-12">
                  <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">
                    No partners found
                  </h3>
                  <p className="text-gray-500 dark:text-gray-500">
                    Try adjusting your search or filter criteria
                  </p>
                </div>
              )}
            </div>

            {/* Pagination */}
            {!loading && partners.length > 0 && pagination.totalPages > 1 && (
              <div className="flex justify-center mt-8">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage - 1 }))}
                    disabled={!pagination.hasPrev}
                    className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="px-4 py-2 text-gray-600 dark:text-gray-400">
                    Page {pagination.currentPage} of {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage + 1 }))}
                    disabled={!pagination.hasNext}
                    className="px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Active Partners Tab - Shows only connected partners */}
        {activeTab === "active" && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {partners.length > 0 ? (
              partners.map((partner, index) => (
                <PartnerCard
                  key={partner._id}
                  partner={partner}
                  onConnect={handleConnect}
                  onCancelRequest={handleCancelRequest}
                  onProfileClick={handleProfileClick}
                  index={index}
                  tabType="active"
                />
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <Users className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">
                  No active partners
                </h3>
                <p className="text-gray-500 dark:text-gray-500">
                  Start connecting with partners to see them here
                </p>
              </div>
            )}
          </div>
        )}

        {/* Pending Requests Tab - Shows only incoming requests that need acceptance */}
        {activeTab === "pending" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {partners.length > 0 ? (
              partners.map((partner, index) => (
                <PartnerCard
                  key={partner._id}
                  partner={partner}
                  onConnect={handleAcceptRequest}
                  onCancelRequest={handleRejectRequest}
                  onProfileClick={handleProfileClick}
                  index={index}
                  tabType="pending"
                />
              ))
            ) : (
              <div className="col-span-full text-center py-12">
                <UserPlus className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 dark:text-gray-400 mb-2">
                  No pending requests
                </h3>
                <p className="text-gray-500 dark:text-gray-500">
                  You don't have any pending connection requests to review
                </p>
              </div>
            )}
          </div>
        )}
      </main>

    </div>
  );
};

export default FindPartners;
