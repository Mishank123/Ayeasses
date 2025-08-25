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

  useEffect(() => {
    loadAssessmentData();
  }, [uuid]);

  // Send initial "hi" message when component loads
  useEffect(() => {
    if (assessment && sessionData && !currentQuestion) {
      sendInitialHi();
    }
  }, [assessment, sessionData]);

  const sendInitialHi = async () => {
    try {
      const result = await assessmentService.sendInitialHi(
        assessment.id, // course_id
        sessionData.userId || '6511534f6966f424d53bda75', // user_id with fallback
        sessionData.userName || 'Dnyaneshwar Naiknavare', // user_name with fallback
        sessionData.avatarConfig?.avatarPersona === 'dr-jane-doe' ? 'Dr. Jane Doe' : 'Dr. Jacob Jones', // doctor_name
        sessionData.avatarConfig?.avatarPersona === 'dr-jane-doe' ? '/assets/images/doctor2.png' : '/assets/images/doctor1.png', // doctor_avatar
        sessionData.avatarConfig?.voiceTone || 'Formal', // doctor_tone
        sessionData.avatarConfig?.emotionalStyle || 'Excited', // doctor_mood
        sessionData.avatarConfig?.welcomeMessage || "Welcome to this assessment! I'm here to guide you through this learning experience." // welcome_message
      );
      
      if (result.success) {
        const aiResponse = result.data.reply;
        if (aiResponse) {
          setCurrentQuestion(aiResponse);
          console.log('Initial AI Response:', aiResponse);
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
      // Get assessment data from location state or fetch it
      const stateData = location.state?.sessionData;
      if (stateData) {
        setSessionData(stateData);
        setAssessment(stateData.assessment);
      } else {
        // Try to get session data from session storage
        const storedSession = sessionStorage.getItem(`assessmentSession_${uuid}`);
        if (storedSession) {
          const parsedSession = JSON.parse(storedSession);
          setSessionData(parsedSession);
          
          // Fetch assessment details
          const result = await assessmentService.getPublicAssessment(uuid);
          if (result.success) {
            setAssessment(result.data);
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
      toast.error('Please enter your response');
      return;
    }

    setIsResponding(true);
    try {
      // Call AvatarAI API directly from frontend
      const result = await assessmentService.callAvatarAIDirectly(
        userResponse, // user_reply
        assessment.id, // course_id
        sessionData.userId || '6511534f6966f424d53bda75', // user_id with fallback
        sessionData.userName || 'Dnyaneshwar Naiknavare', // user_name with fallback
        `session_${Date.now()}`, // chat_session_id
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
        
        // Handle the AI response
        const aiResponse = result.data.reply;
        if (aiResponse) {
          console.log('AI Response:', aiResponse);
          // You can display the AI response or handle it as needed
          setCurrentQuestion(aiResponse);
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
              <button
                onClick={handleEndAssessment}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                End Assessment
              </button>
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
