import React, { useState, useEffect } from "react";
import { leaderboardAPI } from "../utils/api";
import { useSnackbar } from "notistack";
import { motion, AnimatePresence } from "framer-motion";
import { useSocket } from "../hooks/useSocket";
import { getAvatarSrc } from "../utils/avatarUtils";
import BackButton from "../components/BackButton";
import { 
  Trophy, 
  User, 
  Target, 
  Flame, 
  CheckCircle, 
  Users, 
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  Filter,
  Award,
  Crown,
  Star,
  Zap
} from "lucide-react";

const Leaderboard = () => {
  const [leaders, setLeaders] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState('streak');
  const [selectedFilter, setSelectedFilter] = useState('thisWeek');
  const [customDateRange, setCustomDateRange] = useState({ start: '', end: '' });
  const [showCustomDate, setShowCustomDate] = useState(false);
  const [lastUpdate, setLastUpdate] = useState(null);
  const { enqueueSnackbar } = useSnackbar();
  const socket = useSocket();

  // Debug function to check user data
  const debugUserData = async () => {
    try {
      const response = await fetch('/api/leaderboard/debug/current', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      const data = await response.json();
      console.log('Debug user data:', data);
      enqueueSnackbar(`Debug data logged to console`, { variant: "info" });
    } catch (error) {
      console.error('Debug error:', error);
    }
  };

  const metrics = [
    { id: 'streak', name: 'Streak', icon: Flame, color: 'text-orange-500' },
    { id: 'checkins', name: 'Check-ins', icon: CheckCircle, color: 'text-blue-500' },
    { id: 'goals', name: 'Goals Achieved', icon: Target, color: 'text-green-500' }
  ];

  const dateFilters = [
    { id: 'thisWeek', name: 'This Week' },
    { id: 'lastWeek', name: 'Last Week' },
    { id: 'lastMonth', name: 'Last Month' },
    { id: 'custom', name: 'Custom Range' }
  ];

  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const params = {
        metric: selectedMetric,
        filter: selectedFilter,
        partnersOnly: 'true'
      };

      if (selectedFilter === 'custom' && customDateRange.start && customDateRange.end) {
        params.startDate = customDateRange.start;
        params.endDate = customDateRange.end;
      }

      console.log('Fetching leaderboard with params:', params);
      const res = await leaderboardAPI.getLeaderboard(params);
      console.log('Leaderboard response:', res.data);
      console.log('Leaders data:', res.data.leaders);
      console.log('Current user data:', res.data.currentUser);
      
      setLeaders(res.data.leaders || []);
      setCurrentUser(res.data.currentUser || null);
    } catch (error) {
      console.error('Leaderboard fetch error:', error);
      enqueueSnackbar("Failed to fetch leaderboard", { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [selectedMetric, selectedFilter, customDateRange]);

  // Real-time updates
  useEffect(() => {
    if (!socket) return;

    const handleLeaderboardUpdate = (data) => {
      setLastUpdate(new Date());
      // Refresh leaderboard if it's the same metric/filter
      if (data.metric === selectedMetric && data.filter === selectedFilter) {
        fetchLeaderboard();
      }
    };

    const handleLeaderboardActivity = (data) => {
      setLastUpdate(new Date());
      // Refresh leaderboard when user activity affects rankings
      fetchLeaderboard();
    };

    socket.on('leaderboard_updated', handleLeaderboardUpdate);
    socket.on('leaderboard_activity', handleLeaderboardActivity);

    return () => {
      socket.off('leaderboard_updated', handleLeaderboardUpdate);
      socket.off('leaderboard_activity', handleLeaderboardActivity);
    };
  }, [socket, selectedMetric, selectedFilter]);

  const getRankChangeIcon = (rankChange) => {
    if (rankChange > 0) return <TrendingUp className="w-4 h-4 text-green-500" />;
    if (rankChange < 0) return <TrendingDown className="w-4 h-4 text-red-500" />;
    return <Minus className="w-4 h-4 text-gray-400" />;
  };

  const getRankChangeText = (rankChange) => {
    if (rankChange > 0) return `+${rankChange}`;
    if (rankChange < 0) return `${rankChange}`;
    return '0';
  };

  const getMetricIcon = (metric) => {
    const metricConfig = metrics.find(m => m.id === metric);
    return metricConfig ? metricConfig.icon : Trophy;
  };

  const getMetricColor = (metric) => {
    const metricConfig = metrics.find(m => m.id === metric);
    return metricConfig ? metricConfig.color : 'text-yellow-500';
  };

  const getBadgeColor = (color) => {
    switch (color) {
      case 'gold': return 'bg-gradient-to-r from-yellow-400 to-yellow-600';
      case 'silver': return 'bg-gradient-to-r from-gray-300 to-gray-500';
      case 'bronze': return 'bg-gradient-to-r from-orange-400 to-orange-600';
      default: return 'bg-gray-500';
    }
  };

  const getRankIcon = (rank) => {
    if (rank === 1) return <Crown className="w-5 h-5 text-yellow-500" />;
    if (rank === 2) return <Award className="w-5 h-5 text-gray-400" />;
    if (rank === 3) return <Award className="w-5 h-5 text-orange-500" />;
    return <span className="text-sm font-bold">#{rank}</span>;
  };

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6 sm:mb-8"
        >
          <div className="flex items-start sm:items-center gap-3 sm:gap-4">
            <div className="sm:hidden mt-1">
              <BackButton />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <div className="hidden sm:block">
                  <BackButton />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-black mb-1 sm:mb-2">
                    Leaderboard
                  </h1>
                  <p className="text-sm sm:text-base text-gray-600">
                    See how you rank among the fitness community
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Current User Banner */}
        {currentUser && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="text-white rounded-xl sm:rounded-2xl shadow-lg sm:shadow-xl p-4 sm:p-6 mb-6 sm:mb-8 relative overflow-hidden"
            style={{background: 'linear-gradient(135deg, #0046ff 0%, #0038cc 100%)'}}
          >
            <div className="flex items-center gap-3 sm:gap-4 md:gap-6">
              <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-white/20 rounded-full flex-shrink-0 flex items-center justify-center text-lg sm:text-xl md:text-2xl font-bold">
                #{currentUser.rank}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-base sm:text-lg md:text-xl font-bold mb-0.5 sm:mb-1 truncate">Your Current Rank</h2>
                <p className="text-xs sm:text-sm opacity-90 capitalize truncate">
                  {selectedMetric === 'streak' ? 'Streak' : selectedMetric === 'goals' ? 'Goals Achieved' : 'Check-ins'} • 
                  {selectedFilter === 'thisWeek' ? 'This week' : 
                   selectedFilter === 'lastWeek' ? 'Last week' : 
                   selectedFilter === 'lastMonth' ? 'Last month' : 'Custom range'}
                </p>
              </div>
              <div className="text-right flex-shrink-0">
                <div className="text-lg sm:text-xl md:text-2xl font-bold whitespace-nowrap">
                  {currentUser.metricValue} 
                  <span className="text-sm sm:text-base opacity-90">
                    {selectedMetric === 'streak' ? ' days' : 
                     selectedMetric === 'goals' ? ' goals' : 
                     selectedMetric === 'checkins' ? ' check-ins' : ''}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Metric Tabs and Filters */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="mb-6"
        >
          <div className="flex flex-col sm:flex-row gap-3 mb-3">
            {/* Metric Tabs */}
            <div className="flex flex-wrap gap-2 overflow-x-auto pb-1 -mx-1 px-1">
              {metrics.map((metric) => {
                const Icon = metric.icon;
                const isActive = selectedMetric === metric.id;
                return (
                  <button
                    key={metric.id}
                    onClick={() => setSelectedMetric(metric.id)}
                    className={`px-3 py-1.5 sm:py-2 rounded-lg transition-all duration-200 flex items-center gap-1.5 text-sm font-medium whitespace-nowrap ${
                      isActive
                        ? 'text-white shadow-sm'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700'
                    }`}
                    style={isActive ? {backgroundColor: '#0046ff'} : {}}
                    aria-pressed={isActive}
                  >
                    <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                    <span>{metric.name}</span>
                  </button>
                );
              })}
            </div>
            
            {/* Time Period Dropdown */}
            <div className="flex items-center gap-2 mt-1 sm:mt-0 sm:ml-auto">
              <button
                onClick={debugUserData}
                className="hidden sm:inline-flex items-center px-2.5 py-1.5 border border-gray-200 rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
                title="Debug data"
              >
                <span className="hidden sm:inline">Debug</span>
              </button>
              <select
                value={selectedFilter}
                onChange={(e) => {
                  setSelectedFilter(e.target.value);
                  setShowCustomDate(e.target.value === 'custom');
                }}
                className="flex-1 sm:flex-none bg-white text-black border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                aria-label="Select time period"
              >
                {dateFilters.map((filter) => (
                  <option key={filter.id} value={filter.id}>
                    {filter.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </motion.div>

        {/* Custom Date Range */}
        <AnimatePresence>
          {showCustomDate && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: '1.5rem' }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700"
            >
              <div className="p-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={customDateRange.start}
                      onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                      className="w-full p-2 sm:p-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-black dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-300 mb-1.5">
                      End Date
                    </label>
                    <input
                      type="date"
                      value={customDateRange.end}
                      onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                      className="w-full p-2 sm:p-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-black dark:text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Leaderboard Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-200 dark:border-gray-700"
        >
          <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-base sm:text-lg font-semibold text-black dark:text-white">
              Top Performers - {selectedMetric === 'streak' ? 'Streak' : selectedMetric === 'goals' ? 'Goals Achieved' : 'Check-ins'}
            </h3>
          </div>

          {loading ? (
            <div className="p-6 sm:p-8 text-center">
              <div className="animate-spin rounded-full h-7 w-7 border-b-2 mx-auto" style={{borderColor: '#0046ff'}}></div>
              <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm sm:text-base">Loading leaderboard...</p>
            </div>
          ) : !leaders || leaders.length === 0 ? (
            <div className="p-6 sm:p-8 text-center text-gray-600 dark:text-gray-400">
              <Trophy className="w-10 h-10 sm:w-12 sm:h-12 mx-auto mb-3 sm:mb-4 opacity-50" />
              <p className="text-sm sm:text-base">No leaderboard data available</p>
              <p className="text-xs sm:text-sm mt-1.5 text-gray-500 dark:text-gray-500">
                Start completing goals and check-ins to appear on the leaderboard!
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {leaders.map((leader, idx) => {
                const isCurrentUser = currentUser && leader._id === currentUser._id;
                const rank = idx + 1;
                const isTop3 = rank <= 3;
                
                // Mock titles for demonstration
                const titles = ['Yoga Master', 'Cycling PRO', 'Running Expert', 'Strength Coach', 'Fitness Newbie', 'Rising Star'];
                const title = titles[idx] || 'Fitness Enthusiast';
                
                return (
                  <motion.div
                    key={leader._id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: idx * 0.03 }}
                    className={`p-3 sm:p-4 md:p-5 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                      isCurrentUser ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* Rank Badge */}
                      <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs sm:text-sm font-bold ${
                        isTop3 
                          ? rank === 1 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' 
                            : rank === 2 ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' 
                            : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {isTop3 ? (
                          <span className="text-base sm:text-lg">
                            {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
                          </span>
                        ) : (
                          `#${rank}`
                        )}
                      </div>
                      
                      {/* Profile Picture */}
                      <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full flex-shrink-0 relative">
                        <div className="absolute inset-0 rounded-full overflow-hidden shadow-sm">
                          <img 
                            src={getAvatarSrc(leader.avatar, leader.username)} 
                            alt={leader.username}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = `https://ui-avatars.com/api/?name=${encodeURIComponent(leader.username || 'U')}&background=0046ff&color=fff`;
                            }}
                          />
                        </div>
                        {isCurrentUser && (
                          <div className="absolute -bottom-1 -right-1 bg-blue-600 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white dark:border-gray-800">
                            YOU
                          </div>
                        )}
                      </div>
                      
                      {/* User Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-semibold text-black dark:text-white text-sm sm:text-base truncate">
                            {leader.firstName && leader.lastName 
                              ? `${leader.firstName} ${leader.lastName}`
                              : leader.username || 'Anonymous'
                            }
                          </h4>
                          {isTop3 && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                              rank === 1 ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' 
                                : rank === 2 ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' 
                                : 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400'
                            }`}>
                              {rank === 1 ? '🥇' : rank === 2 ? '🥈' : '🥉'}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{title}</p>
                          
                          {/* Rank Change - Mobile */}
                          <div className="sm:hidden flex items-center">
                            {leader.rankChange > 0 ? (
                              <div className="flex items-center text-green-600 dark:text-green-400">
                                <TrendingUp className="w-3 h-3" />
                                <span className="text-xs font-medium ml-0.5">+{leader.rankChange}</span>
                              </div>
                            ) : leader.rankChange < 0 ? (
                              <div className="flex items-center text-red-600 dark:text-red-400">
                                <TrendingDown className="w-3 h-3" />
                                <span className="text-xs font-medium ml-0.5">{leader.rankChange}</span>
                              </div>
                            ) : (
                              <div className="flex items-center text-gray-400">
                                <Minus className="w-3 h-3" />
                                <span className="text-xs ml-0.5">0</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Metric Value */}
                      <div className="flex items-center gap-3 ml-2">
                        <div className="text-right">
                          <div className="text-base sm:text-lg font-bold text-black dark:text-white whitespace-nowrap">
                            {leader.metricValue}
                            <span className="text-xs sm:text-sm font-normal text-gray-500 dark:text-gray-400 ml-1">
                              {selectedMetric === 'streak' ? 'days' : 
                               selectedMetric === 'goals' ? 'goals' : 
                               selectedMetric === 'checkins' ? 'check-ins' : ''}
                            </span>
                          </div>
                          
                          {/* Rank Change - Desktop */}
                          <div className="hidden sm:flex items-center justify-end mt-0.5">
                            {leader.rankChange > 0 ? (
                              <div className="flex items-center text-green-600 dark:text-green-400">
                                <TrendingUp className="w-3 h-3" />
                                <span className="text-xs font-medium ml-0.5">+{leader.rankChange}</span>
                              </div>
                            ) : leader.rankChange < 0 ? (
                              <div className="flex items-center text-red-600 dark:text-red-400">
                                <TrendingDown className="w-3 h-3" />
                                <span className="text-xs font-medium ml-0.5">{leader.rankChange}</span>
                              </div>
                            ) : (
                              <div className="flex items-center text-gray-400">
                                <Minus className="w-3 h-3" />
                                <span className="text-xs ml-0.5">0</span>
                              </div>
                            )}
                          </div>
                        </div>
                        
                        {/* Current User Badge - Mobile */}
                        {isCurrentUser && (
                          <div className="sm:hidden w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-white text-[10px] font-bold">
                            ✓
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Achievement Badges Section */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.4 }}
          className="mt-6 sm:mt-8"
        >
          <h3 className="text-base sm:text-lg font-semibold text-black dark:text-white mb-3 sm:mb-4">Achievement Badges</h3>
          <div className="grid grid-cols-3 sm:grid-cols-3 gap-2 sm:gap-3">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4 text-center border border-gray-200 dark:border-gray-700 hover:shadow-sm transition-shadow">
              <div className="text-2xl sm:text-3xl mb-1.5 sm:mb-2">🔥</div>
              <h4 className="font-semibold text-black dark:text-white text-xs sm:text-sm mb-0.5">Streak Master</h4>
              <p className="text-gray-500 dark:text-gray-400 text-[10px] sm:text-xs">30+ day streak</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4 text-center border border-gray-200 dark:border-gray-700 hover:shadow-sm transition-shadow">
              <div className="text-2xl sm:text-3xl mb-1.5 sm:mb-2">🎯</div>
              <h4 className="font-semibold text-black dark:text-white text-xs sm:text-sm mb-0.5">Goal Crusher</h4>
              <p className="text-gray-500 dark:text-gray-400 text-[10px] sm:text-xs">10+ goals achieved</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg p-3 sm:p-4 text-center border border-gray-200 dark:border-gray-700 hover:shadow-sm transition-shadow">
              <div className="text-2xl sm:text-3xl mb-1.5 sm:mb-2">👑</div>
              <h4 className="font-semibold text-black dark:text-white text-xs sm:text-sm mb-0.5">Consistency King</h4>
              <p className="text-gray-500 dark:text-gray-400 text-[10px] sm:text-xs">100+ check-ins</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Leaderboard;
