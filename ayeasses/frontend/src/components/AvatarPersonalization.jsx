import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import assessmentService from '../services/assessmentService';

const AvatarPersonalization = () => {
  const { uuid } = useParams();
  const navigate = useNavigate();
  const [assessment, setAssessment] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedAvatar, setSelectedAvatar] = useState('dr-jacob-jones');
  const [emotionalStyle, setEmotionalStyle] = useState('excited');
  const [tone, setTone] = useState('formal');
  const [selectedMode, setSelectedMode] = useState('video');

  useEffect(() => {
    fetchAssessment();
  }, [uuid]);

  const fetchAssessment = async () => {
    try {
      // First get the assessment details
      const result = await assessmentService.getPublicAssessment(uuid);
      if (result.success) {
        setAssessment(result.data);
        
        // If we have an assessment ID, try to get avatar configuration
        if (result.data.id) {
          try {
            const avatarResult = await assessmentService.getAvatarConfig(result.data.id);
            if (avatarResult.success && avatarResult.data.avatarConfig) {
              const config = avatarResult.data.avatarConfig;
              if (config.avatar) setSelectedAvatar(config.avatar.id);
              if (config.emotionalStyle) setEmotionalStyle(config.emotionalStyle.id);
              if (config.tone) setTone(config.tone.id);
            }
          } catch (avatarError) {
            console.log('No avatar config found, using defaults');
          }
        }
      } else {
        console.error('Failed to fetch assessment:', result.error);
      }
    } catch (error) {
      console.error('Error fetching assessment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartAssessment = () => {
    // Save avatar configuration to session storage
    const avatarConfig = {
      avatar: selectedAvatar,
      emotionalStyle,
      tone
    };
    
    if (assessment && assessment.id) {
      sessionStorage.setItem(`avatarConfig_${assessment.id}`, JSON.stringify(avatarConfig));
    }
    
    // Navigate to the assessment mode selection
    navigate(`/assessment/${uuid}/mode`, {
      state: {
        avatarSettings: avatarConfig
      }
    });
  };

  const handleTakeLater = () => {
    // Navigate back to dashboard or assessment list
    navigate('/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!assessment) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Assessment Not Found</h2>
          <button 
            onClick={() => navigate('/dashboard')}
            className="btn btn-primary"
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {assessment.title}
          </h1>
          <p className="text-lg text-gray-600">
            {assessment.category} | {assessment.difficultyLevel}
          </p>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">
            Personalize Your AI Avatar for a Realistic Practice Session
          </h2>
          <p className="text-gray-600 text-center mb-8">
            Select the characteristics of the AI avatar to match real-world scenarios you may face in the field.
          </p>

          {/* Choose Avatar Section */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Choose Avatar:</h3>
            <div className="flex gap-4">
              <div 
                className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedAvatar === 'dr-jacob-jones' 
                    ? 'border-purple-500 bg-purple-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedAvatar('dr-jacob-jones')}
              >
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <span className="text-blue-600 font-semibold">JJ</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Dr. Jacob Jones</p>
                  <p className="text-sm text-gray-500">General Practitioner</p>
                </div>
              </div>

              <div 
                className={`flex items-center gap-3 p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedAvatar === 'dr-jane-doe' 
                    ? 'border-purple-500 bg-purple-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => setSelectedAvatar('dr-jane-doe')}
              >
                <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                  <span className="text-green-600 font-semibold">JD</span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">Dr. Jane Doe</p>
                  <p className="text-sm text-gray-500">Specialist</p>
                </div>
              </div>
            </div>
          </div>

          {/* Emotional Style Section */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Emotional Style:</h3>
            <div className="flex gap-3">
              {['excited', 'serious', 'friendly'].map((style) => (
                <button
                  key={style}
                  onClick={() => setEmotionalStyle(style)}
                  className={`px-6 py-3 rounded-lg border-2 font-medium transition-all capitalize ${
                    emotionalStyle === style
                      ? 'border-purple-500 bg-purple-500 text-white'
                      : 'border-gray-300 text-gray-700 hover:border-gray-400'
                  }`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>

          {/* Select Tone Section */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Tone:</h3>
            <div className="flex gap-3">
              {['formal', 'informal', 'balanced'].map((toneOption) => (
                <button
                  key={toneOption}
                  onClick={() => setTone(toneOption)}
                  className={`px-6 py-3 rounded-lg border-2 font-medium transition-all capitalize ${
                    tone === toneOption
                      ? 'border-purple-500 bg-purple-500 text-white'
                      : 'border-gray-300 text-gray-700 hover:border-gray-400'
                  }`}
                >
                  {toneOption}
                </button>
              ))}
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
              className="px-8 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all"
            >
              Start Assessment
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AvatarPersonalization;
