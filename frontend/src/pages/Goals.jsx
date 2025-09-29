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
  Pause,
  Play,
  BarChart3,
  Trash2,
} from "lucide-react";
import { motion } from "framer-motion";
import GoalForm from "../components/GoalForm.jsx";
import BackButton from "../components/BackButton.jsx";

const Goals = () => {
  const navigate = useNavigate();
  const { mode, toggleMode } = useContext(ThemeContext);
  const { user, logout } = useContext(AuthContext);
  const { enqueueSnackbar } = useSnackbar();

  const [menuOpen, setMenuOpen] = useState(false);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showGoalForm, setShowGoalForm] = useState(false);
  const [editingGoal, setEditingGoal] = useState(null);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
  };

  // Fetch goals data
  useEffect(() => {
    const fetchGoals = async () => {
      try {
        setLoading(true);
        console.log('Fetching goals...');
        const response = await goalsAPI.getGoals();
        console.log('Goals fetched successfully:', response.data);
        
        // Filter out completed goals and sort by creation date
        const activeGoals = response.data
          .filter(goal => goal.status !== 'completed')
          .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        
        console.log('Active goals after filtering:', activeGoals);
        setGoals(activeGoals);
      } catch (err) {
        console.error('Failed to fetch goals:', err);
        enqueueSnackbar('Failed to load goals', { variant: 'error' });
        console.log('Using dummy goals as fallback');
        setGoals(getDummyGoals());
      } finally {
        setLoading(false);
      }
    };

    fetchGoals();
  }, [enqueueSnackbar]);

  // Dummy data for demonstration
  const getDummyGoals = () => [
    {
      _id: '1',
      title: 'Morning Workout',
      status: 'active',
      schedule: { frequency: 'daily', time: '6:00 AM' },
      progress: { completedCheckIns: 5, targetCheckIns: 7, currentStreak: 3 },
      category: 'fitness',
      createdAt: new Date()
    },
    {
      _id: '2',
      title: 'Read 30 Pages',
      status: 'active',
      schedule: { frequency: 'daily', time: '8:00 PM' },
      progress: { completedCheckIns: 4, targetCheckIns: 7, currentStreak: 2 },
      category: 'learning',
      createdAt: new Date()
    },
    {
      _id: '3',
      title: 'Meditation',
      status: 'active',
      schedule: { frequency: 'daily', time: '7:00 AM' },
      progress: { completedCheckIns: 7, targetCheckIns: 7, currentStreak: 7 },
      category: 'health',
      createdAt: new Date()
    },
    {
      _id: '4',
      title: 'Learn Spanish',
      status: 'paused',
      schedule: { frequency: 'weekdays', time: '7:30 PM' },
      progress: { completedCheckIns: 2, targetCheckIns: 5, currentStreak: 0 },
      category: 'learning',
      createdAt: new Date()
    },
    {
      _id: '5',
      title: 'Drink 8 Glasses Water',
      status: 'active',
      schedule: { frequency: 'daily', time: 'Throughout day' },
      progress: { completedCheckIns: 6, targetCheckIns: 7, currentStreak: 4 },
      category: 'health',
      createdAt: new Date()
    }
  ];

  const handleCheckIn = async (goalId, notes = '') => {
    try {
      console.log('Starting check-in for goal:', goalId);

      // Always include timezone offset in the request
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
        // Fallback for older servers enforcing time window: relax to all-day and retry once
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

      console.log('Check-in response:', updatedGoal);

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
      console.log('Resuming goal:', goalId);
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
    console.log('Goal saved callback:', {
      isEdit: !!editingGoal,
      editingGoalId: editingGoal?._id,
      savedGoal: savedGoal,
      currentGoals: goals.length
    });
    
    if (editingGoal) {
      // If goal was completed, remove it from the goals list
      if (savedGoal.status === 'completed') {
        const filteredGoals = goals.filter(goal => goal._id !== editingGoal._id);
        console.log('Goal completed, removed from list:', filteredGoals);
        setGoals(filteredGoals);
      } else {
        // Otherwise, update the goal in the list
        const updatedGoals = goals.map(goal => 
          goal._id === editingGoal._id ? savedGoal : goal
        );
        console.log('Updated goals after edit:', updatedGoals);
        setGoals(updatedGoals);
      }
    } else {
      const newGoals = [savedGoal, ...goals];
      console.log('New goals after create:', newGoals);
      setGoals(newGoals);
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
      console.log('Completing goal:', goalId);
      
      // Update goal status to completed
      const response = await goalsAPI.updateGoal(goalId, { 
        status: 'completed', 
        completedAt: new Date() 
      });
      
      console.log('Goal completion response:', response.data);
      
      // Remove the completed goal from the goals list immediately
      setGoals(goals.filter(goal => goal._id !== goalId));
      enqueueSnackbar('Goal completed successfully! 🎉', { variant: 'success' });
      
      // Trigger dashboard refresh
      localStorage.setItem('goal_completed', Date.now().toString());
      localStorage.setItem('dashboard_refresh', Date.now().toString());
      
      // Refresh the goals list to ensure consistency
      setTimeout(async () => {
        try {
          console.log('Refreshing goals list...');
          const response = await goalsAPI.getGoals();
          const activeGoals = response.data.filter(goal => goal.status !== 'completed');
          console.log('Refreshed goals:', activeGoals);
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
      case 'active': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'paused': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'completed': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
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

  return (
    <div className="min-h-screen bg-white transition-colors">
      {/* 🔹 Navbar */}
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200 shadow-md">
        {/* Left side with Back button and Logo */}
        <div className="flex items-center gap-4">
          <BackButton />
          <div
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 cursor-pointer"
          >
            <div className="w-9 h-9 flex items-center justify-center rounded-full font-bold text-white" style={{backgroundColor: '#0046ff'}}>
              A
            </div>
            <span className="text-xl font-bold text-black">Aktiv</span>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="hidden md:flex items-center gap-6 font-medium">
          <button onClick={() => navigate("/dashboard")} className="cursor-pointer text-gray-600 hover:text-black transition-colors">Dashboard</button>
          <button onClick={() => navigate("/goals")} className="cursor-pointer font-semibold transition-colors" style={{color: '#0046ff'}}>Goals</button>
          <button onClick={() => navigate("/find-partners")} className="cursor-pointer text-gray-600 hover:text-black transition-colors">Find Partners</button>
          <button onClick={() => navigate("/chat/samplePartnerId")} className="cursor-pointer text-gray-600 hover:text-black transition-colors">Chat</button>
          <button onClick={() => navigate("/feed")} className="cursor-pointer text-gray-600 hover:text-black transition-colors">Feed</button>
          <button onClick={() => navigate("/leaderboard")} className="cursor-pointer text-gray-600 hover:text-black transition-colors">Leaderboard</button>
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
              src={getAvatarSrc(user?.avatar, user?.username)}
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
      <main className="max-w-6xl mx-auto p-6">
        {/* Header Section */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="flex items-center justify-between mb-8"
        >
          <div>
            <h1 className="text-3xl font-bold text-black mb-2">
              My Goals
            </h1>
            <p className="text-gray-600">
              Track your progress and stay consistent.
            </p>
          </div>
          <button
            onClick={handleCreateGoal}
            className="flex items-center gap-2 px-6 py-3 rounded-lg transition-colors font-medium text-white"
            style={{backgroundColor: '#0046ff'}}
          >
            <Plus className="w-5 h-5" />
            Create New Goal
          </button>
        </motion.div>

        {/* Goals Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {loading ? (
            // Loading skeleton
            Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="p-6 rounded-xl bg-white dark:bg-[#1e293b] shadow-md border border-gray-200 dark:border-gray-700 animate-pulse">
                <div className="h-6 w-32 bg-gray-300 dark:bg-gray-600 rounded mb-3"></div>
                <div className="h-4 w-16 bg-gray-300 dark:bg-gray-600 rounded mb-4"></div>
                <div className="h-3 w-24 bg-gray-300 dark:bg-gray-600 rounded mb-2"></div>
                <div className="w-full bg-gray-300 dark:bg-gray-700 h-2 rounded-full mb-4"></div>
                <div className="flex gap-2">
                  <div className="h-8 w-20 bg-gray-300 dark:bg-gray-600 rounded"></div>
                  <div className="h-8 w-16 bg-gray-300 dark:bg-gray-600 rounded"></div>
                </div>
              </div>
            ))
          ) : (
            <>
              {/* Goal Cards */}
              {goals
                .filter(goal => goal.status !== 'completed')
                .map((goal) => (
                <GoalCard
                  key={goal._id}
                  goal={goal}
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
              
              {/* Create New Goal Card */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleCreateGoal}
                className="p-6 rounded-xl bg-white dark:bg-[#1e293b] shadow-md border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-blue-500 dark:hover:border-blue-400 transition-colors cursor-pointer flex flex-col items-center justify-center min-h-[200px]"
              >
                <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mb-4">
                  <Plus className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                  Create New Goal
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 text-center">
                  Set a new goal and stay accountable with partners
                </p>
              </motion.div>
            </>
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
const GoalCard = ({ goal, onCheckIn, onResume, onEdit, onDelete, onComplete, getStatusColor, getProgressPercentage, getFrequencyText }) => {
  const progressPercentage = getProgressPercentage(goal);
  // Check if already checked in today - look at checkIns array instead of lastCheckIn
  const isCheckedInToday = goal.checkIns && goal.checkIns.some(checkIn => {
    const checkInDate = new Date(checkIn.date);
    const today = new Date();
    return checkInDate.toDateString() === today.toDateString();
  });

  // Check if current time is within the allowed window
  const getTimeWindowStatus = (goal) => {
    const now = new Date();
    const timeString = goal.schedule.time;
    
    if (!timeString || timeString === 'Throughout day') {
      return { canCheckIn: true, message: null };
    }
    
    // Parse time string (e.g., "5:00 PM")
    const timeMatch = timeString.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
    if (!timeMatch) {
      return { canCheckIn: true, message: null };
    }
    
    let hours = parseInt(timeMatch[1]);
    const minutes = parseInt(timeMatch[2]);
    const period = timeMatch[3]?.toUpperCase();
    
    if (period === 'PM' && hours !== 12) {
      hours += 12;
    } else if (period === 'AM' && hours === 12) {
      hours = 0;
    }
    
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
  
  // Debug logging for check-in button visibility
  console.log('Goal check-in status:', {
    goalId: goal._id,
    title: goal.title,
    status: goal.status,
    isCheckedInToday,
    timeWindowStatus,
    canCheckInNow,
    checkIns: goal.checkIns,
    lastCheckIn: goal.progress.lastCheckIn
  });

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="p-6 rounded-xl bg-white dark:bg-[#1e293b] shadow-md border border-gray-200 dark:border-gray-700 hover:shadow-lg transition-shadow"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
            {goal.title}
          </h3>
          {goal.description && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
              {goal.description}
            </p>
          )}
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(goal.status)}`}>
            {goal.status.charAt(0).toUpperCase() + goal.status.slice(1)}
          </span>
        </div>
        <button
          onClick={() => onDelete(goal._id)}
          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
          title="Delete goal"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Progress */}
      <div className="mb-4">
        <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
          <span>Weekly Progress</span>
          <span>{goal.progress.completedCheckIns}/{goal.progress.targetCheckIns} days</span>
        </div>
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${
              progressPercentage >= 100 
                ? 'bg-green-600' 
                : progressPercentage >= 90 
                ? 'bg-yellow-500' 
                : 'bg-blue-600'
            }`}
            style={{ width: `${progressPercentage}%` }}
          ></div>
        </div>
        {progressPercentage >= 90 && progressPercentage < 100 && (
          <p className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
            Almost there! {100 - progressPercentage}% to completion
          </p>
        )}
        {progressPercentage >= 100 && (
          <p className="text-xs text-green-600 dark:text-green-400 mt-1">
            🎉 Goal completed!
          </p>
        )}
      </div>

      {/* Schedule */}
      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-4">
        <div className="flex items-center gap-1">
          <Calendar className="w-4 h-4" />
          <span>{getFrequencyText(goal.schedule.frequency)}</span>
        </div>
        <div className="flex items-center gap-1">
          <Clock className="w-4 h-4" />
          <span>{goal.schedule.time}</span>
        </div>
      </div>

      {/* Time Window Status */}
      {!timeWindowStatus.canCheckIn && !isCheckedInToday && (
        <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            ⏰ {timeWindowStatus.message}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        {goal.status === 'active' ? (
          <button
            onClick={() => onCheckIn(goal._id)}
            disabled={!canCheckInNow}
            className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
              isCheckedInToday
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:text-gray-600'
                : !canCheckInNow
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-800 dark:text-gray-600'
                : 'bg-green-600 text-white hover:bg-green-700'
            }`}
          >
            {isCheckedInToday ? 'Checked In' : !canCheckInNow ? 'Not Available' : 'Check In'}
          </button>
        ) : goal.status === 'paused' ? (
          <button
            onClick={() => onResume(goal._id)}
            className="flex-1 py-2 px-4 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors"
          >
            Resume
          </button>
        ) : null}
        
        <button
          onClick={() => onEdit(goal)}
          className="py-2 px-4 rounded-lg font-medium border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          Edit
        </button>
      </div>
    </motion.div>
  );
};

export default Goals;
