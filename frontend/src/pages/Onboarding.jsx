import React, { useState, useContext } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { userAPI } from "../utils/api";
import { AuthContext } from "../context/AuthContext.jsx";
import { useSnackbar } from "notistack";
import { motion } from "framer-motion";
import { ArrowRight, ArrowLeft, CheckCircle } from "lucide-react";
import { getAllAvatars } from "../utils/avatarUtils";

const avatars = getAllAvatars();

const Onboarding = () => {
  const { register, handleSubmit, watch } = useForm();
  const [step, setStep] = useState(0);
  const [selectedAvatar, setSelectedAvatar] = useState("");
  const [location, setLocation] = useState("");
  const navigate = useNavigate();
  const { login } = useContext(AuthContext);
  const { enqueueSnackbar } = useSnackbar();

  const steps = ["Choose Avatar", "Bio & Goals", "Preferences & Location"];

  const getLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => setLocation(`${pos.coords.latitude},${pos.coords.longitude}`),
      () =>
        enqueueSnackbar("Location access denied; enter manually.", {
          variant: "warning",
        })
    );
  };

  const onSubmit = async (data) => {
    try {
      const profileData = {
        avatar: selectedAvatar,
        bio: data.bio,
        goals: data.goals.split(",").map((g) => g.trim()),
        preferences: data.preferences.split(",").map((p) => p.trim()),
        location: location || data.manualLocation,
        gender: data.gender,
        genderPreference: data.genderPreference || "any",
        onboarded: true,
      };
      await userAPI.updateProfile(profileData);
      const profile = await userAPI.getProfile();
      login(profile.data);
      navigate("/dashboard");
    } catch (err) {
      enqueueSnackbar("Onboarding failed", { variant: "error" });
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex items-center justify-center px-4 py-10 transition-colors">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-2xl bg-white dark:bg-gray-800 shadow-lg rounded-2xl p-8"
      >
        {/* Stepper */}
        <div className="flex justify-between mb-8">
          {steps.map((label, index) => (
            <div key={label} className="flex flex-col items-center flex-1">
              <div
                className={`w-10 h-10 flex items-center justify-center rounded-full ${
                  index <= step
                    ? "bg-indigo-600 text-white"
                    : "bg-gray-300 dark:bg-gray-700 text-gray-500"
                }`}
              >
                {index < step ? (
                  <CheckCircle className="w-6 h-6" />
                ) : (
                  index + 1
                )}
              </div>
              <p
                className={`mt-2 text-sm ${
                  index <= step
                    ? "text-indigo-600 font-medium"
                    : "text-gray-500 dark:text-gray-400"
                }`}
              >
                {label}
              </p>
            </div>
          ))}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Step 1: Avatar */}
          {step === 0 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              <div className="text-center">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                  Choose Your Avatar
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Select an avatar that represents you
                </p>
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-4 justify-items-center">
              {avatars.map((avatar) => (
                <div key={avatar.name} className="relative">
                  <img
                    src={avatar.src}
                    alt="avatar"
                    onClick={() => setSelectedAvatar(avatar.name)}
                    className={`w-20 h-20 rounded-full cursor-pointer border-4 transition ${
                      selectedAvatar === avatar.name
                        ? "border-indigo-600 scale-105"
                        : "border-transparent hover:scale-105 hover:border-indigo-300"
                    }`}
                  />
                  {selectedAvatar === avatar.name && (
                    <div className="absolute -top-1 -right-1 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center">
                      <CheckCircle className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              ))}
              </div>
            </motion.div>
          )}

          {/* Step 2: Bio & Goals */}
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <textarea
                {...register("bio")}
                placeholder="Write a short bio..."
                required
                className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
              <input
                {...register("goals")}
                placeholder="Your goals (comma-separated)"
                required
                className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
              <select
                {...register("gender")}
                required
                className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white cursor-pointer focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select Gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="non-binary">Non-Binary</option>
                <option value="prefer-not-to-say">Prefer Not to Say</option>
              </select>
            </motion.div>
          )}

          {/* Step 3: Preferences & Location */}
          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <input
                {...register("preferences")}
                placeholder="Preferences (jogging,yoga...)"
                required
                className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
              <select
                {...register("genderPreference")}
                defaultValue="any"
                className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white cursor-pointer focus:ring-2 focus:ring-indigo-500"
              >
                <option value="any">Any Gender</option>
                <option value="same">Same Gender</option>
                <option value="opposite">Opposite Gender</option>
              </select>
              <button
                type="button"
                onClick={getLocation}
                className="px-4 py-2 rounded-lg border border-indigo-500 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-gray-700 transition"
              >
                Use Current Location
              </button>
              <input
                value={location || watch("manualLocation")}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Manual Location"
                className="w-full p-3 rounded-lg border border-gray-300 dark:border-gray-700 dark:bg-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500"
              />
            </motion.div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-6">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
              >
                <ArrowLeft size={18} />
                Back
              </button>
            )}
            {step < steps.length - 1 ? (
              <button
                type="button"
                onClick={() => {
                  if (step === 0 && !selectedAvatar) {
                    enqueueSnackbar("Please select an avatar", { variant: "warning" });
                    return;
                  }
                  setStep(step + 1);
                }}
                className="flex items-center gap-2 ml-auto px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition"
              >
                Next
                <ArrowRight size={18} />
              </button>
            ) : (
              <button
                type="submit"
                className="flex items-center gap-2 ml-auto px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition"
              >
                Finish
                <CheckCircle size={18} />
              </button>
            )}
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export default Onboarding;
