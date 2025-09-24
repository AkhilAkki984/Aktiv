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
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-8"
        >
          <div className="flex items-center gap-4 mb-4">
            <BackButton />
            <div>
              <h1 className="text-3xl font-bold text-black mb-2">
                Leaderboard
              </h1>
              <p className="text-gray-600">
                See how you rank among the fitness community
              </p>
            </div>
          </div>
        </motion.div>

        {/* Current User Banner */}
        {currentUser && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-white rounded-2xl shadow-xl p-6 mb-8 relative overflow-hidden"
            style={{background: 'linear-gradient(135deg, #0046ff 0%, #0038cc 100%)'}}
          >
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-2xl font-bold">
                #{currentUser.rank}
              </div>
              <div className="flex-1">
                <h2 className="text-xl font-bold mb-1">Your Current Rank</h2>
                <p className="text-sm opacity-90 capitalize">
                  {selectedMetric === 'streak' ? 'Streak' : selectedMetric === 'goals' ? 'Goals Achieved' : 'Check-ins'} • This week
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold">
                  {currentUser.metricValue} {selectedMetric === 'streak' ? 'days' : selectedMetric === 'goals' ? 'goals' : selectedMetric === 'checkins' ? 'check-ins' : ''}
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Metric Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="flex gap-2 mb-6"
        >
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <button
                key={metric.id}
                onClick={() => setSelectedMetric(metric.id)}
                className={`px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2 ${
                  selectedMetric === metric.id
                    ? 'text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
                style={selectedMetric === metric.id ? {backgroundColor: '#0046ff'} : {}}
              >
                <Icon className="w-4 h-4" />
                <span className="text-sm font-medium">{metric.name}</span>
              </button>
            );
          })}
          
          {/* Time Period Dropdown */}
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={debugUserData}
              className="px-3 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200"
            >
              Debug Data
            </button>
            <select
              value={selectedFilter}
              onChange={(e) => {
                setSelectedFilter(e.target.value);
                setShowCustomDate(e.target.value === 'custom');
              }}
              className="bg-white text-black border border-gray-200 rounded-lg px-3 py-2 text-sm"
            >
              {dateFilters.map((filter) => (
                <option key={filter.id} value={filter.id}>
                  {filter.name}
                </option>
              ))}
            </select>
          </div>
        </motion.div>

        {/* Custom Date Range */}
        <AnimatePresence>
          {showCustomDate && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 bg-gray-50 rounded-lg p-4 border border-gray-200"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={customDateRange.start}
                    onChange={(e) => setCustomDateRange(prev => ({ ...prev, start: e.target.value }))}
                    className="w-full p-3 border border-gray-200 rounded-lg bg-white text-black"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-2">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={customDateRange.end}
                    onChange={(e) => setCustomDateRange(prev => ({ ...prev, end: e.target.value }))}
                    className="w-full p-3 border border-gray-200 rounded-lg bg-white text-black"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Leaderboard Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-200"
        >
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-black">
              Top Performers - {selectedMetric === 'streak' ? 'Streak' : selectedMetric === 'goals' ? 'Goals Achieved' : 'Check-ins'}
            </h3>
          </div>

          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 mx-auto" style={{borderColor: '#0046ff'}}></div>
              <p className="text-gray-600 mt-2">Loading leaderboard...</p>
            </div>
          ) : !leaders || leaders.length === 0 ? (
            <div className="p-8 text-center text-gray-600">
              <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No leaderboard data available</p>
              <p className="text-sm mt-2">Start completing goals and check-ins to appear on the leaderboard!</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {leaders.map((leader, idx) => {
                const isCurrentUser = currentUser && leader._id === currentUser._id;
                const rank = idx + 1;
                
                // Mock titles for demonstration
                const titles = ['Yoga Master', 'Cycling PRO', 'Running Expert', 'Strength Coach', 'Fitness Newbie', 'Rising Star'];
                const title = titles[idx] || 'Fitness Enthusiast';
                
                return (
                  <motion.div
                    key={leader._id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    className={`p-6 flex items-center justify-between hover:bg-gray-50 transition-colors ${
                      isCurrentUser ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex items-center gap-4 flex-1">
                      {/* Rank Circle */}
                      <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center text-sm font-bold text-black">
                        {rank}
                      </div>
                      
                      {/* Profile Picture */}
                      <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold shadow-lg"
                           style={{background: 'linear-gradient(135deg, #0046ff 0%, #0038cc 100%)'}}>
                        <img 
                          src={getAvatarSrc(leader.avatar, leader.username)} 
                          alt={leader.username}
                          className="w-12 h-12 rounded-full object-cover"
                        />
                      </div>
                      
                      {/* User Info */}
                      <div className="flex-1">
                        <h4 className="font-semibold text-black text-lg">
                          {leader.firstName && leader.lastName 
                            ? `${leader.firstName} ${leader.lastName}`
                            : leader.username
                          }
                        </h4>
                        <p className="text-gray-600 text-sm">{title}</p>
                      </div>
                      
                      {/* Metric Value */}
                      <div className="text-right">
                        <div className="text-lg font-bold text-black">
                          {leader.metricValue} {selectedMetric === 'streak' ? 'days' : selectedMetric === 'goals' ? 'goals' : selectedMetric === 'checkins' ? 'check-ins' : ''}
                        </div>
                      </div>
                      
                      {/* Rank Change */}
                      <div className="flex items-center gap-1">
                        {leader.rankChange > 0 ? (
                          <div className="flex items-center gap-1 text-green-600">
                            <TrendingUp className="w-4 h-4" />
                            <span className="text-sm">+{leader.rankChange}</span>
                          </div>
                        ) : leader.rankChange < 0 ? (
                          <div className="flex items-center gap-1 text-red-600">
                            <TrendingDown className="w-4 h-4" />
                            <span className="text-sm">{leader.rankChange}</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-gray-400">
                            <Minus className="w-4 h-4" />
                            <span className="text-sm">0</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Current User Badge */}
                      {isCurrentUser && (
                        <span className="text-white px-3 py-1 rounded-full text-sm font-medium"
                              style={{backgroundColor: '#0046ff'}}>
                          You
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </motion.div>

        {/* Achievement Badges Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.6 }}
          className="mt-8"
        >
          <h3 className="text-lg font-semibold text-black mb-4">Achievement Badges</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white rounded-lg p-4 text-center border border-gray-200">
              <div className="text-2xl mb-2">🔥</div>
              <h4 className="font-semibold text-black text-sm">Streak Master</h4>
              <p className="text-gray-600 text-xs">30+ day streak</p>
            </div>
            <div className="bg-white rounded-lg p-4 text-center border border-gray-200">
              <div className="text-2xl mb-2">🎯</div>
              <h4 className="font-semibold text-black text-sm">Goal Crusher</h4>
              <p className="text-gray-600 text-xs">10+ goals achieved</p>
            </div>
            <div className="bg-white rounded-lg p-4 text-center border border-gray-200">
              <div className="text-2xl mb-2">👑</div>
              <h4 className="font-semibold text-black text-sm">Consistency King</h4>
              <p className="text-gray-600 text-xs">100+ check-ins</p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Leaderboard;
