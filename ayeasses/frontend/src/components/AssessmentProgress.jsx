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

    // Load assessment and session on mount
    useEffect(() => {
        const load = async () => {
            try {
                sessionStorage.removeItem(`assessment_${uuid}`);

                const stateData = location.state?.sessionData;
                if (stateData) {
                    setSessionData(stateData);
                    setAssessment(stateData.assessment);
                } else {
                    const stored = sessionStorage.getItem(`assessmentSession_${uuid}`);
                    if (stored) {
                        const parsed = JSON.parse(stored);
                        setSessionData(parsed);

                        const result = await assessmentService.getPublicAssessment(uuid);
                        if (result.success) setAssessment(result.data);
                        else throw new Error('Failed to fetch assessment');
                    } else {
                        toast.error('No active session found. Please start again.');
                        navigate(`/assessment/${uuid}/mode`);
                        return;
                    }
                }
            } catch (error) {
                console.error('Error loading data:', error);
                toast.error('Failed to load assessment.');
                navigate('/my-assessment');
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [uuid]);

    // Send initial "hi" once assessment & session are ready
    useEffect(() => {
        if (assessment && sessionData && !currentQuestion) {
            initiateHi();
        }
    }, [assessment, sessionData]);

    const getQuestionsFileId = async () => {
        if (assessment?.questionsFileId) return assessment.questionsFileId;

        const result = await assessmentService.getPublicAssessment(uuid);
        if (result.success && result.data.questionsFileId) {
            setAssessment(result.data);
            return result.data.questionsFileId;
        }

        return null;
    };

    const initiateHi = async () => {
        try {
            const questionsFileId = await getQuestionsFileId();
            if (!questionsFileId) throw new Error('questionsFileId unavailable');

            const result = await assessmentService.sendInitialHi(
                questionsFileId,
                sessionData.userId || 'defaultUserId',
                sessionData.userName || 'Anonymous',
                sessionData.avatarConfig?.avatarPersona === 'dr-jane-doe' ? 'Dr. Jane Doe' : 'Dr. Jacob Jones',
                sessionData.avatarConfig?.avatarPersona === 'dr-jane-doe' ? '/assets/images/doctor2.png' : '/assets/images/doctor1.png',
                sessionData.avatarConfig?.voiceTone || 'Formal',
                sessionData.avatarConfig?.emotionalStyle || 'Excited',
                sessionData.avatarConfig?.welcomeMessage || 'Welcome to this assessment.'
            );

            if (result.success) {
                if (result.chatSessionId) setChatSessionId(result.chatSessionId);

                const { next_question, reply, response } = result.data;
                setCurrentQuestion(next_question || reply || response || 'Let’s begin the assessment.');
            } else {
                throw new Error(result.error || 'Initial greeting failed.');
            }
        } catch (error) {
            console.error('Error in sendInitialHi:', error);
            toast.error('Failed to start avatar conversation.');
        }
    };

    const handleSendResponse = async () => {
        if (!userResponse.trim()) return;
        setIsResponding(true);

        try {
            const questionsFileId = await getQuestionsFileId();
            if (!questionsFileId) throw new Error('Missing questionsFileId');

            const result = await assessmentService.callAvatarAIDirectly(
                userResponse,
                questionsFileId,
                sessionData.userId || 'defaultUserId',
                sessionData.userName || 'Anonymous',
                chatSessionId || `session_${Date.now()}`,
                sessionData.avatarConfig?.avatarPersona === 'dr-jane-doe' ? 'Dr. Jane Doe' : 'Dr. Jacob Jones',
                sessionData.avatarConfig?.avatarPersona === 'dr-jane-doe' ? '/assets/images/doctor2.png' : '/assets/images/doctor1.png',
                sessionData.avatarConfig?.voiceTone || 'Formal',
                sessionData.avatarConfig?.emotionalStyle || 'Excited',
                undefined,
                sessionData.avatarConfig?.welcomeMessage
            );

            if (result.success) {
                toast.success('Response sent!');
                setUserResponse('');
                if (result.sessionId) setChatSessionId(result.sessionId);

                const { next_question, reply, response } = result.data;
                setCurrentQuestion(next_question || reply || response || 'Awaiting next question...');
            } else {
                throw new Error(result.error || 'AvatarAI call failed.');
            }
        } catch (error) {
            console.error('Error sending response:', error);
            toast.error('Failed to send your response.');
        } finally {
            setIsResponding(false);
        }
    };

    const handleEndAssessment = async () => {
        try {
            const result = await assessmentService.stopAssessment(assessment.id);
            if (result.success) {
                toast.success('Assessment ended.');
                sessionStorage.removeItem(`assessmentSession_${uuid}`);
                navigate('/my-assessment');
            } else {
                toast.error('Failed to end assessment.');
            }
        } catch (error) {
            console.error('Error ending assessment:', error);
            toast.error('Failed to end assessment.');
        }
    };

    const handlePlayerReady = () => {
        setPlayerReady(true);
        toast.success('Avatar stream connected!');
    };

    const handlePlayerError = (error) => {
        console.error('Player error:', error);
        toast.error('Stream error.');
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin h-12 w-12 border-b-2 border-blue-600 rounded-full mx-auto mb-4"></div>
                    <p>Loading assessment...</p>
                </div>
            </div>
        );
    }

    if (!assessment || !sessionData) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <h2 className="text-2xl font-bold">Assessment Not Found</h2>
                    <button
                        onClick={() => navigate('/my-assessment')}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Back to Dashboard
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-6xl mx-auto px-4">
                {/* Header */}
                <div className="bg-white p-6 rounded-lg shadow-sm mb-6 flex justify-between items-start">
                    <div>
                        <h1 className="text-2xl font-bold">{assessment.title}</h1>
                        <p className="text-gray-600 mt-1">{assessment.description}</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right">
                            <p className="text-sm text-gray-500">Session ID</p>
                            <p className="text-sm font-mono">{sessionData.sessionId}</p>
                        </div>
                        <button
                            onClick={() => navigate(`/assessment/${uuid}/session`, { state: { sessionData } })}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                        >
                            Switch to Video Chat
                        </button>
                        <button
                            onClick={handleEndAssessment}
                            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                        >
                            End Assessment
                        </button>
                    </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-6">
                    {/* Avatar Stream */}
                    <div className="lg:col-span-2 bg-white p-6 rounded-lg shadow-sm">
                        <h2 className="text-lg font-semibold mb-4">AI Avatar</h2>
                        <HeygenPlayer
                            streamUrl={sessionData.streamUrl}
                            onReady={handlePlayerReady}
                            onError={handlePlayerError}
                        />
                        {playerReady && (
                            <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
                                <div className="flex items-center">
                                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                                    <span className="text-sm text-green-800">Avatar stream connected</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Interaction */}
                    <div className="bg-white p-6 rounded-lg shadow-sm">
                        <h2 className="text-lg font-semibold mb-4">Interaction</h2>

                        {/* Current Question */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium mb-2">Current Question</label>
                            <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-900">
                                {currentQuestion || 'The assessment is about to begin.'}
                            </div>
                        </div>

                        {/* User Response */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium mb-2">Your Response</label>
                            <textarea
                                value={userResponse}
                                onChange={(e) => setUserResponse(e.target.value)}
                                placeholder="Type your response here..."
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
                                rows={4}
                            />
                        </div>

                        {/* Send Button */}
                        <button
                            onClick={handleSendResponse}
                            disabled={!userResponse.trim() || isResponding}
                            className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${userResponse.trim() && !isResponding
                                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                }`}
                        >
                            {isResponding ? 'Sending...' : 'Send Response'}
                        </button>

                        {/* Session Info */}
                        <div className="mt-6 pt-6 border-t text-sm space-y-2">
                            <div className="flex justify-between">
                                <span className="text-gray-500">Mode:</span>
                                <span className="capitalize">{sessionData.mode}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Status:</span>
                                <span className="text-green-600">Active</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-gray-500">Avatar:</span>
                                <span>
                                    {sessionData.avatarConfig?.avatarPersona === 'dr-jane-doe' ? 'Dr. Jane Doe' : 'Dr. Jacob Jones'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AssessmentProgress;
