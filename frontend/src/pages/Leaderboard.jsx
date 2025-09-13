import React, { useState, useEffect } from "react";
import { leaderboardAPI } from "../utils/api";
import { useSnackbar } from "notistack";
// import { motion } from "framer-motion"; // Removed unused import
import { Trophy, User } from "lucide-react";

const Leaderboard = () => {
  const [leaders, setLeaders] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    leaderboardAPI
      .getLeaderboard()
      .then((res) => {
        setLeaders(res.data.leaders || []);
        setCurrentUser(res.data.currentUser || null);
      })
      .catch(() =>
        enqueueSnackbar("Failed to fetch leaderboard", { variant: "error" })
      );
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex justify-center px-4 py-10 transition-colors">
      <div className="w-full max-w-4xl">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-3 mb-8"
        >
          <Trophy className="w-8 h-8 text-yellow-500 drop-shadow" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Leaderboard
          </h1>
        </motion.div>

        {/* Current User Rank */}
        {currentUser && (
          <div className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-2xl shadow-lg p-6 mb-8 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold">
                #{currentUser.rank} Your Current Rank
              </h2>
              <p className="text-sm opacity-90">This Week</p>
            </div>
            <span className="text-2xl font-bold">
              {currentUser.score} pts
            </span>
          </div>
        )}

        {/* Table */}
        <div className="overflow-hidden rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
          <table className="w-full border-collapse">
            <thead className="bg-gray-200 dark:bg-gray-700">
              <tr>
                <th className="p-4 text-left text-gray-700 dark:text-gray-200">
                  Rank
                </th>
                <th className="p-4 text-left text-gray-700 dark:text-gray-200">
                  User
                </th>
                <th className="p-4 text-left text-gray-700 dark:text-gray-200">
                  Score
                </th>
                <th className="p-4 text-left text-gray-700 dark:text-gray-200">
                  Check-ins
                </th>
              </tr>
            </thead>
            <tbody>
              {!leaders || leaders.length === 0 ? (
                <tr>
                  <td
                    colSpan="4"
                    className="p-6 text-center text-gray-500 dark:text-gray-400"
                  >
                    No leaderboard data available 💤
                  </td>
                </tr>
              ) : (
                leaders.map((leader, idx) => (
                  <motion.tr
                    key={leader._id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                    whileHover={{ scale: 1.02 }}
                    className={`cursor-pointer ${
                      currentUser &&
                      leader._id === currentUser._id
                        ? "bg-indigo-100 dark:bg-indigo-900"
                        : "bg-white dark:bg-gray-800"
                    } border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors`}
                  >
                    <td className="p-4 font-semibold text-gray-800 dark:text-gray-100">
                      #{idx + 1}
                    </td>
                    <td className="p-4 flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white font-bold shadow">
                        <User size={20} />
                      </div>
                      <span className="text-gray-800 dark:text-gray-100 font-medium">
                        {leader.username}
                      </span>
                    </td>
                    <td className="p-4 text-gray-700 dark:text-gray-300">
                      {leader.score}
                    </td>
                    <td className="p-4 text-gray-700 dark:text-gray-300">
                      {leader.checkInsCount}
                    </td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
