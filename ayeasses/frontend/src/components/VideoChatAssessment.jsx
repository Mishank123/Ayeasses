import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import HeygenPlayer from './HeygenPlayer';
import assessmentService from '../services/assessmentService';
import heygenService from '../services/heygenService';

const VideoChatAssessment = () => {
  const { assessmentId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const sessionData = location.state?.sessionData;

  const [assessment, setAssessment] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [hasSentInitialHi, setHasSentInitialHi] = useState(false);
  const [chatSessionId, setChatSessionId] = useState(null);
  const [streamUrl, setStreamUrl] = useState(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [spokenText, setSpokenText] = useState('');
  
  // New state for Heygen API flow
  const [heygenToken, setHeygenToken] = useState(null);
  const [heygenStreamId, setHeygenStreamId] = useState(null);

  const videoRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load assessment data
  useEffect(() => {
    const loadAssessment = async () => {
      try {
        setIsLoading(true);
        
        // Get assessment details from session storage or API
        const storedAssessment = sessionStorage.getItem(`assessment_${assessmentId}`);
        if (storedAssessment) {
          setAssessment(JSON.parse(storedAssessment));
        } else {
          // Fallback to API call if needed
          const result = await assessmentService.getAssessmentById(assessmentId);
          if (result.success) {
            setAssessment(result.data);
            sessionStorage.setItem(`assessment_${assessmentId}`, JSON.stringify(result.data));
          } else {
            throw new Error('Failed to load assessment');
          }
        }
      } catch (err) {
        console.error('Error loading assessment:', err);
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };

    if (assessmentId) {
      loadAssessment();
    }
  }, [assessmentId]);

  // Initialize Heygen streaming session with correct API flow
  useEffect(() => {
    const initializeHeygenSession = async () => {
      if (!assessment) return;

      try {
        console.log('Initializing Heygen streaming session with proper session management...');
        
        // Use assessmentService to handle both Heygen and backend session management
        const result = await assessmentService.startAssessment(
          assessmentId,
          'video',
          sessionData?.userData || {}
        );

        if (!result.success) {
          throw new Error(result.error || 'Failed to start assessment');
        }

        console.log('✅ Assessment session started successfully:', result.data);

        // Set the stream URL from the result
        if (result.data.streamUrl) {
          setStreamUrl(result.data.streamUrl);
          console.log('✅ WebRTC URL set:', result.data.streamUrl);
        }

        // Set Heygen session ID if available
        if (result.data.heygenSessionId) {
          setHeygenStreamId(result.data.heygenSessionId);
          console.log('✅ Heygen session ID set:', result.data.heygenSessionId);
        }

        // Handle existing session case
        if (result.data.existingSession) {
          console.log('✅ Using existing session:', result.data.sessionId);
          setChatSessionId(result.data.sessionId);
        }

        // Send initial welcome message if we have a Heygen session
        if (result.data.heygenSessionId) {
          const userData = sessionData?.userData || {};
          const doctorName = userData.doctor_name || assessment?.avatarConfig?.doctorName || 'Dr. AI Assistant';
          const userName = userData.user_name || 'User';
          const doctorTone = userData.doctor_tone || assessment?.avatarConfig?.tone || 'Formal';
          const doctorMood = userData.doctor_mood || assessment?.avatarConfig?.mood || 'excited';
          
          const welcomeMessage = userData.welcome_message || assessment?.avatarConfig?.welcomeMessage || 
            `Welcome ${userName}! I'm ${doctorName}, and I'm here to guide you through this learning experience. Let's begin your assessment.`;
          
          const textResult = await heygenService.sendTextToAvatar(result.data.heygenSessionId, welcomeMessage);
          if (textResult.success) {
            setSpokenText(welcomeMessage);
            setIsSpeaking(true);
            setTimeout(() => setIsSpeaking(false), 5000);
            console.log('✅ Welcome message sent successfully');
          }
        }

        setHasSentInitialHi(true);
        
        // Add welcome message to chat
        const userData = sessionData?.userData || {};
        const doctorName = userData.doctor_name || assessment?.avatarConfig?.doctorName || 'Dr. AI Assistant';
        const userName = userData.user_name || 'User';
        const welcomeMessage = userData.welcome_message || assessment?.avatarConfig?.welcomeMessage || 
          `Welcome ${userName}! I'm ${doctorName}, and I'm here to guide you through this learning experience. Let's begin your assessment.`;
        
        setMessages([{
          id: Date.now(),
          type: 'avatar',
          text: welcomeMessage,
          timestamp: new Date()
        }]);

        console.log('🎉 Assessment session initialized successfully');

      } catch (err) {
        console.error('Error initializing assessment session:', err);
        setError(err.message);
      }
    };

    if (assessment && !hasSentInitialHi) {
      initializeHeygenSession();
    }
  }, [assessment, hasSentInitialHi, assessmentId, sessionData]);

  // Send message to avatar
  const handleSendMessage = async (text) => {
    if (!text.trim()) return;

    const messageId = Date.now();
    const userMessage = {
      id: messageId,
      type: 'user',
      text: text.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');

    try {
      // Extract user data from session data
      const userData = sessionData?.userData || {};
      const courseId = userData.course_id || assessment?.id;
      const userId = userData.user_id || 'default-user';
      const userName = userData.user_name || 'User';
      const doctorName = userData.doctor_name || assessment?.avatarConfig?.doctorName || 'Dr. AI Assistant';
      const doctorAvatar = userData.doctor_avatar || assessment?.avatarConfig?.avatarImage || '/assets/images/doctor1.png';
      const doctorTone = userData.doctor_tone || assessment?.avatarConfig?.tone || 'Formal';
      const doctorMood = userData.doctor_mood || assessment?.avatarConfig?.mood || 'excited';
      const welcomeMessage = userData.welcome_message || assessment?.avatarConfig?.welcomeMessage || "Welcome to this assessment! I'm here to guide you through this learning experience.";

      // Generate unique session ID for this interaction
      const uniqueSessionId = `session_${Date.now()}`;
      const uniqueMessageId = `msg_${Date.now()}`;

      // Call AvatarAI directly with unique session data
      const result = await assessmentService.callAvatarAIDirectly(
        text.trim(),
        courseId,
        userId,
        userName,
        uniqueSessionId,
        doctorName,
        doctorAvatar,
        doctorTone,
        doctorMood,
        uniqueMessageId,
        welcomeMessage
      );

      if (result.success) {
        const avatarResponse = {
          id: messageId + 1,
          type: 'avatar',
          text: result.data.response || result.data.message || 'Thank you for your response.',
          timestamp: new Date()
        };

        setMessages(prev => [...prev, avatarResponse]);

        // Send response to Heygen avatar using the stored session_id
        if (heygenStreamId) {
          const textResult = await heygenService.sendTextToAvatar(heygenStreamId, avatarResponse.text);
          if (textResult.success) {
            setSpokenText(avatarResponse.text);
            setIsSpeaking(true);
            setTimeout(() => setIsSpeaking(false), 5000);
          }
        }

        // Update chat session ID with the new unique session ID
        setChatSessionId(uniqueSessionId);
        
        console.log('AvatarAI response with unique session:', {
          sessionId: uniqueSessionId,
          messageId: uniqueMessageId,
          response: avatarResponse.text
        });
      } else {
        throw new Error(result.error || 'Failed to get response');
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err.message);
    }
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    handleSendMessage(inputMessage);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading assessment...</p>
        </div>
      </div>
    );
  }

  if (error && !assessment) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <svg className="w-12 h-12 mx-auto" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {assessment?.title || 'Video Assessment'}
              </h1>
              <p className="text-gray-600">
                {assessment?.description || 'Interactive video assessment with AI avatar'}
              </p>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg"
            >
              Exit Assessment
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Video Chat Section */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-xl font-semibold mb-4">Video Chat</h2>
              
              <HeygenPlayer
                streamUrl={streamUrl || 'webrtc://mock-stream'}
                avatarSettings={assessment?.avatarConfig}
                spokenText={spokenText}
                isSpeaking={isSpeaking}
                onError={(error) => {
                  console.error('Player error:', error);
                  setError(error.message);
                }}
                onReady={() => {
                  console.log('Player ready');
                }}
                className="mb-6"
              />

              {/* Error Display */}
              {error && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4">
                  <strong>Error:</strong> {error}
                </div>
              )}

              {/* Debug Info */}
              {process.env.NODE_ENV === 'development' && (
                <div className="bg-gray-100 border border-gray-300 text-gray-700 px-4 py-3 rounded-lg mb-4 text-sm">
                  <strong>Debug Info:</strong><br />
                  Token: {heygenToken ? '✅ Set' : '❌ Not set'}<br />
                  Stream ID: {heygenStreamId ? '✅ Set' : '❌ Not set'}<br />
                  Stream URL: {streamUrl || '❌ Not set'}
                </div>
              )}
            </div>
          </div>

          {/* Chat Messages Section */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border p-6 h-96 flex flex-col">
              <h2 className="text-xl font-semibold mb-4">Chat History</h2>
              
              {/* Messages */}
              <div className="flex-1 overflow-y-auto mb-4 space-y-3">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs px-3 py-2 rounded-lg ${
                        message.type === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-200 text-gray-800'
                      }`}
                    >
                      <p className="text-sm">{message.text}</p>
                      <p className="text-xs opacity-75 mt-1">
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <form onSubmit={handleSubmit} className="flex space-x-2">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Type your message..."
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={!hasSentInitialHi}
                />
                <button
                  type="submit"
                  disabled={!inputMessage.trim() || !hasSentInitialHi}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Send
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoChatAssessment;
