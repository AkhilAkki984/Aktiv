# 🤖 AI Fitness Coach Setup Guide

## Overview
This guide will help you set up the AI Fitness Coach feature in your Aktiv fitness app. The AI Coach provides personalized fitness advice, workout plans, and motivation to users.

## Features Implemented

### ✅ Frontend Components
- **AICoachPopup**: Welcome popup that appears for 5 seconds on first login
- **AICoachChat**: Full-featured chat interface with the AI Coach
- **AICoachButton**: Floating chat button that remains visible
- **Dashboard Integration**: Seamlessly integrated into the main dashboard

### ✅ Backend Integration
- **Google Gemini AI Integration**: Powered by Google's Gemini Pro model
- **User Context Awareness**: AI remembers user's goals, preferences, and activity
- **Personalized Responses**: Tailored advice based on user data
- **Fallback Handling**: Graceful error handling with fallback responses

## Setup Instructions

### 1. Environment Variables
Create a `.env` file in the `backend` directory with:

```env
# Required for AI Coach
GEMINI_API_KEY=your_gemini_api_key_here

# Other existing variables
MONGODB_URI=mongodb://localhost:27017/aktiv
JWT_SECRET=your_jwt_secret_here
PORT=5000
```

### 2. Get Google Gemini API Key
1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy the generated API key
5. Add it to your `.env` file as `GEMINI_API_KEY`

### 3. Install Dependencies
The Google Generative AI package has been added to `package.json`. Run:

```bash
cd backend
npm install
```

### 4. Start the Application
```bash
# Backend
cd backend
npm run dev

# Frontend (in another terminal)
cd frontend
npm run dev
```

## How It Works

### User Experience Flow
1. **First Login**: User sees welcome popup for 5 seconds
2. **Popup Auto-hides**: After 5 seconds, popup disappears
3. **Chat Button**: Floating chat icon remains in bottom-right corner
4. **Chat Interface**: Clicking opens full chat dialog
5. **AI Responses**: AI provides personalized fitness advice

### AI Coach Capabilities
- **Personalized Advice**: Based on user's goals, preferences, and activity
- **Context Awareness**: Remembers user's fitness journey
- **Motivational Support**: Encourages and guides users
- **Practical Tips**: Provides actionable workout and nutrition advice
- **Goal Tracking**: References user's active goals and progress

### Technical Implementation
- **Frontend**: React components with Framer Motion animations
- **Backend**: Express.js routes with Google Gemini AI integration
- **Database**: Uses existing User, Goal, and CheckIn models
- **Authentication**: Protected routes with JWT tokens

## API Endpoints

### POST `/api/ai-coach/chat`
Send a message to the AI Coach
```json
{
  "message": "I want to lose weight",
  "userId": "user_id",
  "username": "username"
}
```

### GET `/api/ai-coach/suggestions`
Get personalized suggestions based on user data
```json
{
  "userId": "user_id"
}
```

## Customization Options

### 1. AI Personality
Modify the system prompt in `backend/routes/aiCoach.js` to change the AI's personality:
- More motivational
- More technical
- More casual
- More professional

### 2. Response Length
Adjust `max_tokens` in the OpenAI API call to control response length:
```javascript
max_tokens: 500, // Increase for longer responses
```

### 3. AI Model
Change the AI model in `backend/routes/aiCoach.js`:
```javascript
model: "gpt-3.5-turbo", // or "gpt-4" for better responses
```

### 4. Popup Timing
Modify the auto-hide duration in `AICoachPopup.jsx`:
```javascript
setTimeout(() => {
  setIsVisible(false);
}, 5000); // Change to desired milliseconds
```

## Troubleshooting

### Common Issues

1. **Google Gemini API Key Not Working**
   - Verify the API key is correct
   - Check if you have sufficient quota
   - Ensure the key has the right permissions

2. **AI Responses Not Personal**
   - Check if user data is being fetched correctly
   - Verify the user context is being passed to the AI

3. **Chat Not Opening**
   - Check browser console for errors
   - Verify the API endpoints are working
   - Check authentication token

4. **Popup Not Showing**
   - Clear localStorage: `localStorage.removeItem('hasSeenAICoachPopup')`
   - Check if user is logged in
   - Verify component imports

### Debug Mode
Add console logs to debug issues:
```javascript
console.log('User context:', userContext);
console.log('AI response:', aiResponse);
```

## Future Enhancements

### Potential Features
1. **Voice Chat**: Add speech-to-text and text-to-speech
2. **Image Analysis**: Analyze workout form photos
3. **Progress Tracking**: AI-powered progress analysis
4. **Workout Generation**: AI-created custom workout plans
5. **Nutrition Advice**: Meal planning and nutrition tips
6. **Integration**: Connect with fitness trackers and wearables

### Advanced AI Features
1. **Multi-modal AI**: Text, image, and voice interactions
2. **Predictive Analytics**: Predict user behavior and suggest interventions
3. **Personalized Content**: AI-generated workout videos and guides
4. **Social AI**: AI-powered partner matching and group coaching

## Cost Considerations

### Google Gemini API Costs
- **Gemini Pro**: Free tier available with generous limits
- **Typical conversation**: 500-1000 tokens per exchange
- **Estimated cost**: Free for most use cases, very affordable for production

### Optimization Tips
1. **Cache responses** for common questions
2. **Limit response length** with max_tokens
3. **Use context efficiently** to reduce token usage
4. **Implement rate limiting** to prevent abuse

## Security Considerations

1. **API Key Protection**: Never expose OpenAI API key to frontend
2. **Input Validation**: Sanitize user inputs before sending to AI
3. **Rate Limiting**: Implement rate limits to prevent abuse
4. **Content Filtering**: Filter inappropriate AI responses
5. **User Privacy**: Don't store sensitive user data in AI context

## Support

If you encounter any issues:
1. Check the browser console for errors
2. Verify all environment variables are set
3. Test the API endpoints directly
4. Check the backend logs for errors

The AI Coach is now ready to help your users achieve their fitness goals! 🎯💪
