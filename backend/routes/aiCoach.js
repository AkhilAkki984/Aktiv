// backend/routes/coach.js
import express from "express";
import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
import authMiddleware from "../middleware/auth.js";
import User from "../models/User.js";
import Goal from "../models/Goal.js";
import CheckIn from "../models/CheckIn.js";

dotenv.config();
const router = express.Router();

// ✅ Initialize Google Gemini AI
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const AI_MODEL = process.env.GENAI_MODEL || "gemini-1.5-pro"; // Use env variable or fallback

// 🔹 Helper: Build user context
const getUserContext = async (userId) => {
  try {
    const user = await User.findById(userId).select("username goals preferences bio");
    const goals = await Goal.find({ userId, status: { $in: ["active", "paused"] } });
    const recentCheckIns = await CheckIn.find({ userId })
      .sort({ createdAt: -1 })
      .limit(5)
      .populate("goalId", "title category");

    return {
      user: {
        username: user?.username || "User",
        goals: user?.goals || [],
        preferences: user?.preferences || [],
        bio: user?.bio || "",
      },
      activeGoals: goals.map((goal) => ({
        title: goal.title,
        category: goal.category,
        progress: goal.progress,
        status: goal.status,
      })),
      recentActivity: recentCheckIns.map((checkIn) => ({
        goal: checkIn.goalId?.title || "Unknown Goal",
        category: checkIn.goalId?.category || "General",
        date: checkIn.createdAt,
      })),
    };
  } catch (error) {
    console.error("❌ Error getting user context:", error.message);
    return null;
  }
};

// 🔹 Chat with AI Coach
router.post("/chat", authMiddleware, async (req, res) => {
  try {
    const { message } = req.body;
    const userId = req.user.id;

    if (!message || !message.trim()) {
      return res.status(400).json({ error: "Message is required" });
    }

    const userContext = await getUserContext(userId);

    const systemPrompt = `You are an AI Fitness Coach for the Aktiv fitness social app.
You are knowledgeable, motivating, and personalized.

User Context:
- Username: ${userContext?.user?.username || "User"}
- Bio: ${userContext?.user?.bio || "No bio provided"}
- Goals: ${userContext?.user?.goals?.join(", ") || "No specific goals set"}
- Preferences: ${userContext?.user?.preferences?.join(", ") || "No preferences set"}

Active Goals:
${
  userContext?.activeGoals?.map(
    (goal) => `- ${goal.title} (${goal.category}) - ${goal.status}`
  ).join("\n") || "No active goals"
}

Recent Activity:
${
  userContext?.recentActivity?.map(
    (activity) =>
      `- ${activity.goal} (${activity.category}) on ${new Date(
        activity.date
      ).toLocaleDateString()}`
  ).join("\n") || "No recent activity"
}

Guidelines:
1. Be encouraging and supportive
2. Provide practical, actionable advice
3. Reference the user's goals and progress when relevant
4. Keep responses concise but helpful (2-3 paragraphs max)
5. Use emojis sparingly but effectively
6. Ask follow-up questions to engage the user
7. Focus on fitness, nutrition, motivation, and goal achievement
8. If asked about non-fitness topics, politely redirect to fitness-related advice`;

    const model = genAI.getGenerativeModel({ model: AI_MODEL });
    const fullPrompt = `${systemPrompt}\n\nUser message: ${message}`;

    let aiResponse;
    try {
      const result = await model.generateContent(fullPrompt);
      aiResponse = result?.response?.text() || "I’m here to support your fitness journey!";
    } catch (apiErr) {
      console.error("❌ Gemini API error:", apiErr.message);
      aiResponse =
        "I'm having some trouble right now, but let's keep working on your fitness goals!";
    }

    res.json({
      success: true,
      response: aiResponse,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("❌ AI Coach route error:", error.message);
    res.status(500).json({ error: "Internal server error" });
  }
});

// 🔹 Get AI Coach suggestions
router.get("/suggestions", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const userContext = await getUserContext(userId);

    if (!userContext) {
      return res.status(404).json({ error: "User context not found" });
    }

    const suggestions = [];

    // Goal-based suggestions
    if (userContext.activeGoals.length === 0) {
      suggestions.push({
        type: "goal",
        title: "Set Your First Goal",
        message:
          "I notice you don't have any active goals yet. Setting specific, measurable goals is the first step to success!",
        action: "Create a goal",
      });
    } else {
      const randomGoal =
        userContext.activeGoals[
          Math.floor(Math.random() * userContext.activeGoals.length)
        ];
      suggestions.push({
        type: "motivation",
        title: `Keep Going with ${randomGoal.title}`,
        message: `You're doing great with your ${randomGoal.category} goal! Consistency is key to success.`,
        action: "Check in today",
      });
    }

    // Activity-based suggestions
    if (userContext.recentActivity.length === 0) {
      suggestions.push({
        type: "activity",
        title: "Start Your Journey",
        message: "Ready to begin your fitness journey? Even small steps count!",
        action: "Log your first activity",
      });
    }

    // General motivational tip
    suggestions.push({
      type: "tip",
      title: "Daily Motivation",
      message:
        "Every expert was once a beginner. Every pro was once an amateur. Keep going! 💪",
      action: "Stay motivated",
    });

    res.json({
      success: true,
      suggestions,
      userContext: {
        hasActiveGoals: userContext.activeGoals.length > 0,
        hasRecentActivity: userContext.recentActivity.length > 0,
        goalCount: userContext.activeGoals.length,
      },
    });
  } catch (error) {
    console.error("❌ AI Coach suggestions error:", error.message);
    res.status(500).json({ error: "Failed to generate suggestions" });
  }
});

export default router;
