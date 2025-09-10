import mongoose from "mongoose";

const commentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  text: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

const feedSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  message: { type: String, required: true },
  image: { type: String }, // Image URL or filename
  badge: {
    label: { type: String },
    type: {
      type: String,
      enum: ["success", "goal", "streak", "info"],
    },
  },
  goal: {
    title: { type: String },
    progress: { type: Number, min: 0, max: 100 },
    color: { type: String },
  },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  comments: [commentSchema],
  createdAt: { type: Date, default: Date.now },
});

const Feed = mongoose.model("Feed", feedSchema);
export default Feed;
