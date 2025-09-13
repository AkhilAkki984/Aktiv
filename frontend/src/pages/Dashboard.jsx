import React, { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ThemeContext } from "../context/ThemeContext.jsx";
import { AuthContext } from "../context/AuthContext.jsx";
import {
  Sun,
  Moon,
  Bell,
  Activity,
  Target,
  Calendar,
  Users,
  LogOut,
  Edit3,
  ChevronDown,
} from "lucide-react";

const Dashboard = () => {
  const navigate = useNavigate();
  const { mode, toggleMode } = useContext(ThemeContext);
  const { user, logout } = useContext(AuthContext);

  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
  };

  // 🔹 Dummy data (replace with API later)
  const stats = [
    {
      icon: <Users />,
      label: "Active Partners",
      value: "8",
      sub: "+2 this week",
      color: "#3b82f6", // blue
    },
    {
      icon: <Calendar />,
      label: "Check-ins This Week",
      value: "12",
      sub: "+4 from last week",
      color: "#22c55e", // green
    },
    {
      icon: <Activity />,
      label: "Current Streak",
      value: "15 days",
      sub: "Personal best!",
      color: "#f97316", // orange
    },
    {
      icon: <Target />,
      label: "Goals Achieved",
      value: "3/5",
      sub: "2 remaining",
      color: "#a855f7", // purple
    },
  ];

  const activities = [
    { title: "Morning Run", user: "Sarah M.", time: "2 hours ago", status: "completed" },
    { title: "Weight Loss Goal", user: "Mike T.", time: "1 day ago", status: "achieved" },
    { title: "Yoga Session", user: "Anna K.", time: "2 days ago", status: "new" },
    { title: "Gym Workout", user: "David P.", time: "3 days ago", status: "completed" },
  ];

  const goals = [
    { title: "Run 5K in under 25 minutes", user: "Sarah M.", due: "9/15/2025", progress: 75, color: "#22c55e" },
    { title: "Complete 30-day yoga challenge", user: "Anna K.", due: "9/20/2025", progress: 60, color: "#3b82f6" },
    { title: "Bench press bodyweight", user: "Mike T.", due: "10/1/2025", progress: 40, color: "#a855f7" },
  ];

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
          <button onClick={() => navigate("/matches")} className="cursor-pointer">Matches</button>
          <button onClick={() => navigate("/chat/samplePartnerId")} className="cursor-pointer">Chat</button>
          <button onClick={() => navigate("/feed")} className="cursor-pointer">Feed</button>
          <button onClick={() => navigate("/partners")} className="cursor-pointer">Partners</button>
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
      <main className="max-w-6xl mx-auto p-6 space-y-8">
        {/* Welcome Section */}
        <div className="text-2xl font-bold text-gray-800 dark:text-white">
          Welcome back, {user?.username || "Guest"} 👋
        </div>

        {/* Top Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {stats.map((s, idx) => (
            <StatCard key={idx} {...s} />
          ))}
        </div>

        {/* Recent Activity + Active Goals */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Activity */}
          <Card title="Recent Activity" linkText="View All">
            {activities.map((a, i) => (
              <div key={i} className="flex justify-between items-center p-3 rounded-lg bg-gray-50 dark:bg-[#0f172a]">
                <div>
                  <p className="font-medium text-gray-800 dark:text-gray-100">{a.title}</p>
                  <p className="text-sm text-gray-500">with {a.user} • {a.time}</p>
                </div>
                <StatusBadge status={a.status} />
              </div>
            ))}
          </Card>

          {/* Active Goals */}
          <Card title="Active Goals" linkText="Add Goal">
            {goals.map((g, i) => (
              <div key={i}>
                <p className="font-medium text-gray-800 dark:text-gray-100">{g.title}</p>
                <p className="text-sm text-gray-500">with {g.user} • Due: {g.due}</p>
                <div className="w-full bg-gray-300 dark:bg-gray-700 h-2 rounded-full mt-2">
                  <div
                    className="h-2 rounded-full"
                    style={{ width: `${g.progress}%`, backgroundColor: g.color }}
                  ></div>
                </div>
                <p className="text-xs mt-1 text-gray-400">{g.progress}%</p>
              </div>
            ))}
          </Card>
        </div>
      </main>
    </div>
  );
};

/* 🔹 Reusable Components */
const StatCard = ({ icon, label, value, sub, color }) => (
  <div className="flex flex-col p-5 rounded-xl bg-white dark:bg-[#1e293b] shadow-md border border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-lg transition">
    <div className="flex items-center gap-3">
      <span
        className="p-3 rounded-full text-white"
        style={{ backgroundColor: color }}
      >
        {icon}
      </span>
      <div>
        <p className="text-xl font-bold text-gray-800 dark:text-gray-100">{value}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      </div>
    </div>
    {sub && <span className="text-xs mt-2" style={{ color }}>{sub}</span>}
  </div>
);

const Card = ({ title, linkText, children }) => (
  <div className="p-5 rounded-xl bg-white dark:bg-[#1e293b] shadow-md border border-gray-200 dark:border-gray-700">
    <div className="flex items-center justify-between mb-4">
      <h2 className="font-semibold text-gray-800 dark:text-gray-100">{title}</h2>
      <button className="text-sm text-blue-500 hover:underline cursor-pointer">{linkText}</button>
    </div>
    <div className="space-y-4">{children}</div>
  </div>
);

const StatusBadge = ({ status }) => {
  const colors = {
    completed: "text-green-500",
    achieved: "text-purple-500",
    new: "text-blue-500",
  };
  return (
    <span className={`text-xs font-medium ${colors[status] || "text-gray-400"}`}>
      {status}
    </span>
  );
};

export default Dashboard;
