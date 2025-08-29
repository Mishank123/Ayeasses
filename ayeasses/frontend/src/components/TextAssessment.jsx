import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import axios from 'axios';
import assessmentService from '../services/assessmentService';

const TextAssessment = () => {
  const { uuid } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const sessionData = location.state?.sessionData;

  const [assessment, setAssessment] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [timer, setTimer] = useState(0);
  const [assessmentCompleted, setAssessmentCompleted] = useState(false);

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
          const response = await axios.get(`${process.env.REACT_APP_API_URL || 'http://localhost:5000'}/api/assessments/${uuid}`);
          if (response.data.assessment) {
            setAssessment(response.data.assessment);
            sessionStorage.setItem(`assessment_${uuid}`, JSON.stringify(response.data.assessment));
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

  // Load questions from API
  useEffect(() => {
    const loadQuestions = async () => {
      if (!assessment) return;

      try {
        setIsLoading(true);
        
        // Call the questions API using assessment service - use questionsFileId specifically
        console.log('Loading questions for courseId:', assessment.questionsFileId);
        console.log('Assessment data:', assessment);
        const result = await assessmentService.getTextAssessmentQuestions(assessment.questionsFileId);
        
        if (result.success) {
          setQuestions(result.data);
        } else {
          throw new Error(result.error || 'Failed to load questions');
        }
      } catch (err) {
        console.error('Error loading questions:', err);
        setError('Failed to load assessment questions');
      } finally {
        setIsLoading(false);
      }
    };

    loadQuestions();
  }, [assessment]);

  // Save answer to API
  const saveAnswer = async (questionId, answer, questionText = '', difficulty = 'medium') => {
    try {
      const result = await assessmentService.saveTextAssessmentAnswer(
        questionId,
        assessment.questionsFileId,
        answer,
        sessionData?.userId || '6511534f6966f424d53bda75', // Default user ID if not available
        questionText,
        difficulty
      );
      
      return result;
    } catch (error) {
      console.error('Error saving answer:', error);
      return { success: false, error: error.message };
    }
  };

  // Handle answer submission
  const handleSubmitAnswer = async () => {
    if (!userAnswer.trim()) {
      toast.error('Please enter your answer before submitting');
      return;
    }

    setIsSubmitting(true);

    try {
      const currentQuestion = questions[currentQuestionIndex];
      
      // Save answer to API
      const saveResult = await saveAnswer(
        currentQuestion.id, 
        userAnswer.trim(),
        currentQuestion.question || '',
        currentQuestion.difficulty_level || assessment?.difficultyLevel || 'medium'
      );
      
      if (saveResult.success) {
        // Move to next question
        if (currentQuestionIndex < questions.length - 1) {
          setCurrentQuestionIndex(prev => prev + 1);
          setUserAnswer('');
          toast.success('Answer submitted successfully!');
        } else {
          // Assessment completed
          setAssessmentCompleted(true);
          toast.success('Assessment completed successfully!');
        }
      } else {
        toast.error('Failed to save answer. Please try again.');
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      toast.error('An error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle end assessment
  const handleEndAssessment = async () => {
    try {
      // Clear session data
      sessionStorage.removeItem(`assessmentSession_${uuid}`);
      sessionStorage.removeItem(`assessment_${uuid}`);
      
      // Navigate to dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error('Error ending assessment:', error);
      toast.error('Failed to end assessment');
      navigate('/dashboard');
    }
  };

  // Calculate progress
  const progressPercentage = questions.length > 0 ? ((currentQuestionIndex + 1) / questions.length) * 100 : 0;
  const currentQuestion = questions[currentQuestionIndex];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-6"></div>
          <p className="text-lg text-gray-600">Loading assessment...</p>
        </div>
      </div>
    );
  }

  if (error && !assessment) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="text-center">
          <div className="text-red-500 mb-6">
            <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Error Loading Assessment</h2>
          <p className="text-lg text-gray-600 mb-8">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg text-lg font-medium transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Render the main assessment UI with modal overlay when completed
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
                <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838l-2.727 1.17 1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-semibold text-purple-600">
                  {assessment?.title || 'Assessment'}
                </h1>
                <p className="text-sm text-gray-600">
                  {assessment?.category || 'Finance'} | {assessment?.difficultyLevel || 'Advanced'}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-lg font-medium text-gray-900">{formatTime(timer)}</div>
                <div className="text-sm text-gray-500">Time</div>
              </div>
              <button
                onClick={handleEndAssessment}
                className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg text-lg font-medium transition-colors"
              >
                End Assessment
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-lg font-medium text-gray-700">
              Question {assessmentCompleted ? questions.length : currentQuestionIndex + 1} of {questions.length}
            </span>
            <span className="text-lg font-medium text-gray-700">
              {assessmentCompleted ? '100%' : `${Math.round(progressPercentage)}%`}
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div 
              className="bg-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: assessmentCompleted ? '100%' : `${progressPercentage}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {!assessmentCompleted && (
        <div className="flex-1 flex min-h-0">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
            <div className="bg-white rounded-xl shadow-lg border p-8">
              {/* Question */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  Question {currentQuestionIndex + 1}
                </h2>
                <p className="text-xl text-gray-700 leading-relaxed">
                  {currentQuestion?.question || 'Loading question...'}
                </p>
              </div>

              {/* Multiple Choice Options (if available) */}
              {currentQuestion?.options && Array.isArray(currentQuestion.options) && (
                <div className="mb-8">
                  <h3 className="text-lg font-medium text-gray-700 mb-4">Select an option:</h3>
                  <div className="space-y-4">
                    {currentQuestion.options.map((option, index) => (
                      <div key={index} className="flex items-center">
                        <input
                          type="radio"
                          id={`option-${index}`}
                          name="multipleChoice"
                          value={option}
                          onChange={(e) => setUserAnswer(e.target.value)}
                          className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300"
                        />
                        <label htmlFor={`option-${index}`} className="ml-4 text-lg text-gray-700 cursor-pointer">
                          <span className="font-medium">{String.fromCharCode(65 + index)}:</span> {option}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Answer Input */}
              <div className="mb-8">
                <label htmlFor="answer" className="block text-lg font-medium text-gray-700 mb-4">
                  Your Answer:
                </label>
                <textarea
                  id="answer"
                  value={userAnswer}
                  onChange={(e) => setUserAnswer(e.target.value)}
                  placeholder="Type your answer here..."
                  className="w-full px-6 py-4 border-2 border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-lg"
                  rows={8}
                  disabled={isSubmitting}
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-end">
                <button
                  onClick={handleSubmitAnswer}
                  disabled={!userAnswer.trim() || isSubmitting}
                  className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-12 py-4 rounded-xl text-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  {isSubmitting ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white mr-3"></div>
                      Submitting...
                    </div>
                  ) : (
                    'SUBMIT ANSWER'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assessment Submitted Modal Overlay */}
      {assessmentCompleted && (
                 <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
           <div className="bg-white rounded-xl shadow-2xl border max-w-2xl mx-auto px-10 py-10 m-4">
            <div className="text-center">
              <h2 className="text-3xl font-bold text-gray-900 mb-8">
                Assessment Submitted!
              </h2>
              <div className="space-y-6 mb-10">
                <p className="text-lg text-gray-700 leading-relaxed">
                  The simulation is now complete. Our AI is analyzing your session based on tone, clarity, persuasion strength, and overall communication performance.
                </p>
                <p className="text-lg text-gray-700 leading-relaxed">
                  A detailed report will be available shortly on your dashboard under Past Sessions.
                </p>
              </div>
                             <div className="flex flex-col sm:flex-row gap-6 justify-center">
                 <button
                   onClick={handleEndAssessment}
                   className="flex-1 max-w-xs bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-16 py-4 rounded-xl text-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center whitespace-nowrap"
                 >
                   <span className="mr-2">→</span>
                   Go to Dashboard
                 </button>
                 <button
                   onClick={() => navigate('/dashboard')}
                   className="flex-1 max-w-xs bg-white border-2 border-orange-500 text-orange-600 hover:bg-orange-50 px-16 py-4 rounded-xl text-lg font-semibold transition-all duration-200 whitespace-nowrap"
                 >
                   View Other Courses
                 </button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );


};

export default TextAssessment;
