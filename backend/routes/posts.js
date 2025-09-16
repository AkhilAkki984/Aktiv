import express from 'express';
import multer from 'multer';
import { v2 as cloudinaryV2 } from 'cloudinary';
import Post from '../models/Post.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Configure Cloudinary
cloudinaryV2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image and video files are allowed!'), false);
    }
  }
});

// @route   POST /api/posts
// @desc    Create a new post
// @access  Private
router.post('/', auth, upload.single('media'), async (req, res) => {
  try {
    const { text, category } = req.body;
    const userId = req.user.id;

    if (!text || !category) {
      return res.status(400).json({ msg: 'Text and category are required' });
    }

    let mediaUrl = null;
    let mediaType = null;

    // Upload media to Cloudinary if provided
    if (req.file) {
      const result = await new Promise((resolve, reject) => {
        const uploadStream = cloudinaryV2.uploader.upload_stream(
          {
            resource_type: req.file.mimetype.startsWith('video/') ? 'video' : 'image',
            folder: 'community-feed'
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(req.file.buffer);
      });

      mediaUrl = result.secure_url;
      mediaType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
    }

    const post = new Post({
      user: userId,
      text,
      mediaUrl,
      mediaType,
      category
    });

    await post.save();
    await post.populate('user', 'username firstName lastName avatar');

    res.status(201).json(post);
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route   GET /api/posts
// @desc    Get all posts with pagination
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const category = req.query.category;
    const skip = (page - 1) * limit;

    let query = {};
    if (category && category !== 'All') {
      query.category = category;
    }

    const posts = await Post.find(query)
      .populate('user', 'username firstName lastName avatar')
      .populate('originalPost')
      .populate('originalPost.user', 'username firstName lastName avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPosts = await Post.countDocuments(query);
    const totalPages = Math.ceil(totalPosts / limit);

    res.json({
      posts,
      pagination: {
        currentPage: page,
        totalPages,
        totalPosts,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route   GET /api/posts/:id
// @desc    Get a single post
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id)
      .populate('user', 'username firstName lastName avatar')
      .populate('originalPost')
      .populate('originalPost.user', 'username firstName lastName avatar');

    if (!post) {
      return res.status(404).json({ msg: 'Post not found' });
    }

    res.json(post);
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route   PUT /api/posts/:id/like
// @desc    Like or unlike a post
// @access  Private
router.put('/:id/like', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ msg: 'Post not found' });
    }

    const userId = req.user.id;
    const likeIndex = post.likes.findIndex(like => like.user.toString() === userId);

    if (likeIndex > -1) {
      // Unlike the post
      post.likes.splice(likeIndex, 1);
    } else {
      // Like the post
      post.likes.push({ user: userId });
    }

    await post.save();
    res.json({ likes: post.likes, likeCount: post.likeCount });
  } catch (error) {
    console.error('Error liking post:', error);
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route   POST /api/posts/:id/comment
// @desc    Add a comment to a post
// @access  Private
router.post('/:id/comment', auth, async (req, res) => {
  try {
    const { text } = req.body;
    if (!text) {
      return res.status(400).json({ msg: 'Comment text is required' });
    }

    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ msg: 'Post not found' });
    }

    const comment = {
      user: req.user.id,
      text
    };

    post.comments.push(comment);
    await post.save();

    // Populate the comment with user details
    await post.populate('comments.user', 'username firstName lastName avatar');

    res.json({ comments: post.comments, commentCount: post.commentCount });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route   PUT /api/posts/:id/share
// @desc    Share a post
// @access  Private
router.put('/:id/share', auth, async (req, res) => {
  try {
    const { text } = req.body;
    const originalPost = await Post.findById(req.params.id);
    
    if (!originalPost) {
      return res.status(404).json({ msg: 'Post not found' });
    }

    // Create a new post that references the original
    const sharedPost = new Post({
      user: req.user.id,
      text: text || '',
      category: originalPost.category,
      isShared: true,
      originalPost: originalPost._id
    });

    await sharedPost.save();
    await sharedPost.populate('user', 'username firstName lastName avatar');
    await sharedPost.populate('originalPost');
    await sharedPost.populate('originalPost.user', 'username firstName lastName avatar');

    // Add to original post's shares
    originalPost.shares.push({ user: req.user.id });
    await originalPost.save();

    res.status(201).json(sharedPost);
  } catch (error) {
    console.error('Error sharing post:', error);
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route   PUT /api/posts/:id/congratulate
// @desc    Congratulate on a post
// @access  Private
router.put('/:id/congratulate', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      return res.status(404).json({ msg: 'Post not found' });
    }

    const userId = req.user.id;
    const congratsIndex = post.congratulations.findIndex(congrats => congrats.user.toString() === userId);

    if (congratsIndex > -1) {
      // Remove congratulations
      post.congratulations.splice(congratsIndex, 1);
    } else {
      // Add congratulations
      post.congratulations.push({ user: userId });
    }

    await post.save();
    res.json({ congratulations: post.congratulations, congratulationsCount: post.congratulationsCount });
  } catch (error) {
    console.error('Error congratulating post:', error);
    res.status(500).json({ msg: 'Server error' });
  }
});

// @route   DELETE /api/posts/:id
// @desc    Delete a post
// @access  Private
router.delete('/:id', auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    
    if (!post) {
      return res.status(404).json({ msg: 'Post not found' });
    }

    // Check if user owns the post
    if (post.user.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'Not authorized to delete this post' });
    }

    // Delete media from Cloudinary if exists
    if (post.mediaUrl) {
      const publicId = post.mediaUrl.split('/').pop().split('.')[0];
      await cloudinaryV2.uploader.destroy(`community-feed/${publicId}`);
    }

    await Post.findByIdAndDelete(req.params.id);
    res.json({ msg: 'Post deleted successfully' });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ msg: 'Server error' });
  }
});

export default router;
