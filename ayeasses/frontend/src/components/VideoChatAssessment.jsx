import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import HeygenPlayer from './HeygenPlayer';
import assessmentService from '../services/assessmentService';
import heygenService from '../services/heygenService';
import { toast } from 'react-hot-toast';

const VideoChatAssessment = () => {
  const { uuid } = useParams();
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
  const [accessToken, setAccessToken] = useState(null);
  const [timer, setTimer] = useState(0);

  // Debug state changes
  useEffect(() => {
    console.log('🔍 State updated - streamUrl:', streamUrl ? `${streamUrl.substring(0, 50)}...` : 'None');
  }, [streamUrl]);

  useEffect(() => {
    console.log('🔍 State updated - accessToken:', accessToken ? `${typeof accessToken} - ${accessToken.substring(0, 20)}...` : 'None');
  }, [accessToken]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const messagesEndRef = useRef(null);
  const sessionInitializedRef = useRef(false);

  // Memoized callbacks to prevent re-renders
  const handlePlayerReady = useCallback(() => {
    console.log('Player ready');
  }, []);

  const handlePlayerError = useCallback((error) => {
    console.error('Player error:', error);
    setError(error.message);
  }, []);

  // Timer effect
  useEffect(() => {
    const interval = setInterval(() => {
      setTimer(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Format timer
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

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
        const storedAssessment = sessionStorage.getItem(`assessment_${uuid}`);
        if (storedAssessment) {
          setAssessment(JSON.parse(storedAssessment));
        } else {
          // Fallback to API call if needed
          const result = await assessmentService.getPublicAssessment(uuid);
          if (result.success) {
            setAssessment(result.data);
            sessionStorage.setItem(`assessment_${uuid}`, JSON.stringify(result.data));
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

    if (uuid) {
      loadAssessment();
    }
  }, [uuid]);

  // Initialize session data and send initial hi
  useEffect(() => {
    const initializeSession = async () => {
      if (sessionInitializedRef.current) {
        return; // hard guard to avoid duplicate runs
      }

      if (!assessment) {
        console.log('Assessment not loaded yet, waiting...');
        return;
      }

      if (hasSentInitialHi) {
        console.log('Initial hi already sent, skipping...');
        return;
      }

      // Lock immediately to prevent any re-entry while awaiting
      sessionInitializedRef.current = true;

      try {
        setIsLoading(true);
        setError(null);
        console.log('Initializing HeyGen session...');

        const heygenResult = await heygenService.getDirectStreamUrl({
          avatarName: 'Ann_Doctor_Sitting_public',
          quality: 'high',
          voiceSettings: {
            rate: 1,
            emotion: 'excited'
          }
        });

        if (heygenResult.success) {
          console.log('✅ HeyGen stream created:', {
            url: heygenResult.streamUrl,
            sessionId: heygenResult.sessionId,
            hasToken: !!heygenResult.accessToken
          });

          const newSessionData = {
            streamUrl: heygenResult.streamUrl,
            sessionId: heygenResult.sessionId,
            accessToken: heygenResult.accessToken,
            iceServers: heygenResult.iceServers,
            userId: '6511534f6966f424d53bda75',
            userName: 'Dnyaneshwar Naiknavare',
            avatarConfig: assessment?.avatarConfig
          };

          sessionStorage.setItem(`assessmentSession_${uuid}`, JSON.stringify(newSessionData));
          setStreamUrl(heygenResult.streamUrl);
          setAccessToken(typeof heygenResult.accessToken === 'string' ? heygenResult.accessToken : String(heygenResult.accessToken || ''));
          setChatSessionId(heygenResult.sessionId);

          await sendInitialHi();
        } else {
          console.error('HeyGen session create failed:', heygenResult.error);
          setError(heygenResult.error || 'Failed to create HeyGen session');
          // Allow retry on next user navigation by unlocking
          sessionInitializedRef.current = false;
        }
      } catch (err) {
        console.error('Error initializing session:', err);
        setError(err.message);
        sessionInitializedRef.current = false; // allow retry if needed
      } finally {
        setIsLoading(false);
      }
    };

    initializeSession();
  }, [uuid, assessment, hasSentInitialHi]);

  // Send initial hi message (same as AssessmentProgress)
  const sendInitialHi = async () => {
    try {
      console.log('Sending initial hi...');
      
      // Get questionsFileId from assessment
      let questionsFileId = assessment?.questionsFileId;
      if (!questionsFileId) {
        console.log('questionsFileId not available, fetching fresh assessment data...');
        const result = await assessmentService.getPublicAssessment(uuid);
        if (result.success && result.data.questionsFileId) {
          questionsFileId = result.data.questionsFileId;
          setAssessment(result.data);
          console.log('Fresh questionsFileId fetched:', questionsFileId);
        }
      }

      if (!questionsFileId) {
        console.error('Could not get questionsFileId');
        setError('Failed to get assessment data');
        return;
      }

      // Get session data from session storage (new session data)
      const storedSession = sessionStorage.getItem(`assessmentSession_${uuid}`);
      let currentSessionData = null;
      if (storedSession) {
        currentSessionData = JSON.parse(storedSession);
      }

      // Call AvatarAI API directly with initial hi
      const result = await assessmentService.callAvatarAIDirectly(
        'hi', // user_reply
        questionsFileId, // course_id
        currentSessionData?.userId || '6511534f6966f424d53bda75', // user_id
        currentSessionData?.userName || 'Dnyaneshwar Naiknavare', // user_name
        chatSessionId || `session_${Date.now()}`, // chat_session_id
        currentSessionData?.avatarConfig?.avatarPersona === 'dr-jane-doe' ? 'Dr. Jane Doe' : 'Dr. Jacob Jones', // doctor_name
        currentSessionData?.avatarConfig?.avatarPersona === 'dr-jane-doe' ? '/assets/images/doctor2.png' : '/assets/images/doctor1.png', // doctor_avatar
        currentSessionData?.avatarConfig?.voiceTone || 'Formal', // doctor_tone
        currentSessionData?.avatarConfig?.emotionalStyle || 'Excited', // doctor_mood
        undefined, // message_id
        currentSessionData?.avatarConfig?.welcomeMessage || "Welcome to this assessment! I'm here to guide you through this learning experience." // welcome_message
      );

      if (result.success) {
        console.log('Initial hi sent successfully:', result.data);
        
        const nextQuestion = result.data.next_question;
        const aiResponse = result.data.response || result.data.message || result.data.reply || 'Thank you for joining us. Let\'s begin your assessment.';
        
        setMessages([{
          id: Date.now(),
          type: 'avatar',
          text: nextQuestion || aiResponse,
          timestamp: new Date()
        }]);

        if (nextQuestion) {
          setCurrentQuestion(nextQuestion);
        }

        if (result.sessionId) {
          setChatSessionId(result.sessionId);
        }

        setHasSentInitialHi(true);
        console.log('✅ Initial hi sent and session initialized');
      } else {
        throw new Error(result.error || 'Failed to send initial hi');
      }
    } catch (error) {
      console.error('Error sending initial hi:', error);
      setError(error.message);
    }
  };

  // Send message to avatar (same flow as AssessmentProgress)
  const handleSendMessage = async (text) => {
    if (!text.trim() || !hasSentInitialHi) return;

    const messageId = Date.now();
    const userMessage = {
      id: messageId,
      type: 'user',
      text: text.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setError(null); // Clear any previous errors

    try {
      console.log('handleSendMessage - assessment.questionsFileId:', assessment?.questionsFileId);
      
      // If questionsFileId is not available, fetch fresh assessment data
      let questionsFileId = assessment?.questionsFileId;
      if (!questionsFileId) {
        console.log('questionsFileId not available, fetching fresh assessment data...');
        const result = await assessmentService.getPublicAssessment(uuid);
        if (result.success && result.data.questionsFileId) {
          questionsFileId = result.data.questionsFileId;
          setAssessment(result.data);
          console.log('Fresh questionsFileId fetched:', questionsFileId);
        }
      }
      
      if (!questionsFileId) {
        console.error('Could not get questionsFileId');
        setError('Failed to get assessment data');
        return;
      }

      // Get session data from session storage (new session data)
      const storedSession = sessionStorage.getItem(`assessmentSession_${uuid}`);
      let currentSessionData = null;
      if (storedSession) {
        currentSessionData = JSON.parse(storedSession);
      }
      
      // Call AvatarAI API directly from frontend (same as AssessmentProgress)
      const result = await assessmentService.callAvatarAIDirectly(
        text.trim(), // user_reply
        questionsFileId, // course_id - use questions_file_id for AvatarAI API
        currentSessionData?.userId || '6511534f6966f424d53bda75', // user_id with fallback
        currentSessionData?.userName || 'Dnyaneshwar Naiknavare', // user_name with fallback
        chatSessionId || `session_${Date.now()}`, // chat_session_id - use existing or create new
        currentSessionData?.avatarConfig?.avatarPersona === 'dr-jane-doe' ? 'Dr. Jane Doe' : 'Dr. Jacob Jones', // doctor_name
        currentSessionData?.avatarConfig?.avatarPersona === 'dr-jane-doe' ? '/assets/images/doctor2.png' : '/assets/images/doctor1.png', // doctor_avatar
        currentSessionData?.avatarConfig?.voiceTone || 'Formal', // doctor_tone
        currentSessionData?.avatarConfig?.emotionalStyle || 'Excited', // doctor_mood
        undefined, // message_id (will be omitted if undefined)
        currentSessionData?.avatarConfig?.welcomeMessage || "Welcome to this assessment! I'm here to guide you through this learning experience." // welcome_message
      );
      
      if (result.success) {
        console.log('AvatarAI response:', result.data);
        
        const nextQuestion = result.data.next_question;
        const aiResponse = result.data.response || result.data.message || result.data.reply || 'Thank you for your response.';
        
        const avatarResponse = {
          id: messageId + 1,
          type: 'avatar',
          text: nextQuestion || aiResponse,
          timestamp: new Date()
        };

        setMessages(prev => [...prev, avatarResponse]);

        if (nextQuestion) {
          setCurrentQuestion(nextQuestion);
        }

        if (result.sessionId) {
          setChatSessionId(result.sessionId);
        }
        
        console.log('AvatarAI response with session:', {
          sessionId: result.sessionId,
          response: avatarResponse.text
        });

        // Send text to HeyGen avatar to make it speak
        if (currentSessionData?.sessionId) {
          console.log('🔍 Sending text to HeyGen avatar to speak...');
          const heygenResult = await heygenService.sendTextToAvatar(
            currentSessionData.sessionId,
            nextQuestion || aiResponse
          );
          
          if (heygenResult.success) {
            console.log('✅ Text sent to HeyGen avatar successfully');
            
            // Ensure LiveKit connection is ready
            await heygenService.ensureLiveKitConnection(
              currentSessionData.sessionId,
              currentSessionData.streamUrl,
              currentSessionData.accessToken
            );
          } else {
            console.warn('⚠️ Failed to send text to HeyGen avatar:', heygenResult.error);
          }
        }
      } else {
        throw new Error(result.error || 'Failed to get response');
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setError(err.message);
      
      const errorMessage = {
        id: messageId + 1,
        type: 'avatar',
        text: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    }
  };

  // Handle form submission
  const handleSubmit = (e) => {
    e.preventDefault();
    handleSendMessage(inputMessage);
  };

  const handleEndAssessment = async () => {
    try {
      // Clear session data first
      sessionStorage.removeItem(`assessmentSession_${uuid}`);
      sessionStorage.removeItem(`assessment_${uuid}`);
      
      // Try to stop assessment if API is available
      try {
        const result = await assessmentService.stopAssessment(uuid);
        if (result.success) {
          toast.success('Assessment completed successfully!');
        }
      } catch (apiError) {
        console.log('API stop assessment failed, but continuing with cleanup');
      }
      
      // Navigate to dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error('Error ending assessment:', error);
      toast.error('Failed to end assessment');
      // Still navigate to dashboard even if there's an error
      navigate('/dashboard');
    }
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
          <div className="flex justify-between items-center py-2 sm:py-3 lg:py-4">
            <div className="flex items-center space-x-2 lg:space-x-4">
              <div className="w-6 h-6 sm:w-8 sm:h-8 lg:w-10 lg:h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                <svg className="w-3 h-3 sm:w-4 sm:h-4 lg:w-6 lg:h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838l-2.727 1.17 1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="text-sm sm:text-base lg:text-lg font-semibold text-purple-600 truncate">
                  {assessment?.title || 'Assessment'}
                </h1>
                <p className="text-xs lg:text-sm text-gray-600 truncate">
                  {assessment?.category || 'Healthcare'} | {assessment?.difficultyLevel || 'Advanced'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 lg:space-x-4">
              <div className="text-right">
                <div className="text-sm sm:text-lg lg:text-2xl font-mono text-gray-900">{formatTime(timer)}</div>
                <div className="text-xs text-gray-500">Time</div>
              </div>
              <button
                onClick={handleEndAssessment}
                className="bg-orange-600 hover:bg-orange-700 text-white px-2 py-1 sm:px-3 sm:py-1 lg:px-4 lg:py-2 rounded-lg font-medium text-xs sm:text-sm lg:text-base whitespace-nowrap"
              >
                End Assessment
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8 py-2 sm:py-4 w-full">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 sm:gap-4 lg:gap-8 h-[calc(100vh-200px)] sm:h-[calc(100vh-240px)] lg:h-[calc(100vh-280px)]">
            {/* Transcript Panel (Left) */}
            <div className="lg:col-span-1 min-h-0">
              <div className="bg-white rounded-lg shadow-sm border p-2 sm:p-4 lg:p-6 h-full flex flex-col">
                <h2 className="text-base sm:text-lg lg:text-xl font-semibold mb-2 sm:mb-3 lg:mb-4 text-gray-900">Transcript</h2>
                
                {/* Messages */}
                <div className="flex-1 overflow-y-auto mb-2 sm:mb-3 lg:mb-4 space-y-1 sm:space-y-2 lg:space-y-3">
                  {messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div className="flex items-start space-x-1 sm:space-x-2 max-w-full">
                        {message.type === 'user' && (
                          <div className="w-5 h-5 sm:w-6 sm:h-6 lg:w-8 lg:h-8 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                            <svg className="w-2.5 h-2.5 sm:w-3 sm:h-3 lg:w-4 lg:h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                            </svg>
                          </div>
                        )}
                        <div
                          className={`max-w-[75%] sm:max-w-[70%] lg:max-w-xs px-2 py-1 sm:px-3 sm:py-2 lg:px-3 lg:py-2 rounded-lg ${
                            message.type === 'user'
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-200 text-gray-800'
                          }`}
                        >
                          <p className="text-xs sm:text-sm lg:text-sm break-words leading-relaxed">{message.text}</p>
                          <p className="text-xs opacity-75 mt-1">
                            {message.timestamp.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              </div>
            </div>

            {/* Video Panel (Right) */}
            <div className="lg:col-span-1 min-h-0">
              <div className="bg-white rounded-lg shadow-sm border p-2 sm:p-4 lg:p-6 h-full flex flex-col">
                <div className="flex items-center justify-between mb-2 sm:mb-3 lg:mb-4">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 truncate">Dr. Ann</h2>
                    <p className="text-xs lg:text-sm text-gray-600 truncate">Tone: Formal | Emotion: Excited</p>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        sessionStorage.removeItem(`assessmentSession_${uuid}`);
                        sessionStorage.removeItem(`assessment_${uuid}`);
                        toast.success('Session cleared! Please refresh the page.');
                      }}
                      className="bg-red-600 hover:bg-red-700 text-white px-2 py-1 lg:px-3 lg:py-1 rounded text-xs lg:text-sm flex items-center space-x-1"
                      title="Clear old session data to use new URL"
                    >
                      <svg className="w-3 h-3 lg:w-4 lg:h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      <span className="hidden sm:inline">Clear Session</span>
                    </button>
                    <button
                      onClick={() => navigate(`/assessment/${uuid}/progress`, { state: { sessionData } })}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 lg:px-3 lg:py-1 rounded text-xs lg:text-sm flex items-center space-x-1"
                    >
                      <svg className="w-3 h-3 lg:w-4 lg:h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                      </svg>
                      <span className="hidden sm:inline">Switch to Text Chat</span>
                    </button>
                    <button
                      onClick={() => navigate(`/assessment/${uuid}/text`, { state: { sessionData } })}
                      className="bg-green-600 hover:bg-green-700 text-white px-2 py-1 lg:px-3 lg:py-1 rounded text-xs lg:text-sm flex items-center space-x-1"
                    >
                      <svg className="w-3 h-3 lg:w-4 lg:h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                      </svg>
                      <span className="hidden sm:inline">Switch to Text Assessment</span>
                    </button>
                  </div>
                </div>
                
                <div className="flex-1 relative min-h-0">
                  <HeygenPlayer
                    key={`${streamUrl}-${accessToken}`}
                    streamUrl={streamUrl}
                    accessToken={accessToken}
                    avatarSettings={assessment?.avatarConfig}
                    onError={handlePlayerError}
                    onReady={handlePlayerReady}
                    className="w-full h-full"
                  />
                  
                  {/* Debug info */}
                  <div className="absolute top-0 left-0 bg-black bg-opacity-75 text-white text-xs p-2 rounded">
                    <div>URL: {streamUrl ? `${streamUrl.substring(0, 50)}...` : 'None'}</div>
                    <div>Token: {accessToken ? `${typeof accessToken} - ${accessToken.substring(0, 20)}...` : 'None'}</div>
                    <div>Loading: {isLoading ? 'Yes' : 'No'}</div>
                    <div>Error: {error || 'None'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Input Bar */}
      <div className="bg-white border-t border-gray-200 px-2 sm:px-4 lg:px-4 py-2 lg:py-3">
        <div className="max-w-7xl mx-auto flex items-center space-x-2 lg:space-x-4">
          {/* Left Side - Controls */}
          <div className="flex items-center space-x-1 sm:space-x-2 lg:space-x-3">
            <button className="p-1 lg:p-2 text-gray-500 hover:text-gray-700">
              <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 5a2 2 0 00-2 2v8a2 2 0 002 2h12a2 2 0 002-2V7a2 2 0 00-2-2h-1.586a1 1 0 01-.707-.293l-1.121-1.121A2 2 0 0011.172 3H8.828a2 2 0 00-1.414.586L6.293 4.707A1 1 0 015.586 5H4zm6 9a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
            </button>
            <button className="p-1 lg:p-2 text-gray-500 hover:text-gray-700">
              <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
              </svg>
            </button>
            <button className="p-1 lg:p-2 text-gray-500 hover:text-gray-700">
              <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.793L4.5 14H2a1 1 0 01-1-1V7a1 1 0 011-1h2.5l3.883-3.793a1 1 0 011.617.793zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>

          {/* Middle - Input Field */}
          <div className="flex-1 min-w-0">
            <form onSubmit={handleSubmit} className="flex items-center">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                placeholder="Type your response"
                className="w-full px-2 sm:px-3 lg:px-4 py-1 sm:py-1.5 lg:py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm lg:text-base"
                disabled={!hasSentInitialHi}
              />
            </form>
          </div>

          {/* Right Side - Send Button */}
          <button
            onClick={() => handleSendMessage(inputMessage)}
            disabled={!inputMessage.trim() || !hasSentInitialHi}
            className="p-1 lg:p-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed ml-2"
          >
            <svg className="w-4 h-4 lg:w-5 lg:h-5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default VideoChatAssessment;
