import express from "express";
import auth from "../middleware/auth.js";
import Feed from "../models/Feed.js";

const router = express.Router();

// 📌 Get all feed posts (most recent first)
router.get("/", auth, async (req, res) => {
  try {
    const posts = await Feed.find()
      .populate("user", "username avatar")
      .populate("likes", "username")
      .populate("comments.user", "username avatar")
      .sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// 📌 Create a new feed post
router.post("/", auth, async (req, res) => {
  try {
    const { message, image, badge, goal } = req.body;
    const post = new Feed({
      user: req.user.id,
      message,
      image,
      badge,
      goal,
    });
    await post.save();
    res.status(201).json(post);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// 📌 Like / Unlike a post
router.post("/:id/like", auth, async (req, res) => {
  try {
    const post = await Feed.findById(req.params.id);
    if (!post) return res.status(404).json({ msg: "Post not found" });

    if (post.likes.includes(req.user.id)) {
      post.likes.pull(req.user.id);
    } else {
      post.likes.push(req.user.id);
    }

    await post.save();
    res.json(post);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

// 📌 Add a comment
router.post("/:id/comment", auth, async (req, res) => {
  try {
    const post = await Feed.findById(req.params.id);
    if (!post) return res.status(404).json({ msg: "Post not found" });

    post.comments.push({ user: req.user.id, text: req.body.text });
    await post.save();

    res.json(post);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Server error" });
  }
});

export default router;
