import { useEffect, useState, useRef, useContext } from "react";
import { useSnackbar } from "notistack";
import { chatAPI, groupAPI, uploadAPI } from "../utils/api";
import { AuthContext } from "../context/AuthContext";
import ErrorBoundary from "../components/ErrorBoundary";
import { getAvatarSrc } from "../utils/avatarUtils";
import EmojiPicker from 'emoji-picker-react';
import { 
  Search, 
  MoreVertical, 
  Pin, 
  Volume2, 
  VolumeX, 
  Paperclip, 
  Send, 
  Image, 
  Video, 
  FileText,
  Users,
  Plus,
  X,
  Check,
  CheckCheck,
  Clock,
  Smile,
  Camera,
  Video as VideoIcon
} from "lucide-react";

const Chat = () => {
  const { user } = useContext(AuthContext);
  const { enqueueSnackbar } = useSnackbar();
  
  // State management
  const [conversations, setConversations] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [groupName, setGroupName] = useState("");
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [totalUnreadCount, setTotalUnreadCount] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [previewMedia, setPreviewMedia] = useState(null);
  
  // Refs
  const scrollRef = useRef();
  const fileInputRef = useRef();
  const messagesEndRef = useRef();

  // Fetch conversations on component mount
  useEffect(() => {
    fetchConversations();
  }, []);

  // Fetch messages when chat is selected
  useEffect(() => {
    if (selectedChat) {
      fetchMessages(selectedChat._id);
    }
  }, [selectedChat]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showEmojiPicker && !event.target.closest('.emoji-picker-container')) {
        setShowEmojiPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  // Fetch conversations
  const fetchConversations = async () => {
    try {
      setLoading(true);
      const response = await chatAPI.getConversations();
      setConversations(response.data);
      
      // Calculate total unread count from conversations
      const total = response.data.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);
      setTotalUnreadCount(total);
    } catch (err) {
      console.error("Error fetching conversations:", err);
      enqueueSnackbar("Failed to load conversations", { variant: "error" });
    } finally {
      setLoading(false);
    }
  };

  // Fetch messages for a specific chat
  const fetchMessages = async (chatId) => {
    try {
      const response = await chatAPI.getChatMessages(chatId);
      setMessages(response.data);
      
      // Mark messages as read
      if (response.data.length > 0) {
        await chatAPI.markAsRead(chatId, { messageId: response.data[response.data.length - 1]._id });
        // Refresh conversations to update unread counts in sidebar
        await fetchConversations();
      }
    } catch (err) {
      console.error("Error fetching messages:", err);
      enqueueSnackbar("Failed to load messages", { variant: "error" });
    }
  };

  // Send message
  const sendMessage = async (content, mediaFile = null, uploadedMedia = null) => {
    if (!content.trim() && !mediaFile && !uploadedMedia) return;
    if (!selectedChat) return;

    try {
      setSendingMessage(true);
      
      const messageData = {
        content: content || "",
        messageType: uploadedMedia ? uploadedMedia.mediaType : (mediaFile ? 'media' : 'text')
      };

      // Add media data if available
      if (uploadedMedia) {
        messageData.media = {
          type: uploadedMedia.mediaType,
          url: uploadedMedia.url,
          filename: uploadedMedia.originalName,
          size: uploadedMedia.size
        };
      } else if (mediaFile) {
        const formData = new FormData();
        formData.append("content", content);
        formData.append("media", mediaFile);
        
        const response = await chatAPI.sendChatMessage(selectedChat._id, formData);
        setMessages(prev => [...prev, response.data]);
        setMessageText("");
        await fetchConversations();
        return;
      }

      const response = await chatAPI.sendChatMessage(selectedChat._id, messageData);
      setMessages(prev => [...prev, response.data]);
      setMessageText("");
      
      // Refresh conversations to update last message
      await fetchConversations();
    } catch (err) {
      console.error("Error sending message:", err);
      enqueueSnackbar("Failed to send message", { variant: "error" });
    } finally {
      setSendingMessage(false);
    }
  };

  // Handle text message send
  const handleSendMessage = () => {
    if (messageText.trim()) {
      sendMessage(messageText);
    }
  };

  // Handle emoji selection
  const handleEmojiClick = (emojiObject) => {
    setMessageText(prev => prev + emojiObject.emoji);
    setShowEmojiPicker(false);
  };

  // Handle media upload
  const handleMediaUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'video/mp4', 'video/mov', 'video/avi', 'video/webm'];
    if (!allowedTypes.includes(file.type)) {
      enqueueSnackbar('Invalid file type. Only images (jpg, png, gif) and videos (mp4, mov, avi, webm) are allowed.', { variant: 'error' });
      return;
    }

    // Validate file size (50MB for videos, 10MB for images)
    const maxSize = file.type.startsWith('video/') ? 50 * 1024 * 1024 : 10 * 1024 * 1024;
    if (file.size > maxSize) {
      enqueueSnackbar(`File too large. Max size: ${file.type.startsWith('video/') ? '50MB' : '10MB'}`, { variant: 'error' });
      return;
    }

    try {
      setUploadingMedia(true);
      
      // Create preview
      const previewUrl = URL.createObjectURL(file);
      setPreviewMedia({
        file,
        url: previewUrl,
        type: file.type.startsWith('image/') ? 'image' : 'video'
      });

      // Upload file
      const formData = new FormData();
      formData.append('media', file);
      
      const uploadResponse = await uploadAPI.uploadMedia(formData);
      
      // Send message with media
      await sendMessage("", null, uploadResponse.data.file);
      
      // Clear preview
      setPreviewMedia(null);
      URL.revokeObjectURL(previewUrl);
      
    } catch (err) {
      console.error('Error uploading media:', err);
      enqueueSnackbar('Failed to upload media', { variant: 'error' });
      setPreviewMedia(null);
    } finally {
      setUploadingMedia(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Toggle chat pin
  const togglePin = async (chatId, isPinned) => {
    try {
      await chatAPI.updateChatSettings(chatId, { isPinned: !isPinned });
      await fetchConversations();
    } catch (err) {
      console.error("Error toggling pin:", err);
      enqueueSnackbar("Failed to update chat settings", { variant: "error" });
    }
  };

  // Toggle chat mute
  const toggleMute = async (chatId, isMuted) => {
    try {
      await chatAPI.updateChatSettings(chatId, { isMuted: !isMuted });
      await fetchConversations();
    } catch (err) {
      console.error("Error toggling mute:", err);
      enqueueSnackbar("Failed to update chat settings", { variant: "error" });
    }
  };

  // Search conversations
  const searchConversations = async (query) => {
    if (!query.trim()) {
      await fetchConversations();
      return;
    }
    
    try {
      const response = await chatAPI.searchConversations(query);
      setConversations(response.data);
    } catch (err) {
      console.error("Error searching conversations:", err);
    }
  };

  // Create group
  const createGroup = async () => {
    if (!groupName.trim() || selectedUsers.length === 0) {
      enqueueSnackbar("Please enter group name and select members", { variant: "warning" });
      return;
    }

    try {
      const formData = new FormData();
      formData.append("name", groupName);
      formData.append("memberIds", JSON.stringify(selectedUsers.map(u => u._id)));

      const response = await groupAPI.createGroup(formData);
      enqueueSnackbar("Group created successfully!", { variant: "success" });
      
      setShowCreateGroup(false);
      setGroupName("");
      setSelectedUsers([]);
      await fetchConversations();
    } catch (err) {
      console.error("Error creating group:", err);
      enqueueSnackbar("Failed to create group", { variant: "error" });
    }
  };

  // Fetch available users for group creation
  const fetchAvailableUsers = async () => {
    try {
      const response = await groupAPI.getAvailableUsers();
      setAvailableUsers(response.data);
    } catch (err) {
      console.error("Error fetching available users:", err);
    }
  };

  // Format timestamp
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);
    
    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  // Get message status icon
  const getMessageStatusIcon = (message) => {
    if (message.sender._id !== user.id) return null;
    
    switch (message.status) {
      case 'sent':
        return <Check size={12} className="text-blue-200" />;
      case 'delivered':
        return <CheckCheck size={12} className="text-blue-200" />;
      case 'read':
        return <CheckCheck size={12} className="text-blue-100" />;
      default:
        return <Clock size={12} className="text-blue-200" />;
    }
  };

  return (
    <ErrorBoundary>
      <div className="flex h-screen bg-white dark:bg-gray-900">
      {/* Chat Sidebar */}
      <div className="w-1/3 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">Messages</h1>
              {totalUnreadCount > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                  {totalUnreadCount}
                </span>
              )}
            </div>
            <button
              onClick={() => {
                setShowCreateGroup(true);
                fetchAvailableUsers();
              }}
              className="p-2 rounded-full bg-blue-600 text-white hover:bg-blue-700 transition-colors"
            >
              <Plus size={20} />
            </button>
          </div>
          
          {/* Search Bar */}
          <div className="relative">
            <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                searchConversations(e.target.value);
              }}
              className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-4 text-center text-gray-500">Loading conversations...</div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-gray-500">No conversations found</div>
          ) : (
            conversations.map((conversation) => (
              <div
                key={conversation._id}
                onClick={() => setSelectedChat(conversation)}
                className={`flex items-center gap-3 p-4 border-b border-gray-100 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                  selectedChat?._id === conversation._id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                }`}
              >
                {/* Avatar */}
                <div className="relative">
                  <img
                    src={getAvatarSrc(conversation.avatar, conversation.name)}
                    alt={conversation.name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  {conversation.type === 'group' && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-blue-600 rounded-full flex items-center justify-center">
                      <Users size={10} className="text-white" />
                    </div>
                  )}
                </div>

                {/* Conversation Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-gray-900 dark:text-white truncate">
                      {conversation.name}
                    </h3>
                    <div className="flex items-center gap-1">
                      {conversation.isPinned && <Pin size={14} className="text-gray-400" />}
                      {conversation.isMuted && <VolumeX size={14} className="text-gray-400" />}
                      {conversation.unreadCount > 0 && (
                        <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-1 min-w-[20px] text-center">
                          {conversation.unreadCount}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-1">
                    <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                      {conversation.lastMessage?.content || (conversation.hasMessages ? 'No messages yet' : 'Start a conversation')}
                    </p>
                    <span className="text-xs text-gray-500">
                      {conversation.lastMessage?.timestamp ? formatTime(conversation.lastMessage.timestamp) : ''}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Chat Window */}
      <div className="flex-1 flex flex-col bg-white dark:bg-gray-900">
        {selectedChat ? (
          <>
            {/* Chat Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={getAvatarSrc(selectedChat.avatar, selectedChat.name)}
                  alt={selectedChat.name}
                  className="w-10 h-10 rounded-full object-cover cursor-pointer"
                  onClick={() => {
                    if (selectedChat.type === 'group') {
                      // Show group info or handle group profile
                      console.log('Group profile clicked');
                    } else {
                      // Navigate to user profile
                      const otherParticipant = selectedChat.participants?.find(p => p._id !== user.id);
                      if (otherParticipant) {
                        window.location.href = `/profile/${otherParticipant._id}`;
                      }
                    }
                  }}
                />
                <div>
                  <h2 
                    className="font-semibold text-gray-900 dark:text-white cursor-pointer hover:text-blue-600 transition-colors"
                    onClick={() => {
                      if (selectedChat.type === 'group') {
                        // Show group info or handle group profile
                        console.log('Group profile clicked');
                      } else {
                        // Navigate to user profile
                        const otherParticipant = selectedChat.participants?.find(p => p._id !== user.id);
                        if (otherParticipant) {
                          window.location.href = `/profile/${otherParticipant._id}`;
                        }
                      }
                    }}
                  >
                    {selectedChat.name}
                  </h2>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {selectedChat.type === 'group' ? `${selectedChat.participants.length} members` : 'Active now'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => togglePin(selectedChat._id, selectedChat.isPinned)}
                  className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 ${
                    selectedChat.isPinned ? 'text-blue-600' : 'text-gray-400'
                  }`}
                >
                  <Pin size={20} />
                </button>
                <button
                  onClick={() => toggleMute(selectedChat._id, selectedChat.isMuted)}
                  className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 ${
                    selectedChat.isMuted ? 'text-red-500' : 'text-gray-400'
                  }`}
                >
                  {selectedChat.isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
                <button className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400">
                  <MoreVertical size={20} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gradient-to-b from-green-50 to-green-100 dark:from-gray-800 dark:to-gray-900" style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23e5f3e5' fill-opacity='0.1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
              backgroundRepeat: 'repeat'
            }}>
              {messages.map((message, index) => {
                const isOwnMessage = message.sender._id === user.id;
                const prevMessage = index > 0 ? messages[index - 1] : null;
                const showAvatar = !isOwnMessage && (!prevMessage || prevMessage.sender._id !== message.sender._id);
                
                return (
                  <div
                    key={message._id}
                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-1`}
                  >
                    <div className={`flex items-end gap-2 max-w-xs lg:max-w-md ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
                      {/* Avatar for received messages */}
                      {!isOwnMessage && showAvatar && (
                          <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0">
                            <img
                              src={getAvatarSrc(message.sender.avatar, message.sender.username)}
                              alt={message.sender.username}
                              className="w-full h-full object-cover"
                            />
                          </div>
                      )}
                      
                      {/* Spacer for alignment when no avatar */}
                      {!isOwnMessage && !showAvatar && <div className="w-8"></div>}
                      
                      {/* Message bubble */}
                      <div
                        className={`relative px-4 py-2 rounded-2xl shadow-sm ${
                          isOwnMessage
                            ? 'bg-blue-500 text-white rounded-br-md'
                            : 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-bl-md border border-gray-200 dark:border-gray-600'
                        }`}
                        style={{
                          maxWidth: '280px',
                          wordWrap: 'break-word'
                        }}
                      >
                        {/* Media Content */}
                        {message.media && (
                          <div className="mb-2 -mx-2 -mt-2">
                            {message.media.type === 'image' && (
                              <img
                                src={message.media.url}
                                alt="Shared image"
                                className="rounded-t-lg max-h-64 object-cover w-full cursor-pointer"
                                onClick={() => window.open(message.media.url, '_blank')}
                              />
                            )}
                            {message.media.type === 'video' && (
                              <video
                                src={message.media.url}
                                controls
                                className="rounded-t-lg max-h-64 w-full"
                                preload="metadata"
                              >
                                Your browser does not support the video tag.
                              </video>
                            )}
                            {message.media.type === 'audio' && (
                              <audio src={message.media.url} controls className="w-full" />
                            )}
                            {message.media.type === 'document' && (
                              <div className="flex items-center gap-2 p-2 bg-gray-200 dark:bg-gray-600 rounded">
                                <FileText size={20} />
                                <span className="text-sm">{message.media.filename}</span>
                              </div>
                            )}
                          </div>
                        )}
                        
                        {/* Text Content */}
                        {message.content && (
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">
                            {message.content}
                          </p>
                        )}
                        
                        {/* Message Footer */}
                        <div className={`flex items-center gap-1 mt-1 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                          <span className={`text-xs ${isOwnMessage ? 'text-blue-100' : 'text-gray-500'}`}>
                            {formatTime(message.createdAt)}
                          </span>
                          {isOwnMessage && getMessageStatusIcon(message)}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 relative">
              {/* Media Preview */}
              {previewMedia && (
                <div className="mb-3 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {previewMedia.type === 'image' ? 'Image' : 'Video'} preview
                    </span>
                    <button
                      onClick={() => {
                        setPreviewMedia(null);
                        URL.revokeObjectURL(previewMedia.url);
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X size={16} />
                    </button>
                  </div>
                  {previewMedia.type === 'image' ? (
                    <img
                      src={previewMedia.url}
                      alt="Preview"
                      className="mt-2 max-h-32 rounded-lg object-cover"
                    />
                  ) : (
                    <video
                      src={previewMedia.url}
                      className="mt-2 max-h-32 rounded-lg"
                      controls
                    />
                  )}
                </div>
              )}

               <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-700 rounded-full px-4 py-2">
                 {/* Media Upload Button */}
                 <button
                   onClick={() => fileInputRef.current?.click()}
                   disabled={uploadingMedia}
                   className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 disabled:opacity-50 transition-colors"
                   title="Upload media"
                 >
                   {uploadingMedia ? (
                     <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                   ) : (
                     <Paperclip size={20} />
                   )}
                 </button>
                
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleMediaUpload}
                  accept="image/jpeg,image/jpg,image/png,image/gif,video/mp4,video/mov,video/avi,video/webm"
                  className="hidden"
                />
                
                {/* Emoji Button */}
                <button
                  onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                  className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-500 transition-colors"
                  title="Add emoji"
                >
                  <Smile size={20} />
                </button>
                
                {/* Message Input */}
                <input
                  type="text"
                  placeholder="Type a message..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="flex-1 px-3 py-2 bg-transparent text-gray-900 dark:text-white placeholder-gray-500 focus:outline-none"
                />
                
                {/* Send Button */}
                <button
                  onClick={handleSendMessage}
                  disabled={(!messageText.trim() && !previewMedia) || sendingMessage || uploadingMedia}
                  className="p-2 rounded-full bg-blue-500 text-white hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send size={20} />
                </button>
              </div>

              {/* Emoji Picker */}
              {showEmojiPicker && (
                <div className="absolute bottom-16 left-4 z-50 emoji-picker-container">
                  <EmojiPicker
                    onEmojiClick={handleEmojiClick}
                    width={300}
                    height={400}
                    searchDisabled={false}
                    skinTonesDisabled={false}
                    previewConfig={{
                      showPreview: true
                    }}
                  />
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-500 dark:text-gray-400">
            <div className="text-center">
              <Users size={48} className="mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium mb-2">Select a conversation</h3>
              <p>Choose a conversation from the sidebar to start messaging</p>
            </div>
          </div>
        )}
      </div>

      {/* Create Group Modal */}
      {showCreateGroup && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Create Group</h2>
              <button
                onClick={() => setShowCreateGroup(false)}
                className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
              >
                <X size={20} className="text-gray-400" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Group Name
                </label>
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Enter group name..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Add Members
                </label>
                <div className="max-h-40 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg">
                  {availableUsers.map((user) => (
                    <div
                      key={user._id}
                      onClick={() => {
                        if (selectedUsers.find(u => u._id === user._id)) {
                          setSelectedUsers(selectedUsers.filter(u => u._id !== user._id));
                        } else {
                          setSelectedUsers([...selectedUsers, user]);
                        }
                      }}
                      className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 ${
                        selectedUsers.find(u => u._id === user._id) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                      }`}
                    >
                        <img
                          src={getAvatarSrc(user.avatar, user.username)}
                          alt={user.username}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      <span className="text-sm text-gray-900 dark:text-white">
                        {user.getFullName?.() || user.username}
                      </span>
                      {selectedUsers.find(u => u._id === user._id) && (
                        <Check size={16} className="text-blue-600 ml-auto" />
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowCreateGroup(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createGroup}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Create Group
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </ErrorBoundary>
  );
};

export default Chat;