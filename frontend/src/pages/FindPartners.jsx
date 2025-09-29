import React, { useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ThemeContext } from "../context/ThemeContext.jsx";
import { AuthContext } from "../context/AuthContext.jsx";
import { partnersAPI } from "../utils/api.js";
import { useSnackbar } from "notistack";
import { getAvatarSrc } from "../utils/avatarUtils";
import BackButton from "../components/BackButton";
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
  UserPlus,
  Menu,
  X,
  Filter,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import PartnerCard from "../components/PartnerCard.jsx";

const FindPartners = () => {
  const navigate = useNavigate();
  const { mode, toggleMode } = useContext(ThemeContext);
  const { user, logout } = useContext(AuthContext);
  const { enqueueSnackbar } = useSnackbar();

  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("find");
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [counts, setCounts] = useState({
    availableCount: 0,
    pendingCount: 0,
    sentCount: 0,
    totalCount: 0
  });
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
      const response = await partnersAPI.getPartnerCounts();
      
      if (response.data && typeof response.data === 'object') {
        setCounts({
          availableCount: response.data.availableCount || 0,
          pendingCount: response.data.pendingCount || 0,
          sentCount: response.data.sentCount || 0,
          totalCount: response.data.totalCount || 0
        });
      }
    } catch (err) {
      console.error('Failed to fetch partner counts:', err);
      setCounts({
        availableCount: 0,
        pendingCount: 0,
        sentCount: 0,
        totalCount: 0
      });
    }
  };

  useEffect(() => {
    fetchCounts();
  }, []);

  // Fetch partners data based on active tab
  useEffect(() => {
    const fetchPartners = async () => {
      try {
        setLoading(true);
        
        const params = {
          page: pagination.currentPage,
          limit: 12
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
          case 'sent':
            response = await partnersAPI.getSentPartners(params);
            break;
          default:
            response = await partnersAPI.getAvailablePartners(params);
        }
        
        if (response.data && response.data.partners) {
          setPartners(response.data.partners);
          setPagination(response.data.pagination || {
            currentPage: 1,
            totalPages: 1,
            totalCount: 0,
            hasNext: false,
            hasPrev: false
          });
        } else {
          setPartners([]);
        }
      } catch (err) {
        console.error('Failed to fetch partners:', err);
        const errorMessage = err.response?.data?.msg || 'Failed to load partners';
        enqueueSnackbar(errorMessage, { variant: 'error' });
        setPartners([]);
      } finally {
        setLoading(false);
      }
    };

    fetchPartners();
  }, [activeTab, searchQuery, filterType, pagination.currentPage, enqueueSnackbar]);

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const handleFilterChange = (type) => {
    setFilterType(type);
    setPagination(prev => ({ ...prev, currentPage: 1 }));
    setMobileFilterOpen(false);
  };

  const handleConnect = async (partnerId) => {
    try {
      const response = await partnersAPI.connect(partnerId, { message: '' });
      enqueueSnackbar('Connection request sent!', { variant: 'success' });
      
      if (activeTab === 'find') {
        setPartners(prev => prev.filter(partner => partner._id !== partnerId));
        setCounts(prev => ({
          ...prev,
          availableCount: Math.max(0, prev.availableCount - 1),
          sentCount: (prev.sentCount || 0) + 1
        }));
      }
      
      await fetchCounts();
    } catch (err) {
      console.error('Connection error:', err);
      enqueueSnackbar(err.response?.data?.msg || 'Failed to send connection request', { variant: 'error' });
    }
  };

  const handleCancelRequest = async (connectionId) => {
    try {
      await partnersAPI.cancelRequest(connectionId);
      enqueueSnackbar('Connection request cancelled', { variant: 'info' });
      
      if (activeTab === 'sent') {
        setPartners(prev => prev.filter(partner => 
          partner.connectionStatus?.connectionId !== connectionId
        ));
        setCounts(prev => ({
          ...prev,
          sentCount: Math.max(0, (prev.sentCount || 0) - 1)
        }));
      }
      
      await fetchCounts();
    } catch (err) {
      console.error('Cancel request error:', err);
      enqueueSnackbar(err.response?.data?.msg || 'Failed to cancel request', { variant: 'error' });
    }
  };

  const handleAcceptRequest = async (connectionId) => {
    try {
      await partnersAPI.acceptRequest(connectionId);
      enqueueSnackbar('Connection request accepted!', { variant: 'success' });
      setPartners(prev => prev.filter(partner => 
        partner.connectionStatus?.connectionId !== connectionId
      ));
      setCounts(prev => ({
        ...prev,
        pendingCount: Math.max(0, (prev.pendingCount || 0) - 1)
      }));
      await fetchCounts();
    } catch (err) {
      console.error('Accept request error:', err);
      enqueueSnackbar(err.response?.data?.msg || 'Failed to accept request', { variant: 'error' });
    }
  };

  const handleRejectRequest = async (connectionId) => {
    try {
      await partnersAPI.rejectRequest(connectionId);
      enqueueSnackbar('Connection request rejected', { variant: 'info' });
      setPartners(prev => prev.filter(partner => 
        partner.connectionStatus?.connectionId !== connectionId
      ));
      setCounts(prev => ({
        ...prev,
        pendingCount: Math.max(0, (prev.pendingCount || 0) - 1)
      }));
      await fetchCounts();
    } catch (err) {
      console.error('Reject request error:', err);
      enqueueSnackbar(err.response?.data?.msg || 'Failed to reject request', { variant: 'error' });
    }
  };

  const handleProfileClick = (partnerId) => {
    navigate(`/profile/${partnerId}`);
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Find Your Partners
          </h2>
          <p className="text-gray-600 mb-6">
            Please log in to connect with fitness partners and achieve your goals together.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Sign In to Continue
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Enhanced Navbar */}
      <header className="sticky top-0 z-50 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Back Button */}
            <div className="flex items-center space-x-4">
              <BackButton />
              <div 
                onClick={() => navigate("/dashboard")}
                className="flex items-center space-x-3 cursor-pointer"
              >
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-md">
                  <span className="text-white font-bold text-lg">A</span>
                </div>
                <span className="text-xl font-bold text-gray-900 hidden sm:block">Aktiv</span>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              {[
                { name: 'Dashboard', path: '/dashboard' },
                { name: 'Goals', path: '/goals' },
                { name: 'Partners', path: '/find-partners', active: true },
                { name: 'Chat', path: '/chat' },
                { name: 'Feed', path: '/feed' },
                { name: 'Leaderboard', path: '/leaderboard' }
              ].map((item) => (
                <button
                  key={item.name}
                  onClick={() => navigate(item.path)}
                  className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    item.active 
                      ? 'text-blue-600 bg-blue-50' 
                      : 'text-gray-700 hover:text-blue-600'
                  }`}
                >
                  {item.name}
                </button>
              ))}
            </nav>

            {/* Right Side Actions */}
            <div className="flex items-center space-x-4">
              {/* Pending Requests Badge */}
              <button
                onClick={() => setActiveTab("pending")}
                className="relative p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
                title="Pending Requests"
              >
                <UserPlus size={20} />
                {(counts.pendingCount || 0) > 0 && (
                  <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                    {counts.pendingCount > 9 ? '9+' : counts.pendingCount}
                  </span>
                )}
              </button>

              {/* Theme Toggle */}
              <button
                onClick={toggleMode}
                className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
                aria-label="Toggle theme"
              >
                {mode === "light" ? <Moon size={20} /> : <Sun size={20} />}
              </button>

              {/* Notifications */}
              <button className="p-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors relative">
                <Bell size={20} />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              {/* Profile Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <img
                    src={getAvatarSrc(user?.avatar, user?.username)}
                    alt="Profile"
                    className="w-8 h-8 rounded-full border border-gray-300"
                  />
                  <span className="text-sm font-medium text-gray-700 hidden sm:block">
                    {user?.username}
                  </span>
                  <ChevronDown size={16} className="text-gray-500" />
                </button>

                <AnimatePresence>
                  {menuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50"
                    >
                      <button
                        onClick={() => { navigate("/profile"); setMenuOpen(false); }}
                        className="flex items-center space-x-3 w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <Edit3 size={16} />
                        <span>Edit Profile</span>
                      </button>
                      <button
                        onClick={handleLogout}
                        className="flex items-center space-x-3 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                      >
                        <LogOut size={16} />
                        <span>Sign Out</span>
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileNavOpen(!mobileNavOpen)}
                className="md:hidden p-2 rounded-lg text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              >
                {mobileNavOpen ? <X size={24} /> : <Menu size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <AnimatePresence>
          {mobileNavOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden bg-white border-t border-gray-200"
            >
              <div className="px-4 py-3 space-y-1">
                {[
                  { name: 'Dashboard', path: '/dashboard' },
                  { name: 'Goals', path: '/goals' },
                  { name: 'Partners', path: '/find-partners' },
                  { name: 'Chat', path: '/chat' },
                  { name: 'Feed', path: '/feed' },
                  { name: 'Leaderboard', path: '/leaderboard' }
                ].map((item) => (
                  <button
                    key={item.name}
                    onClick={() => { navigate(item.path); setMobileNavOpen(false); }}
                    className="block w-full text-left px-3 py-2 text-base font-medium text-gray-700 hover:text-blue-600 hover:bg-gray-50 rounded-md transition-colors"
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header Section */}
        <div className="mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center sm:text-left"
          >
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
              Find Your Fitness Partners
            </h1>
            <p className="text-gray-600">
              Connect with like-minded people to achieve your goals together
            </p>
          </motion.div>

          {/* Tab Navigation */}
          <div className="mt-6 border-b border-gray-200">
            <div className="flex space-x-8 overflow-x-auto scrollbar-hide -mb-px">
              {[
                { key: 'find', label: 'Find Partners', count: counts.availableCount },
                { key: 'pending', label: 'Pending Requests', count: counts.pendingCount },
                { key: 'sent', label: 'Sent Invitations', count: counts.sentCount }
              ].map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center space-x-2 pb-3 px-1 font-medium text-sm whitespace-nowrap transition-colors border-b-2 ${
                    activeTab === tab.key
                      ? 'text-blue-600 border-blue-600'
                      : 'text-gray-500 hover:text-gray-700 border-transparent'
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.count > 0 && (
                    <span className={`px-2 py-1 rounded-full text-xs ${
                      activeTab === tab.key ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Search and Filter Section - Only for Find Partners tab */}
        {activeTab === "find" && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
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
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white text-gray-900 placeholder-gray-500"
                />
              </div>

              {/* Desktop Filter Buttons */}
              <div className="hidden lg:flex gap-2">
                {[
                  { key: 'all', label: 'All Partners', icon: Users },
                  { key: 'local', label: 'Local', icon: MapPin },
                  { key: 'virtual', label: 'Virtual', icon: Globe }
                ].map((filter) => (
                  <button
                    key={filter.key}
                    onClick={() => handleFilterChange(filter.key)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-lg font-medium text-sm transition-colors ${
                      filterType === filter.key
                        ? 'bg-blue-600 text-white'
                        : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <filter.icon className="w-4 h-4" />
                    {filter.label}
                  </button>
                ))}
              </div>

              {/* Mobile Filter Button */}
              <button
                onClick={() => setMobileFilterOpen(true)}
                className="lg:hidden flex items-center gap-2 px-4 py-3 rounded-lg font-medium text-sm bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              >
                <Filter className="w-4 h-4" />
                Filter
              </button>
            </div>

            {/* Mobile Filter Modal */}
            <AnimatePresence>
              {mobileFilterOpen && (
                <>
                  <div 
                    className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
                    onClick={() => setMobileFilterOpen(false)}
                  />
                  <motion.div
                    initial={{ opacity: 0, y: 100 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 100 }}
                    className="fixed bottom-0 left-0 right-0 bg-white rounded-t-2xl p-6 z-50 lg:hidden"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-900">Filter Partners</h3>
                      <button
                        onClick={() => setMobileFilterOpen(false)}
                        className="p-2 text-gray-400 hover:text-gray-600"
                      >
                        <X size={20} />
                      </button>
                    </div>
                    <div className="space-y-3">
                      {[
                        { key: 'all', label: 'All Partners', icon: Users },
                        { key: 'local', label: 'Local Partners', icon: MapPin },
                        { key: 'virtual', label: 'Virtual Partners', icon: Globe }
                      ].map((filter) => (
                        <button
                          key={filter.key}
                          onClick={() => handleFilterChange(filter.key)}
                          className={`flex items-center gap-3 w-full p-3 rounded-lg text-left transition-colors ${
                            filterType === filter.key
                              ? 'bg-blue-50 text-blue-600 border border-blue-200'
                              : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <filter.icon className="w-5 h-5" />
                          <span className="font-medium">{filter.label}</span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Content Area */}
        <div>
          {/* Partners Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {Array.from({ length: 8 }).map((_, idx) => (
                <PartnerCardSkeleton key={idx} />
              ))}
            </div>
          ) : partners.length > 0 ? (
            <>
              <div className={`grid grid-cols-1 ${
                activeTab === 'find' 
                  ? 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4' 
                  : 'sm:grid-cols-2 lg:grid-cols-3'
              } gap-4 sm:gap-6`}>
                {partners.map((partner, index) => (
                  <PartnerCard
                    key={partner._id}
                    partner={partner}
                    onConnect={activeTab === 'pending' ? handleAcceptRequest : handleConnect}
                    onCancelRequest={activeTab === 'pending' ? handleRejectRequest : handleCancelRequest}
                    onProfileClick={handleProfileClick}
                    index={index}
                    tabType={activeTab}
                  />
                ))}
              </div>

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div className="flex justify-center mt-8">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage - 1 }))}
                      disabled={!pagination.hasPrev}
                      className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      Previous
                    </button>
                    <span className="px-4 py-2 text-gray-600 text-sm">
                      Page {pagination.currentPage} of {pagination.totalPages}
                    </span>
                    <button
                      onClick={() => setPagination(prev => ({ ...prev, currentPage: prev.currentPage + 1 }))}
                      disabled={!pagination.hasNext}
                      className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <EmptyState 
              tab={activeTab} 
              searchQuery={searchQuery}
              onClearSearch={() => setSearchQuery('')}
            />
          )}
        </div>
      </main>
    </div>
  );
};

// Partner Card Skeleton
const PartnerCardSkeleton = () => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 animate-pulse">
    <div className="p-4 sm:p-6">
      <div className="flex items-center space-x-4 mb-4">
        <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
        <div className="flex-1 space-y-2">
          <div className="h-5 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
      <div className="space-y-3">
        <div className="h-4 bg-gray-200 rounded w-full"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
      </div>
      <div className="flex space-x-2 mt-4">
        <div className="h-9 bg-gray-200 rounded flex-1"></div>
        <div className="h-9 bg-gray-200 rounded w-16"></div>
      </div>
    </div>
  </div>
);

// Empty State Component
const EmptyState = ({ tab, searchQuery, onClearSearch }) => {
  const getEmptyStateConfig = () => {
    const configs = {
      find: {
        icon: <Users className="w-16 h-16 text-gray-400" />,
        title: searchQuery ? "No partners found" : "No partners available",
        description: searchQuery 
          ? "Try adjusting your search criteria or browse all partners"
          : "Check back later for new partners or invite friends to join",
        action: searchQuery ? {
          label: "Clear Search",
          onClick: onClearSearch
        } : null
      },
      pending: {
        icon: <UserPlus className="w-16 h-16 text-gray-400" />,
        title: "No pending requests",
        description: "You don't have any pending connection requests to review"
      },
      sent: {
        icon: <UserPlus className="w-16 h-16 text-gray-400" />,
        title: "No sent invitations",
        description: "You haven't sent any connection requests yet"
      }
    };
    return configs[tab] || configs.find;
  };

  const config = getEmptyStateConfig();

  return (
    <div className="text-center py-12">
      <div className="mx-auto mb-4">{config.icon}</div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        {config.title}
      </h3>
      <p className="text-gray-600 mb-6 max-w-md mx-auto">
        {config.description}
      </p>
      {config.action && (
        <button
          onClick={config.action.onClick}
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
        >
          {config.action.label}
        </button>
      )}
    </div>
  );
};

export default FindPartners;