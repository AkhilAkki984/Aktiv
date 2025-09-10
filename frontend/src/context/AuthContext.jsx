// frontend/src/context/AuthContext.jsx
import { createContext, useState, useEffect } from "react";
import { authAPI } from "../utils/api"; // Import authAPI for profile fetching

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const token = localStorage.getItem("token"); // Check for token
        if (token) {
          try {
            const profile = await authAPI.getProfile(); // Fetch fresh user data
            setUser(profile.data);
          } catch (err) {
            console.error("Failed to fetch profile:", err);
            localStorage.removeItem("token"); // Clear invalid token
            setUser(null);
          }
        }
      } catch (err) {
        console.error("Error initializing auth:", err);
      } finally {
        setLoading(false);
      }
    };
    initializeAuth();
  }, []);

  const login = async (userData, token) => {
    setUser(userData);
    if (token) {
      localStorage.setItem("token", token); // Store token from login response
    }
    // No need to store user in localStorage; fetch on mount
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("token"); // Clear token
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};