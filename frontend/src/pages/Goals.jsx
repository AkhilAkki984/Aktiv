import React, { useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ThemeContext } from "../context/ThemeContext.jsx";
import { AuthContext } from "../context/AuthContext.jsx";
import { goalsAPI } from "../utils/api.js";
import { useSnackbar } from "notistack";
import { getAvatarSrc } from "../utils/avatarUtils.js";
import {
  Sun,
  Moon,
  Bell,
  Plus,
  Calendar,
  Clock,
  Edit3,
  ChevronDown,
  LogOut,
  Target,
  CheckCircle,
  Trash2,
  Menu,
  X,
  RefreshCw,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import GoalForm from "../components/GoalForm.jsx";
import BackButton from "../components/BackButton.jsx";

const Goals = () => {
  const navigate = useNavigate();
  const { mode, toggleMode } = useContext(ThemeContext);
  const { user, logout } = useContext(AuthContext);
  const { enqueueSnackbar } = useSnackbar();

  const [menuOpen, setMenuOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
  };

  // Fetch goals data
  const fetchGoals = async () => {
    try {
      setLoading(true);
      const response = await goalsAPI.getGoals();
      
      const activeGoals = response.data
        .filter(goal => goal.status !== 'completed')
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      
      setGoals(activeGoals);
    } catch (err) {
      console.error('Failed to fetch goals:', err);
      enqueueSnackbar('Failed to load goals', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const refreshGoals = async () => {
    setRefreshing(true);
    await fetchGoals();
    setRefreshing(false);
  };

  useEffect(() => {
    fetchGoals();
  }, [enqueueSnackbar]);

  const handleCheckIn = async (goalId, notes = '') => {
    try {
      const tzOffsetMinutes = new Date().getTimezoneOffset();

      // Refetch latest goal to avoid stale state
      const fresh = await goalsAPI.getGoal(goalId);
      const freshGoal = fresh.data;

      // Validate status
      if (freshGoal.status !== 'active') {
        enqueueSnackbar('Cannot check in to inactive goal', { variant: 'warning' });
        return;
      }

      // Validate same-day check-in
      const todayStr = new Date().toDateString();
      const alreadyToday = (freshGoal.checkIns || []).some(
        (ci) => new Date(ci.date).toDateString() === todayStr
      );
      if (alreadyToday) {
        enqueueSnackbar('Already checked in today', { variant: 'info' });
        return;
      }

      const doCheckIn = async () => {
        const { data } = await goalsAPI.checkIn(goalId, {
          notes: notes ?? '',
          tzOffsetMinutes,
        });
        return data;
      };

      let updatedGoal;
      try {
        updatedGoal = await doCheckIn();
      } catch (err) {
        const msg = err?.response?.data?.msg || '';
        if (typeof msg === 'string' && msg.includes('only available')) {
          try {
            await goalsAPI.updateGoal(goalId, { schedule: { ...freshGoal.schedule, time: 'Throughout day' } });
            updatedGoal = await doCheckIn();
          } catch (retryErr) {
            console.error('Retry after relaxing time failed:', retryErr);
            throw retryErr;
          }
        } else {
          throw err;
        }
      }

      const progressPercentage = getProgressPercentage(updatedGoal);
      if (progressPercentage >= 100) {
        await handleCompleteGoal(goalId);
        enqueueSnackbar(updatedGoal?.message || 'Goal completed and checked in! 🎉', { variant: 'success' });
      } else {
        setGoals((prev) => prev.map((g) => (g._id === goalId ? updatedGoal : g)));
        enqueueSnackbar(updatedGoal?.message || 'Check-in successful!', { variant: 'success' });
      }
    } catch (err) {
      console.error('Check-in error:', err);
      const msg = err?.response?.data?.msg || 'Check-in failed';
      enqueueSnackbar(msg, { variant: 'error' });
    }
  };

  const handleEditGoal = (goal) => {
    setEditingGoal(goal);
    setShowGoalForm(true);
  };

  const handleCreateGoal = () => {
    setEditingGoal(null);
    setShowGoalForm(true);
  };

  const handleResumeGoal = async (goalId) => {
    try {
      const response = await goalsAPI.updateGoal(goalId, { status: 'active' });
      const updatedGoal = response.data;
      setGoals(goals.map(goal => goal._id === goalId ? updatedGoal : goal));
      enqueueSnackbar('Goal resumed', { variant: 'success' });
    } catch (err) {
      console.error('Resume goal error:', err);
      enqueueSnackbar(err.response?.data?.msg || 'Failed to resume goal', { variant: 'error' });
    }
  };

  const handleGoalSaved = (savedGoal) => {
    if (editingGoal) {
      if (savedGoal.status === 'completed') {
        setGoals(goals.filter(goal => goal._id !== editingGoal._id));
      } else {
        setGoals(goals.map(goal => goal._id === editingGoal._id ? savedGoal : goal));
      }
    } else {
      setGoals([savedGoal, ...goals]);
    }
    setShowGoalForm(false);
    setEditingGoal(null);
  };

  const handleDeleteGoal = async (goalId) => {
    if (window.confirm('Are you sure you want to delete this goal? This action cannot be undone.')) {
      try {
        await goalsAPI.deleteGoal(goalId);
        setGoals(goals.filter(goal => goal._id !== goalId));
        enqueueSnackbar('Goal deleted successfully', { variant: 'success' });
      } catch (err) {
        console.error('Delete goal error:', err);
        enqueueSnackbar(err.response?.data?.msg || 'Failed to delete goal', { variant: 'error' });
      }
    }
  };

  const handleCompleteGoal = async (goalId) => {
    try {
      const response = await goalsAPI.updateGoal(goalId, { 
        status: 'completed', 
        completedAt: new Date() 
      });
      
      setGoals(goals.filter(goal => goal._id !== goalId));
      enqueueSnackbar('Goal completed successfully! 🎉', { variant: 'success' });
      
      localStorage.setItem('goal_completed', Date.now().toString());
      localStorage.setItem('dashboard_refresh', Date.now().toString());
      
      setTimeout(async () => {
        try {
          const response = await goalsAPI.getGoals();
          const activeGoals = response.data.filter(goal => goal.status !== 'completed');
          setGoals(activeGoals);
        } catch (err) {
          console.error('Failed to refresh goals:', err);
        }
      }, 1000);
    } catch (err) {
      console.error('Complete goal error:', err);
      enqueueSnackbar(err.response?.data?.msg || 'Failed to complete goal', { variant: 'error' });
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'paused': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getProgressPercentage = (goal) => {
    if (goal.progress.targetCheckIns === 0) return 0;
    return Math.round((goal.progress.completedCheckIns / goal.progress.targetCheckIns) * 100);
  };

  const getFrequencyText = (frequency) => {
    switch (frequency) {
      case 'daily': return 'Daily';
      case 'weekdays': return 'Weekdays';
      case 'weekends': return 'Weekends';
      case 'weekly': return 'Weekly';
      case 'monthly': return 'Monthly';
      default: return frequency;
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Target className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-3">
            Access Your Goals
          </h2>
          <p className="text-gray-600 mb-6">
            Please log in to view and manage your goals.
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
                { name: 'Goals', path: '/goals', active: true },
                { name: 'Partners', path: '/find-partners' },
                 { name: 'Chat', path: '/chat/inbox' },
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
                   { name: 'Chat', path: '/chat/inbox' },
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
            className="flex flex-col sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                My Goals
              </h1>
              <p className="text-gray-600 mt-2">
                Track your progress and stay consistent with your daily habits
              </p>
            </div>
            <div className="flex items-center space-x-3 mt-4 sm:mt-0">
              <button
                onClick={refreshGoals}
                disabled={refreshing}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <RefreshCw size={16} className={`mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </button>
              <button
                onClick={handleCreateGoal}
                className="inline-flex items-center px-4 sm:px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm sm:text-base"
              >
                <Plus size={20} className="mr-2" />
                Create Goal
              </button>
            </div>
          </motion.div>
        </div>

        {/* Goals Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {loading ? (
            Array.from({ length: 6 }).map((_, idx) => (
              <GoalCardSkeleton key={idx} />
            ))
          ) : goals.length > 0 ? (
            <>
              {goals
                .filter(goal => goal.status !== 'completed')
                .map((goal, index) => (
                <GoalCard
                  key={goal._id}
                  goal={goal}
                  index={index}
                  onCheckIn={handleCheckIn}
                  onResume={handleResumeGoal}
                  onEdit={handleEditGoal}
                  onDelete={handleDeleteGoal}
                  onComplete={handleCompleteGoal}
                  getStatusColor={getStatusColor}
                  getProgressPercentage={getProgressPercentage}
                  getFrequencyText={getFrequencyText}
                />
              ))}
              <CreateGoalCard onCreateGoal={handleCreateGoal} />
            </>
          ) : (
            <div className="col-span-full text-center py-12">
              <Target className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                No goals yet
              </h3>
              <p className="text-gray-600 mb-6 max-w-md mx-auto">
                Start your journey by creating your first goal. Track your progress and build consistent habits.
              </p>
              <button
                onClick={handleCreateGoal}
                className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                <Plus size={20} className="mr-2" />
                Create Your First Goal
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Goal Form Modal */}
      {showGoalForm && (
        <GoalForm
          goal={editingGoal}
          onSave={handleGoalSaved}
          onClose={() => {
            setShowGoalForm(false);
            setEditingGoal(null);
          }}
        />
      )}
    </div>
  );
};

// Goal Card Component
const GoalCard = ({ goal, index, onCheckIn, onResume, onEdit, onDelete, getStatusColor, getProgressPercentage, getFrequencyText }) => {
  const progressPercentage = getProgressPercentage(goal);
  
  const isCheckedInToday = goal.checkIns && goal.checkIns.some(checkIn => {
    const checkInDate = new Date(checkIn.date);
    const today = new Date();
    return checkInDate.toDateString() === today.toDateString();
  });

  const getTimeWindowStatus = (goal) => {
    const now = new Date();
    const timeString = goal.schedule.time;
    
    if (!timeString || timeString === 'Throughout day') {
      return { canCheckIn: true, message: null };
    }
    
    const timeMatch = timeString.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (!timeMatch) {
      return { canCheckIn: true, message: null };
    }
    
    let hours = parseInt(timeMatch[1]);
    const minutes = parseInt(timeMatch[2]);
    const period = timeMatch[3]?.toUpperCase();
    
    if (period === 'PM' && hours !== 12) hours += 12;
    else if (period === 'AM' && hours === 12) hours = 0;
    
    const startTime = new Date(now);
    startTime.setHours(hours, minutes, 0, 0);
    
    const endTime = new Date(now);
    endTime.setHours(23, 59, 59, 999);
    
    const canCheckIn = now >= startTime && now <= endTime;
    
    if (!canCheckIn) {
      if (now < startTime) {
        const nextTime = startTime.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: true 
        });
        return { 
          canCheckIn: false, 
          message: `Check-in available at ${nextTime}` 
        };
      } else {
        return { 
          canCheckIn: false, 
          message: 'Check-in window closed for today' 
        };
      }
    }
    
    return { canCheckIn: true, message: null };
  };

  const timeWindowStatus = getTimeWindowStatus(goal);
  const canCheckInNow = !isCheckedInToday && timeWindowStatus.canCheckIn;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ y: -2 }}
      className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-all"
    >
      {/* Header */}
      <div className="p-4 sm:p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <h3 className="text-lg font-semibold text-gray-900 mb-2 truncate">
              {goal.title}
            </h3>
            {goal.description && (
              <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                {goal.description}
              </p>
            )}
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(goal.status)}`}>
              {goal.status.charAt(0).toUpperCase() + goal.status.slice(1)}
            </span>
          </div>
          <button
            onClick={() => onDelete(goal._id)}
            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0 ml-2"
            title="Delete goal"
          >
            <Trash2 size={16} />
          </button>
        </div>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>Weekly Progress</span>
            <span className="font-medium">
              {goal.progress.completedCheckIns}/{goal.progress.targetCheckIns} days
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all duration-300 ${
                progressPercentage >= 100 
                  ? 'bg-green-500' 
                  : progressPercentage >= 90 
                  ? 'bg-yellow-500' 
                  : 'bg-blue-500'
              }`}
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          {progressPercentage >= 90 && progressPercentage < 100 && (
            <p className="text-xs text-yellow-600 mt-1">
              Almost there! {100 - progressPercentage}% to completion
            </p>
          )}
          {progressPercentage >= 100 && (
            <p className="text-xs text-green-600 mt-1">
              🎉 Goal completed!
            </p>
          )}
        </div>

        {/* Schedule */}
        <div className="flex items-center space-x-4 text-sm text-gray-600 mb-4">
          <div className="flex items-center space-x-1">
            <Calendar size={16} />
            <span>{getFrequencyText(goal.schedule.frequency)}</span>
          </div>
          <div className="flex items-center space-x-1">
            <Clock size={16} />
            <span>{goal.schedule.time}</span>
          </div>
        </div>

        {/* Time Window Status */}
        {!timeWindowStatus.canCheckIn && !isCheckedInToday && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              ⏰ {timeWindowStatus.message}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex space-x-2">
          {goal.status === 'active' ? (
            <button
              onClick={() => onCheckIn(goal._id)}
              disabled={!canCheckInNow}
              className={`flex-1 py-2 px-3 rounded-lg font-medium text-sm transition-colors ${
                isCheckedInToday
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : !canCheckInNow
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-green-600 text-white hover:bg-green-700'
              }`}
            >
              {isCheckedInToday ? 'Checked In' : !canCheckInNow ? 'Not Available' : 'Check In'}
            </button>
          ) : goal.status === 'paused' ? (
            <button
              onClick={() => onResume(goal._id)}
              className="flex-1 py-2 px-3 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors text-sm"
            >
              Resume
            </button>
          ) : null}
          
          <button
            onClick={() => onEdit(goal)}
            className="py-2 px-3 rounded-lg font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors text-sm"
          >
            Edit
          </button>
        </div>
      </div>
    </motion.div>
  );
};

const GoalCardSkeleton = () => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 animate-pulse">
    <div className="p-4 sm:p-6">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1 space-y-2">
          <div className="h-6 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-5 bg-gray-200 rounded w-20"></div>
        </div>
        <div className="w-8 h-8 bg-gray-200 rounded ml-2"></div>
      </div>
      <div className="space-y-2 mb-4">
        <div className="flex justify-between">
          <div className="h-4 bg-gray-200 rounded w-20"></div>
          <div className="h-4 bg-gray-200 rounded w-16"></div>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2"></div>
      </div>
      <div className="flex space-x-4 mb-4">
        <div className="h-4 bg-gray-200 rounded w-16"></div>
        <div className="h-4 bg-gray-200 rounded w-20"></div>
      </div>
      <div className="flex space-x-2">
        <div className="h-9 bg-gray-200 rounded flex-1"></div>
        <div className="h-9 bg-gray-200 rounded w-16"></div>
      </div>
    </div>
  </div>
);

const CreateGoalCard = ({ onCreateGoal }) => (
  <motion.div
    whileHover={{ scale: 1.02, y: -2 }}
    whileTap={{ scale: 0.98 }}
    onClick={onCreateGoal}
    className="bg-white rounded-xl shadow-sm border-2 border-dashed border-gray-300 hover:border-blue-400 hover:shadow-md transition-all cursor-pointer flex flex-col items-center justify-center p-8 min-h-[200px]"
  >
    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
      <Plus size={24} className="text-blue-600" />
    </div>
    <h3 className="text-lg font-semibold text-gray-900 mb-2 text-center">
      Create New Goal
    </h3>
    <p className="text-sm text-gray-600 text-center">
      Set a new goal and track your progress with daily check-ins
    </p>
  </motion.div>
);

export default Goals;