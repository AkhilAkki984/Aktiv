import React, { useContext, useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useForm } from "react-hook-form";
import { motion } from "framer-motion";
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

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (formData) => {
    setError('');
    setIsLoading(true);
    
    try {
      console.log('Form data received:', formData);
      
      // Prepare the request data with correct field names
      const requestData = isLogin
        ? {
            email: formData.email?.trim(),
            password: formData.password
          }
        : {
            username: formData.username?.trim(),
            email: formData.email?.trim(),
            password: formData.password,
            firstName: formData.firstName?.trim(),
            lastName: formData.lastName?.trim()
          };
      
      console.log('Sending request to server with data:', requestData);
      
      // Make login/register request
      const res = await authAPI[isLogin ? 'login' : 'register'](requestData);
      console.log('Server response:', res);
      
      if (!res) {
        throw new Error('No response received from server');
      }
      
      if (res.data) {
        console.log('Response data:', res.data);
        
        // Check for token in the response
        if (res.data.token) {
          // Store the token
          localStorage.setItem('token', res.data.token);
          
          // If user data is included in the response, use it
          if (res.data.user) {
            console.log('User data from response:', res.data.user);
            login(res.data.user);
            navigate(res.data.user.onboarded ? '/dashboard' : '/onboarding');
            reset();
            enqueueSnackbar(isLogin ? 'Login successful!' : 'Registration successful!', { variant: 'success' });
            return;
          } else {
            // Fallback to fetching profile if not included in response
            console.log('No user data in response, fetching profile...');
            try {
              const profile = await authAPI.getProfile();
              console.log('Fetched profile:', profile.data);
              login(profile.data);
              navigate(profile.data.onboarded ? '/dashboard' : '/onboarding');
              reset();
              enqueueSnackbar(isLogin ? 'Login successful!' : 'Registration successful!', { variant: 'success' });
              return;
            } catch (profileErr) {
              console.error('Error fetching profile:', profileErr);
              throw new Error('Login successful but failed to fetch user profile');
            }
          }
        }
      }
      
      // If we get here, the response didn't contain what we expected
      console.error('Unexpected response format:', res);
      throw new Error(res.data?.msg || 'Invalid response format from server');
    } catch (err) {
      console.error('Authentication error:', err);
      
      // Extract the most relevant error message
      let errorMessage = 'An error occurred';
      
      if (err.response) {
        // Server responded with an error status code
        const { data, status } = err.response;
        console.error(`Server error ${status}:`, data);
        
        if (status === 400) {
          errorMessage = data.msg || 'Invalid request data';
        } else if (status === 401) {
          errorMessage = data.msg || 'Invalid credentials';
        } else if (status === 500) {
          errorMessage = 'Server error. Please try again later.';
        } else {
          errorMessage = data.msg || `Error: ${status} - ${data.message || 'Unknown error'}`;
        }
      } else if (err.request) {
        // Request was made but no response received
        console.error('No response received:', err.request);
        errorMessage = 'No response from server. Please check your connection.';
      } else {
        // Something else went wrong
        console.error('Request setup error:', err.message);
        errorMessage = err.message || 'Failed to process request';
      }
      
      setError(errorMessage);
      enqueueSnackbar(errorMessage, { variant: 'error' });
      enqueueSnackbar(errorMessage, { variant: "error" });
    } finally {
      setIsLoading(false);
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
              disabled={isLoading}
              className={`w-full py-2 ${isLoading ? 'bg-blue-400' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-lg transition-colors duration-300 flex items-center justify-center`}
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {isLoading ? 'Processing...' : (isLogin ? 'Login' : 'Register')}
                </>
              ) : isLogin ? 'Login' : 'Register'}
            </button>
            
            {error && (
              <div className="mt-2 text-red-600 text-sm text-center">
                {error}
              </div>
            )}
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