import React, { useState, useEffect } from "react";
import { feedAPI } from "../utils/api";
import { useSnackbar } from "notistack";
import { Send, User, Heart, MessageCircle } from "lucide-react";

const Feed = () => {
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState("");
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const loadFeed = React.useCallback(() => {
    feedAPI
      .getFeed()
      .then((res) => setPosts(res.data))
      .catch(() =>
        enqueueSnackbar("Failed to fetch feed", { variant: "error" })
      );
  }, [enqueueSnackbar]);

  const handlePost = async () => {
    if (!newPost.trim()) return;
    try {
      await feedAPI.postFeed({ message: newPost });
      setNewPost("");
      loadFeed();
      enqueueSnackbar("✅ Posted successfully!", { variant: "success" });
    } catch {
      enqueueSnackbar("Failed to post", { variant: "error" });
    }
  };

  const handleLike = async (id) => {
    try {
      await feedAPI.likePost(id);
      loadFeed();
    } catch {
      enqueueSnackbar("Failed to like post", { variant: "error" });
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 flex justify-center px-4 py-8">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
          📰 Community Feed
        </h1>

        {/* Post Input */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
          <textarea
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            placeholder="What's on your mind?"
            className="w-full p-3 rounded-md border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
            rows="3"
          />
          <div className="flex justify-end mt-3">
            <button
              onClick={handlePost}
              className="flex items-center gap-2 px-5 py-2 rounded-full bg-green-500 text-white font-medium shadow hover:bg-green-600 hover:shadow-md transform hover:scale-105 transition-all duration-300 cursor-pointer"
            >
              <Send size={18} />
              Post
            </button>
          </div>
        </div>

        {/* Feed Posts */}
        <div className="space-y-6">
            {posts.length === 0 ? (
              <p className="p-6 text-gray-500 dark:text-gray-400 text-center">
                No posts yet. Be the first to share something! 🎉
              </p>
            ) : (
              posts.map((post) => (
                <div
                  key={post._id}
                  className="bg-white dark:bg-gray-800 rounded-lg shadow p-5"
                >
                  {/* User info */}
                  <div className="flex items-center gap-3 mb-3">
                    {post.user?.profilePic ? (
                      <img
                        src={post.user.profilePic}
                        alt="avatar"
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white">
                        <User size={20} />
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-gray-900 dark:text-gray-100">
                        {post.user?.username}
                      </p>
                      <span className="text-xs text-gray-500">
                        {new Date(post.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Message */}
                  <p className="text-gray-700 dark:text-gray-300 mb-3">
                    {post.message}
                  </p>

                  {/* Image */}
                  {post.image && (
                    <img
                      src={`/uploads/${post.image}`}
                      alt="post"
                      className="rounded-lg w-full max-h-72 object-cover mb-3"
                    />
                  )}

                  {/* Badge */}
                  {post.badge?.label && (
                    <span
                      className={`inline-block px-3 py-1 rounded-full text-sm font-medium mb-3 ${
                        post.badge.type === "success"
                          ? "bg-green-100 text-green-700"
                          : post.badge.type === "goal"
                          ? "bg-blue-100 text-blue-700"
                          : post.badge.type === "streak"
                          ? "bg-orange-100 text-orange-700"
                          : "bg-gray-200 text-gray-700"
                      }`}
                    >
                      {post.badge.label}
                    </span>
                  )}

                  {/* Goal */}
                  {post.goal?.title && (
                    <div className="mb-3">
                      <p className="text-sm text-gray-500 mb-1">
                        {post.goal.title}
                      </p>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="h-2 rounded-full"
                          style={{
                            width: `${post.goal.progress}%`,
                            backgroundColor: post.goal.color || "#10b981",
                          }}
                        ></div>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex items-center gap-5 mt-4">
                    <button
                      onClick={() => handleLike(post._id)}
                      className="flex items-center gap-2 text-gray-600 dark:text-gray-300 hover:text-red-500 cursor-pointer"
                    >
                      <Heart size={18} />
                      {post.likes?.length || 0}
                    </button>
                    <div className="flex items-center gap-2 text-gray-600 dark:text-gray-300">
                      <MessageCircle size={18} />
                      {post.comments?.length || 0}
                    </div>
                  </div>
                </div>
              ))
            )}
        </div>
      </div>
    </div>
  );
};

export default Feed;
