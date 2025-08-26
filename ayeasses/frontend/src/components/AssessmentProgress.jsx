import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import HeygenPlayer from './HeygenPlayer';
import assessmentService from '../services/assessmentService';

const AssessmentProgress = () => {
  const { uuid } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [assessment, setAssessment] = useState(null);
  const [sessionData, setSessionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [playerReady, setPlayerReady] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [userResponse, setUserResponse] = useState('');
  const [isResponding, setIsResponding] = useState(false);
  const [chatSessionId, setChatSessionId] = useState(null);

  useEffect(() => {
    loadAssessmentData();
  }, [uuid]);

  // Send initial "hi" message when component loads
  useEffect(() => {
    if (assessment && sessionData && !currentQuestion) {
      sendInitialHi();
    }
  }, [assessment, sessionData]);

  // Debug: Monitor currentQuestion changes
  useEffect(() => {
    console.log('🔄 currentQuestion state updated:', currentQuestion);
  }, [currentQuestion]);

  const sendInitialHi = async () => {
    try {
      console.log('sendInitialHi - assessment:', assessment);
      console.log('sendInitialHi - assessment.questionsFileId:', assessment?.questionsFileId);
      
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
        return;
      }
      
      const result = await assessmentService.sendInitialHi(
        questionsFileId, // course_id - use questions_file_id for AvatarAI API
        sessionData.userId || '6511534f6966f424d53bda75', // user_id with fallback
        sessionData.userName || 'Dnyaneshwar Naiknavare', // user_name with fallback
        sessionData.avatarConfig?.avatarPersona === 'dr-jane-doe' ? 'Dr. Jane Doe' : 'Dr. Jacob Jones', // doctor_name
        sessionData.avatarConfig?.avatarPersona === 'dr-jane-doe' ? '/assets/images/doctor2.png' : '/assets/images/doctor1.png', // doctor_avatar
        sessionData.avatarConfig?.voiceTone || 'Formal', // doctor_tone
        sessionData.avatarConfig?.emotionalStyle || 'Excited', // doctor_mood
        sessionData.avatarConfig?.welcomeMessage || "Welcome to this assessment! I'm here to guide you through this learning experience." // welcome_message
      );
      
      if (result.success) {
        // Set the chat session ID for maintaining conversation context
        if (result.chatSessionId) {
          setChatSessionId(result.chatSessionId);
          console.log('✅ Chat session ID set:', result.chatSessionId);
        }
        
        // Handle the initial AI response - prioritize next_question for display
        const nextQuestion = result.data.next_question;
        const aiResponse = result.data.reply || result.data.response;
        
        console.log('Initial AvatarAI Response Analysis:', {
          nextQuestion: nextQuestion,
          aiResponse: aiResponse ? aiResponse.substring(0, 100) + '...' : null,
          fullResponse: result.data
        });
        
        // Always use next_question if available, otherwise use aiResponse
        if (nextQuestion) {
          console.log('✅ Setting initial question to next_question:', nextQuestion);
          setCurrentQuestion(nextQuestion);
        } else if (aiResponse) {
          console.log('⚠️ No initial next_question found, using aiResponse:', aiResponse.substring(0, 100) + '...');
          setCurrentQuestion(aiResponse);
        } else {
          console.log('❌ No initial response content found');
          setCurrentQuestion('Welcome! I\'m here to guide you through this assessment. Please respond to my questions.');
        }
      } else {
        console.error('Failed to send initial hi:', result.error);
      }
    } catch (error) {
      console.error('Error sending initial hi:', error);
    }
  };

  const loadAssessmentData = async () => {
    try {
      // Clear any cached assessment data to force fresh fetch
      sessionStorage.removeItem(`assessment_${uuid}`);
      
      // Get assessment data from location state or fetch it
      const stateData = location.state?.sessionData;
             if (stateData) {
         setSessionData(stateData);
         setAssessment(stateData.assessment);
         console.log('Assessment from location state:', stateData.assessment);
         console.log('questionsFileId from location state:', stateData.assessment?.questionsFileId);
       } else {
        // Try to get session data from session storage
        const storedSession = sessionStorage.getItem(`assessmentSession_${uuid}`);
        if (storedSession) {
          const parsedSession = JSON.parse(storedSession);
          setSessionData(parsedSession);
          
                     // Fetch assessment details with cache busting
           const result = await assessmentService.getPublicAssessment(uuid);
           if (result.success) {
             setAssessment(result.data);
             console.log('Fresh assessment data loaded:', result.data);
             console.log('questionsFileId from API:', result.data.questionsFileId);
           }
        } else {
          // No session data found, redirect back to mode selection
          toast.error('No active session found. Please start the assessment again.');
          navigate(`/assessment/${uuid}/mode`);
          return;
        }
      }
    } catch (error) {
      console.error('Error loading assessment data:', error);
      toast.error('Failed to load assessment data');
      navigate('/my-assessment');
    } finally {
      setLoading(false);
    }
  };

  const handlePlayerReady = () => {
    setPlayerReady(true);
    toast.success('Avatar stream connected successfully!');
  };

  const handlePlayerError = (error) => {
    console.error('Player error:', error);
    toast.error('Failed to connect to avatar stream');
  };

  const handleSendResponse = async () => {
    if (!userResponse.trim()) {
      return;
    }

    setIsResponding(true);
    try {
      console.log('handleSendResponse - assessment.questionsFileId:', assessment?.questionsFileId);
      
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
        toast.error('Failed to get assessment data');
        return;
      }
      
      // Call AvatarAI API directly from frontend
      const result = await assessmentService.callAvatarAIDirectly(
        userResponse, // user_reply
        questionsFileId, // course_id - use questions_file_id for AvatarAI API
        sessionData.userId || '6511534f6966f424d53bda75', // user_id with fallback
        sessionData.userName || 'Dnyaneshwar Naiknavare', // user_name with fallback
        chatSessionId || `session_${Date.now()}`, // chat_session_id - use existing or create new
        sessionData.avatarConfig?.avatarPersona === 'dr-jane-doe' ? 'Dr. Jane Doe' : 'Dr. Jacob Jones', // doctor_name
        sessionData.avatarConfig?.avatarPersona === 'dr-jane-doe' ? '/assets/images/doctor2.png' : '/assets/images/doctor1.png', // doctor_avatar
        sessionData.avatarConfig?.voiceTone || 'Formal', // doctor_tone
        sessionData.avatarConfig?.emotionalStyle || 'Excited', // doctor_mood
        undefined, // message_id (will be omitted if undefined)
        sessionData.avatarConfig?.welcomeMessage || "Welcome to this assessment! I'm here to guide you through this learning experience." // welcome_message
      );
      
      if (result.success) {
        toast.success('Response sent to AvatarAI');
        setUserResponse('');
        
        // Update chat session ID if a new one is returned
        if (result.sessionId) {
          setChatSessionId(result.sessionId);
          console.log('✅ Updated chat session ID:', result.sessionId);
        }
        
        // Handle the AI response - prioritize next_question for display
        const nextQuestion = result.data.next_question;
        const aiResponse = result.data.reply || result.data.response;
        
        console.log('AvatarAI Response Analysis:', {
          nextQuestion: nextQuestion,
          aiResponse: aiResponse ? aiResponse.substring(0, 100) + '...' : null,
          fullResponse: result.data
        });
        
        // Always use next_question if available, otherwise use aiResponse
        if (nextQuestion) {
          console.log('✅ Setting current question to next_question:', nextQuestion);
          setCurrentQuestion(nextQuestion);
        } else if (aiResponse) {
          console.log('⚠️ No next_question found, using aiResponse:', aiResponse.substring(0, 100) + '...');
          setCurrentQuestion(aiResponse);
        } else {
          console.log('❌ No response content found');
          setCurrentQuestion('Thank you for your response. Please wait for the next question.');
        }
      } else {
        toast.error('Failed to send response to AvatarAI');
        console.error('AvatarAI API Error:', result.error);
      }
    } catch (error) {
      console.error('Error sending response:', error);
      toast.error('Failed to send response');
    } finally {
      setIsResponding(false);
    }
  };

  const handleEndAssessment = async () => {
    try {
      const result = await assessmentService.stopAssessment(assessment.id);
      
      if (result.success) {
        toast.success('Assessment completed successfully!');
        // Clear session data
        sessionStorage.removeItem(`assessmentSession_${uuid}`);
        navigate('/my-assessment');
      } else {
        toast.error('Failed to end assessment');
      }
    } catch (error) {
      console.error('Error ending assessment:', error);
      toast.error('Failed to end assessment');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading assessment...</p>
        </div>
      </div>
    );
  }

  if (!assessment || !sessionData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Assessment Not Found</h2>
          <button 
            onClick={() => navigate('/my-assessment')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{assessment.title}</h1>
              <p className="text-gray-600 mt-1">{assessment.description}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-sm text-gray-500">Session ID</p>
                <p className="text-sm font-mono text-gray-900">{sessionData.sessionId}</p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => navigate(`/assessment/${uuid}/session`, { state: { sessionData } })}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Switch to Video Chat
                </button>
                <button
                  onClick={handleEndAssessment}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  End Assessment
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Avatar Stream */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">AI Avatar</h2>
              <HeygenPlayer
                streamUrl={sessionData.streamUrl}
                onReady={handlePlayerReady}
                onError={handlePlayerError}
              />
              
              {playerReady && (
                <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    <span className="text-sm text-green-800">Avatar stream connected</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Interaction Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Interaction</h2>
              
              {/* Current Question */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Current Question
                </label>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-sm text-gray-900">
                    {currentQuestion || "Welcome! I'm here to guide you through this assessment. Please respond to my questions."}
                  </p>
                </div>
              </div>

              {/* User Response */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Response
                </label>
                <textarea
                  value={userResponse}
                  onChange={(e) => setUserResponse(e.target.value)}
                  placeholder="Type your response here..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={4}
                />
              </div>

              {/* Send Button */}
              <button
                onClick={handleSendResponse}
                disabled={!userResponse.trim() || isResponding}
                className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
                  userResponse.trim() && !isResponding
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {isResponding ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                    Sending...
                  </>
                ) : (
                  'Send Response'
                )}
              </button>

              {/* Session Info */}
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Session Information</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Mode:</span>
                    <span className="text-gray-900 capitalize">{sessionData.mode}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Status:</span>
                    <span className="text-green-600">Active</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Avatar:</span>
                    <span className="text-gray-900">
                      {sessionData.avatarConfig?.avatarPersona === 'dr-jane-doe' ? 'Dr. Jane Doe' : 'Dr. Jacob Jones'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssessmentProgress;
