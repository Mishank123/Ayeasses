import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
// Using simple SVG icons instead of Heroicons
import assessmentService from '../services/assessmentService';
import { toast } from 'react-hot-toast';

const AssessmentModeSelection = () => {
  const { uuid } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedMode, setSelectedMode] = useState('text-assessment');
  const [startingSession, setStartingSession] = useState(false);
  const avatarSettings = location.state?.avatarSettings;

  useEffect(() => {
    fetchAssessment();
  }, [uuid]);

  const fetchAssessment = async () => {
    try {
      console.log('Fetching assessment with UUID:', uuid);
      const result = await assessmentService.getPublicAssessment(uuid);
      console.log('Assessment result:', result);
      if (result.success) {
        setAssessment(result.data);
      } else {
        console.error('Failed to fetch assessment:', result.error);
      }
    } catch (error) {
      console.error('Error fetching assessment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartAssessment = async () => {
    setStartingSession(true);
    try {
      // Get avatar configuration from session storage or props
      let avatarConfig = avatarSettings;
      if (!avatarConfig && assessment?.id) {
        const storedConfig = sessionStorage.getItem(`avatarConfig_${assessment.id}`);
        if (storedConfig) {
          avatarConfig = JSON.parse(storedConfig);
        }
      }

      console.log('Starting assessment with mode:', selectedMode);
      console.log('Avatar config:', avatarConfig);
      
      // Start assessment with frontend Heygen integration (pass avatar config directly)
      const result = await assessmentService.startAssessment(
        assessment?.id || uuid, 
        selectedMode, 
        avatarConfig
      );
      
      if (result.success) {
        console.log('Assessment started successfully:', result.data);
        
        // Store session data in session storage
        sessionStorage.setItem(`assessmentSession_${assessment?.id || uuid}`, JSON.stringify({
          sessionId: result.data.sessionId,
          heygenSessionId: result.data.heygenSessionId,
          streamUrl: result.data.streamUrl,
          messageId: result.data.messageId,
          mode: selectedMode,
          avatarConfig: result.data.avatarConfig
        }));

        toast.success('Assessment session started successfully!');
        
        // Navigate to the appropriate assessment page based on mode
        if (selectedMode === 'video') {
          navigate(`/assessment/${uuid}/session`, {
            state: {
              avatarSettings: avatarConfig,
              mode: selectedMode,
              sessionData: result.data
            }
          });
        } else if (selectedMode === 'text-assessment') {
          navigate(`/assessment/${uuid}/text`, {
            state: {
              avatarSettings: avatarConfig,
              mode: selectedMode,
              sessionData: result.data
            }
          });
        } else {
          navigate(`/assessment/${uuid}/progress`, {
            state: {
              avatarSettings: avatarConfig,
              mode: selectedMode,
              sessionData: result.data
            }
          });
        }
      } else {
        // Check if it's an existing session error
        if (result.error && result.error.includes('already have an active session')) {
          console.log('Using existing session');
          
          // Extract existing session data from error response
          const existingSessionData = {
            sessionId: result.sessionId,
            streamUrl: result.streamUrl,
            mode: selectedMode,
            avatarConfig: avatarConfig
          };
          
          // Store existing session data
          sessionStorage.setItem(`assessmentSession_${assessment?.id || uuid}`, JSON.stringify(existingSessionData));
          
          toast.success('Resuming existing assessment session!');
          
          // Navigate to the appropriate assessment page based on mode
          if (selectedMode === 'video') {
            navigate(`/assessment/${uuid}/session`, {
              state: {
                avatarSettings: avatarConfig,
                mode: selectedMode,
                sessionData: existingSessionData
              }
            });
          } else if (selectedMode === 'text-assessment') {
            navigate(`/assessment/${uuid}/text`, {
              state: {
                avatarSettings: avatarConfig,
                mode: selectedMode,
                sessionData: existingSessionData
              }
            });
          } else {
            navigate(`/assessment/${uuid}/progress`, {
              state: {
                avatarSettings: avatarConfig,
                mode: selectedMode,
                sessionData: existingSessionData
              }
            });
          }
        } else {
          console.error('Failed to start assessment:', result.error);
          toast.error('Failed to start assessment session. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error starting assessment:', error);
      toast.error('Failed to start assessment session. Please try again.');
    } finally {
      setStartingSession(false);
    }
  };

  const handleTakeLater = () => {
    navigate('/my-assessment');
  };

  if (loading || startingSession) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {startingSession ? 'Starting assessment...' : 'Loading assessment...'}
          </p>
        </div>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Assessment Not Found</h2>
          <p className="text-gray-600 mb-4">UUID: {uuid}</p>
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
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838l-2.727 1.17 1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-blue-600">{assessment.title}</h1>
          </div>
          <p className="text-lg text-gray-600">
            {assessment.category} | {assessment.difficultyLevel}
          </p>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-3xl font-bold text-blue-600 mb-4 text-center">
            Choose Your Assessment Mode
          </h2>
          <p className="text-gray-600 text-center mb-8 max-w-2xl mx-auto">
            Select how you'd like to interact with the AI Avatar for this assessment. 
            The session will simulate a real Avatar meeting, and your responses will be 
            evaluated for clarity, confidence, persuasion, and Avatar accuracy.
          </p>

          {/* Mode Selection */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            {/* Text Assessment */}
            <div 
              className={`p-6 rounded-lg border-2 cursor-pointer transition-all ${
                selectedMode === 'text-assessment' 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedMode('text-assessment')}
            >
              <div className="flex items-center justify-center mb-4">
                <svg className="w-12 h-12 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2 text-center">
                Text Assessment
              </h3>
              <p className="text-gray-600 text-center">
                Answer questions in a traditional text-based format with multiple choice and descriptive answers.
              </p>
            </div>

            {/* Text Chat Simulation */}
            <div 
              className={`p-6 rounded-lg border-2 cursor-pointer transition-all ${
                selectedMode === 'text' 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedMode('text')}
            >
              <div className="flex items-center justify-center mb-4">
                <svg className="w-12 h-12 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2 text-center">
                Text Chat Simulation
              </h3>
              <p className="text-gray-600 text-center">
                Converse with the AI Avatar using a chat interface.
              </p>
            </div>

            {/* Video Chat Simulation */}
            <div 
              className={`p-6 rounded-lg border-2 cursor-pointer transition-all ${
                selectedMode === 'video' 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
              onClick={() => setSelectedMode('video')}
            >
              <div className="flex items-center justify-center mb-4">
                <svg className="w-12 h-12 text-gray-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M2 6a2 2 0 012-2h6l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2 text-center">
                Video Chat Simulation
              </h3>
              <p className="text-gray-600 text-center">
                Practice real-time verbal communication via camera with the AI Avatar.
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-center">
            <button
              onClick={handleTakeLater}
              className="px-8 py-3 border-2 border-blue-500 text-blue-500 rounded-lg font-medium hover:bg-blue-50 transition-colors"
            >
              Take Assessment Later
            </button>
            <button
              onClick={handleStartAssessment}
              disabled={startingSession}
              className={`px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium transition-all ${
                startingSession 
                  ? 'opacity-50 cursor-not-allowed' 
                  : 'hover:from-blue-600 hover:to-purple-700'
              }`}
            >
              {startingSession ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2 inline-block"></div>
                  Creating Session...
                </>
              ) : (
                'Start Assessment'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssessmentModeSelection;
