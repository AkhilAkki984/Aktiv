import React, { useState, useEffect } from "react";
import { matchAPI } from "../utils/api";
import { useSnackbar } from "notistack";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Users, MessageCircle } from "lucide-react";

const Matches = () => {
  const [matches, setMatches] = useState([]);
  const [filters, setFilters] = useState({
    category: "",
    genderPreference: "any",
  });
  const { enqueueSnackbar } = useSnackbar();
  const navigate = useNavigate();

  useEffect(() => {
    matchAPI
      .getMatches(filters)
      .then((res) => setMatches(res.data))
      .catch((error) => {
        console.error("Failed to fetch matches:", error);
        enqueueSnackbar("Failed to fetch matches", { variant: "error" });
      });
  }, [filters, enqueueSnackbar]);

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 px-4 py-10 transition-colors">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-3 mb-8"
        >
          <Users className="w-8 h-8 text-indigo-500 drop-shadow" />
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Matches
          </h1>
        </motion.div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <select
            name="category"
            value={filters.category}
            onChange={handleFilterChange}
            className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 cursor-pointer focus:ring-2 focus:ring-indigo-500 transition"
          >
            <option value="">All Activities</option>
            <option value="jogging">Jogging</option>
            <option value="yoga">Yoga</option>
            <option value="gym">Gym</option>
          </select>

          <select
            name="genderPreference"
            value={filters.genderPreference}
            onChange={handleFilterChange}
            className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-100 cursor-pointer focus:ring-2 focus:ring-indigo-500 transition"
          >
            <option value="any">Any Gender</option>
            <option value="same">Same Gender</option>
            <option value="opposite">Opposite Gender</option>
          </select>
        </div>

        {/* Matches List */}
        {matches.length === 0 ? (
          <p className="text-gray-500 dark:text-gray-400 text-center py-10">
            No matches found 😔
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {matches.map((match, idx) => (
              <motion.div
                key={match._id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                whileHover={{ scale: 1.02 }}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-md p-5 flex flex-col justify-between hover:shadow-lg cursor-pointer transition"
              >
                {/* User Info */}
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    {match.username}
                  </h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    Preferences: {match.preferences.join(", ")}
                  </p>
                </div>

                {/* Chat Button */}
                <button
                  onClick={() => navigate(`/chat/${match._id}`)}
                  className="mt-4 flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition shadow cursor-pointer"
                >
                  <MessageCircle size={18} />
                  Chat
                </button>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Matches;
