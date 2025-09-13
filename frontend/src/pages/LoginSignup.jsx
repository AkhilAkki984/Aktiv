import React, { useContext, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
// import { motion } from "framer-motion"; // Removed unused import
import { AuthContext } from "../context/AuthContext.jsx";
import { authAPI } from "../utils/api";
import { useSnackbar } from "notistack";

const LoginSignup = () => {
  const { register, handleSubmit, reset } = useForm();
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useContext(AuthContext);
  const { enqueueSnackbar } = useSnackbar();
  const [isLogin, setIsLogin] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const token = params.get("token");
    if (token) {
      localStorage.setItem("token", token);
      authAPI
        .getProfile()
        .then((profile) => {
          login(profile.data);
          navigate(profile.data.onboarded ? "/dashboard" : "/onboarding");
        })
        .catch(() =>
          enqueueSnackbar(
            isLogin
              ? "Failed to fetch profile after social login"
              : "Failed to fetch profile after social register",
            { variant: "error" }
          )
        );
    }
  }, [location, navigate, login, enqueueSnackbar, isLogin]);

  const onSubmit = async (data) => {
    try {
      const res = await authAPI[isLogin ? "login" : "register"](data);
      localStorage.setItem("token", res.data.token);
      const profile = await authAPI.getProfile();
      login(profile.data);
      navigate(profile.data.onboarded ? "/dashboard" : "/onboarding");
      reset();
    } catch (err) {
      enqueueSnackbar(err.response?.data?.msg || (isLogin ? "Login failed" : "Registration failed"), {
        variant: "error",
      });
    }
  };

  const handleSocialLogin = (provider) => {
    window.location.href = `${import.meta.env.VITE_API_URL}/auth/${provider}`;
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-100 via-white to-blue-200 px-4">
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 md:p-8"
      >
        <h2 className="text-3xl font-bold text-center mb-6 text-blue-600">
          {isLogin ? "Login to Aktiv" : "Register for Aktiv"}
        </h2>
        <motion.div
          initial={{ x: isLogin ? 0 : 100 }}
          animate={{ x: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="space-y-4"
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {!isLogin && (
              <input
                {...register("username")}
                type="text"
                placeholder="Username"
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-400 focus:border-transparent"
              />
            )}
            <input
              {...register("email")}
              type="email"
              placeholder="Email"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent"
            />
            <input
              {...register("password")}
              type="password"
              placeholder="Password"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400 focus:border-transparent"
            />
            {isLogin && (
              <p className="text-sm text-gray-600 text-right cursor-pointer hover:underline">
                Forgot Password?
              </p>
            )}
            <button
              type="submit"
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-300"
            >
              {isLogin ? "Login" : "Register"}
            </button>
          </form>
          <div className="text-center">
            <p className="text-gray-600 mb-3">Or {isLogin ? "login" : "register"} with</p>
            <div className="flex justify-center space-x-3">
              <button
                onClick={() => handleSocialLogin("google")}
                className="w-10 h-10 border border-gray-300 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
              >
                <span className="text-xl">G</span>
              </button>
              <button
                onClick={() => handleSocialLogin("twitter")}
                className="w-10 h-10 border border-gray-300 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
              >
                <span className="text-xl">T</span>
              </button>
              <button
                onClick={() => handleSocialLogin("facebook")}
                className="w-10 h-10 border border-gray-300 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
              >
                <span className="text-xl">f</span>
              </button>
            </div>
          </div>
          <p className="mt-6 text-center text-gray-700">
            {isLogin ? "New to Aktiv?" : "Already have an account?"}{" "}
            <span
              onClick={() => {
                setIsLogin(!isLogin);
                reset();
              }}
              className="text-blue-600 cursor-pointer hover:underline font-semibold"
            >
              {isLogin ? "Register" : "Login"}
            </span>
          </p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default LoginSignup;