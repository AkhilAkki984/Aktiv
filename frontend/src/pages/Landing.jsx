// frontend/src/pages/Landing.jsx
import React from "react";
import { useNavigate } from "react-router-dom";
// import { motion } from "framer-motion"; // Removed unused import
import {
  Users,
  MapPin,
  CalendarCheck,
  MessageCircle,
  Trophy,
  Heart,
  Dumbbell,
} from "lucide-react";

const features = [
  {
    icon: <Users className="w-8 h-8 text-blue-400" aria-label="Users" />,
    title: "Find Your Perfect Match",
    desc: "Connect with fitness partners based on your goals, preferences, and location.",
  },
  {
    icon: <MapPin className="w-8 h-8 text-green-400" aria-label="Location" />,
    title: "Location-Based Matching",
    desc: "Discover workout partners near you with smart location-based algorithms.",
  },
  {
    icon: <CalendarCheck className="w-8 h-8 text-purple-400" aria-label="Check-ins" />,
    title: "Easy Check-ins",
    desc: "Stay accountable with daily check-ins and track your progress.",
  },
  {
    icon: <MessageCircle className="w-8 h-8 text-orange-400" aria-label="Chat" />,
    title: "Social Feed",
    desc: "Share your journey, motivate others, and celebrate achievements together.",
  },
  {
    icon: <Trophy className="w-8 h-8 text-red-400" aria-label="Leaderboard" />,
    title: "Leaderboards",
    desc: "Compete with friends and climb the leaderboard for extra motivation.",
  },
  {
    icon: <Heart className="w-8 h-8 text-pink-400" aria-label="Goals" />,
    title: "Goal Setting",
    desc: "Set and achieve fitness goals together with your workout partners.",
  },
];

const Landing = () => {
  const navigate = useNavigate();

  return (
    <div className="bg-gray-900 text-white min-h-screen flex flex-col">
      {/* 🔹 Navbar */}
      <motion.nav
        className="sticky top-0 z-50 bg-gray-900/80 backdrop-blur-lg shadow-md"
        initial={{ y: -80 }}
        animate={{ y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-4">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <Dumbbell className="text-blue-400 w-7 h-7" aria-label="Logo" />
            <h1 className="text-2xl font-extrabold bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              Aktiv
            </h1>
          </div>

          {/* Nav Buttons */}
          <div className="hidden md:flex gap-6">
            <button
              onClick={() => navigate("/login-signup")}
              className="hover:text-blue-400 transition-colors"
            >
              Login
            </button>
            <button
              onClick={() => navigate("/login-signup")}
              className="hover:text-purple-400 transition-colors"
            >
              Register
            </button>
          </div>
        </div>
      </motion.nav>

      <main className="flex-1">
        {/* 🔹 Hero Section */}
        <motion.section
          className="text-center py-20 px-6 relative"
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1 }}
        >
          <h1 className="text-5xl md:text-6xl font-extrabold leading-tight">
            Your Fitness Journey{" "}
            <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              Starts Here
            </span>
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-lg text-gray-300">
            Connect with like-minded fitness enthusiasts, find workout partners,
            and achieve your goals together. Join the Aktiv community and make
            fitness social, fun, and sustainable.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
            <button
              onClick={() => navigate("/login-signup")}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-purple-600 font-semibold shadow-lg hover:scale-105 transition-transform"
            >
              Get Started Free
            </button>
            <button
              onClick={() =>
                document.getElementById("features")?.scrollIntoView({ behavior: "smooth" })
              }
              className="px-6 py-3 rounded-xl border border-gray-400 font-semibold hover:bg-gray-800 transition-colors"
            >
              Learn More
            </button>
          </div>
        </motion.section>

        {/* 🔹 Features Section */}
        <motion.section
          id="features"
          className="py-16 px-6"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Why Choose{" "}
            <span className="bg-gradient-to-r from-blue-400 to-purple-500 bg-clip-text text-transparent">
              Aktiv?
            </span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 gap-y-12 max-w-6xl mx-auto">
            {features.map((feature, idx) => (
              <motion.div
                key={idx}
                whileHover={{ scale: 1.05, rotate: 1 }}
                className="p-6 bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl transition relative overflow-hidden group"
              >
                <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-20 bg-gradient-to-r from-blue-400 to-purple-500 transition-opacity"></div>
                <div>{feature.icon}</div>
                <h3 className="mt-4 text-xl font-semibold">{feature.title}</h3>
                <p className="mt-2 text-gray-400">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* 🔹 CTA Section */}
        <motion.section
          className="text-center py-16 px-6 bg-gradient-to-r from-blue-600 to-purple-600"
          initial={{ opacity: 0, y: 50 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9 }}
          viewport={{ once: true }}
        >
          <h2 className="text-3xl md:text-4xl font-bold">
            Ready to Transform Your Fitness Journey?
          </h2>
          <p className="mt-4 text-gray-200">
            Join thousands of fitness enthusiasts who have found their perfect
            workout partners.
          </p>
          <motion.button
            whileHover={{ scale: 1.1 }}
            onClick={() => navigate("/login-signup")}
            className="mt-6 px-8 py-4 bg-white text-blue-600 font-bold rounded-xl shadow-lg hover:shadow-2xl transition-transform"
          >
            Start Connecting Today
          </motion.button>
        </motion.section>
      </main>
    </div>
  );
};

export default Landing;