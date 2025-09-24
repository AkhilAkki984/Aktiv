import express from 'express';
import multer from 'multer';
import { v2 as cloudinaryV2 } from 'cloudinary';
import Post from '../models/Post.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Configure Cloudinary (with fallback for missing credentials)
const cloudinaryConfigured = process.env.CLOUDINARY_CLOUD_NAME && 
                            process.env.CLOUDINARY_API_KEY && 
                            process.env.CLOUDINARY_API_SECRET;

if (cloudinaryConfigured) {
  cloudinaryV2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  console.log('✅ Cloudinary configured successfully');
} else {
  console.log('⚠️ Cloudinary not configured - media uploads will use local storage fallback');
}

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    console.log('Multer fileFilter - received file:', {
      fieldname: file.fieldname,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size
    });
    
    if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
      console.log('✅ File accepted by multer');
      cb(null, true);
    } else {
      console.log('❌ File rejected by multer - invalid type:', file.mimetype);
      cb(new Error('Only image and video files are allowed!'), false);
    }
  }
});

// @route   POST /api/posts
// @desc    Create a new post
// @access  Private
router.post('/', auth, upload.single('media'), async (req, res) => {
  // Handle multer errors
  if (req.fileValidationError) {
    console.log('❌ Multer validation error:', req.fileValidationError);
    return res.status(400).json({ msg: req.fileValidationError });
  }
  try {
    const { text, category } = req.body;
    const userId = req.user.id;
    
    console.log('Creating post with data:', {
      text: text || '(empty)',
      category: category || '(missing)',
      hasFile: !!req.file,
      fileType: req.file?.mimetype || 'none',
      userId: userId
    });

    if (!category) {
      return res.status(400).json({ msg: 'Category is required' });
    }
    
    // Allow posts with either text content or media
    if (!text && !req.file) {
      return res.status(400).json({ msg: 'Post must contain either text content or media' });
    }

    let mediaUrl = null;
    let mediaType = null;

    // Upload media if provided
    if (req.file) {
      if (cloudinaryConfigured) {
        // Use Cloudinary for uploads
        try {
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
        } catch (error) {
          console.error('Cloudinary upload failed:', error);
          return res.status(500).json({ msg: 'Media upload failed' });
        }
      } else {
        // Use local storage fallback
        try {
          const fs = await import('fs');
          const path = await import('path');
          
          // Create uploads directory if it doesn't exist
          const uploadsDir = path.join(process.cwd(), 'uploads', 'feed_media');
          if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
          }
          
          // Generate unique filename
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
          const filename = `feed_media_${uniqueSuffix}_${req.file.originalname}`;
          const filepath = path.join(uploadsDir, filename);
          
          // Save file to local storage
          fs.writeFileSync(filepath, req.file.buffer);
          
          // Create URL for local file
          const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
          mediaUrl = `${baseUrl}/uploads/feed_media/${filename}`;
          mediaType = req.file.mimetype.startsWith('video/') ? 'video' : 'image';
          
          console.log('✅ Media saved locally:', filename);
        } catch (error) {
          console.error('Local upload failed:', error);
          return res.status(500).json({ msg: 'Media upload failed' });
        }
      }
    }

    console.log('Creating post object:', {
      user: userId,
      text: text || '(empty)',
      mediaUrl,
      mediaType,
      category
    });

    const post = new Post({
      user: userId,
      text: text || '',
      mediaUrl,
      mediaType,
      category
    });

    console.log('Post object created, saving to database...');
    await post.save();
    console.log('Post saved successfully, populating user data...');
    
    await post.populate('user', 'username firstName lastName avatar');
    console.log('✅ Post created and populated successfully');

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

    console.log('Fetching posts with query:', query, 'page:', page, 'limit:', limit);
    
    const posts = await Post.find(query)
      .populate('user', 'username firstName lastName avatar')
      .populate('originalPost')
      .populate('originalPost.user', 'username firstName lastName avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalPosts = await Post.countDocuments(query);
    const totalPages = Math.ceil(totalPosts / limit);
    
    console.log('Found posts:', posts.length, 'total:', totalPosts);

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
