import express from "express";
import auth from "../middleware/auth.js"; // ensure user is available
import User from "../models/User.js";

const router = express.Router();

// Get leaderboard with current user rank
router.get("/", auth, async (req, res) => {
  try {
    // Top 10 users by score
    const leaders = await User.find()
      .select("username score checkIns")
      .sort({ score: -1 })
      .limit(10);

    const leadersWithCount = leaders.map((l) => ({
      ...l.toObject(),
      checkInsCount: l.checkIns.length,
    }));

    // Current user
    const currentUser = await User.findById(req.user.id).select(
      "username score checkIns"
    );

    // Find rank of current user (global rank, not just top 10)
    const allUsers = await User.find().sort({ score: -1 }).select("_id");
    const userRank =
      allUsers.findIndex((u) => u._id.toString() === req.user.id) + 1;

    res.json({
      leaders: leadersWithCount,
      currentUser: {
        ...currentUser.toObject(),
        checkInsCount: currentUser.checkIns.length,
        rank: userRank,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

export default router;
