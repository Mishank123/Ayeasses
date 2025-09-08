import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  RefreshCw,
  TrendingUp,
  TrendingDown,
  Copy,
  Check,
  Play
} from 'lucide-react';
import { dashboardAPI } from '../services/api';
import assessmentService from '../services/assessmentService';
import Layout from '../components/Layout/Layout';
import GraphIcon from '../components/Icons/GraphIcon';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentAssessments, setRecentAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copiedAssessmentId, setCopiedAssessmentId] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        console.log('Fetching dashboard data...');
        
        // Fetch stats and recent assessments
        const [statsResponse, assessmentsResponse] = await Promise.all([
          dashboardAPI.getStats(),
          assessmentService.getAssessments({ limit: 3, status: 'published' })
        ]);

        console.log('Stats response:', statsResponse);
        console.log('Assessments response:', assessmentsResponse);

        setStats(statsResponse.data.stats);
        
        if (assessmentsResponse.success && assessmentsResponse.data.assessments && assessmentsResponse.data.assessments.length > 0) {
          console.log('Setting real assessment data:', assessmentsResponse.data.assessments);
          setRecentAssessments(assessmentsResponse.data.assessments);
        } else {
          console.log('No assessments found or API failed, using fallback data');
          // Fallback to default data if API fails or no assessments
          setRecentAssessments([
            {
              id: 1,
              title: 'Finance Generative AI Governance Blueprint - Australia',
              category: 'Finance',
              difficultyLevel: 'Advanced',
              status: 'published',
              createdAt: '2025-08-12T00:00:00.000Z',
              assignedLearners: 225
            },
            {
              id: 2,
              title: 'Risks and Ethical Considerations',
              category: 'Finance',
              difficultyLevel: 'Expert',
              status: 'published',
              createdAt: '2025-08-12T00:00:00.000Z',
              assignedLearners: 92
            },
            {
              id: 3,
              title: 'Introduction to Generative AI & Finance use cases',
              category: 'Finance',
              difficultyLevel: 'Advanced',
              status: 'published',
              createdAt: '2025-08-12T00:00:00.000Z',
              assignedLearners: 144
            }
          ]);
        }
      } catch (error) {
        console.error('Failed to fetch dashboard data:', error);
        // Set default data for demo
        setStats({
          totalAssessments: 26,
          totalLearners: 1285,
          avgCompletion: 82,
          avgScore: 88
        });
        setRecentAssessments([
          {
            id: 1,
            title: 'Finance Generative AI Governance Blueprint - Australia',
            category: 'Finance',
            difficultyLevel: 'Advanced',
            status: 'published',
            createdAt: '2025-08-12T00:00:00.000Z',
            assignedLearners: 225
          },
          {
            id: 2,
            title: 'Risks and Ethical Considerations',
            category: 'Finance',
            difficultyLevel: 'Expert',
            status: 'published',
            createdAt: '2025-08-12T00:00:00.000Z',
            assignedLearners: 92
          },
          {
            id: 3,
            title: 'Introduction to Generative AI & Finance use cases',
            category: 'Finance',
            difficultyLevel: 'Advanced',
            status: 'published',
            createdAt: '2025-08-12T00:00:00.000Z',
            assignedLearners: 144
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const InsightCard = ({ title, value, subtitle, change, changeType = 'positive', graphColor = 'red' }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          <p className="text-sm font-medium text-gray-600 mt-1">{subtitle}</p>
          <div className="flex items-center mt-2">
            {changeType === 'positive' ? (
              <TrendingUp className="h-4 w-4 text-green-500 mr-1" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-500 mr-1" />
            )}
            <span className={`text-sm ${changeType === 'positive' ? 'text-green-600' : 'text-red-600'}`}>
              {change}
            </span>
          </div>
        </div>
        <div className="flex-shrink-0">
          <GraphIcon className={`h-8 w-8 text-${graphColor}-500`} />
        </div>
      </div>
    </div>
  );

  const AssessmentCard = ({ assessment }) => {
    const formatDate = (dateString) => {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    };

    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
          {assessment.title}
        </h3>
        <p className="text-sm text-gray-600 mb-2">
          {assessment.category} • {assessment.difficultyLevel}
        </p>
        <p className="text-sm text-gray-500 mb-3">
          Published on: {formatDate(assessment.createdAt)}
        </p>
        <p className="text-sm text-gray-600 mb-4">
          Assigned Learners: {assessment.assignedLearners || 0}
        </p>
        <div className="flex items-center space-x-2">
          <button 
            onClick={() => {
              console.log('Dashboard - Assessment clicked:', assessment);
              console.log('Dashboard - Assessment type:', assessment.assessmentType);
              // Check assessment type and route accordingly
              if (assessment.assessmentType === 'text') {
                console.log('Dashboard - Routing to text assessment');
                navigate(`/assessment/${assessment.url || assessment.id}`);
              } else {
                console.log('Dashboard - Routing to personalization');
                navigate(`/assessment/${assessment.url || assessment.id}/personalize`);
              }
            }}
            className="p-2 rounded-md text-green-600 hover:text-green-700 hover:bg-green-50 transition-colors"
            title="Play Assessment"
          >
            <Play className="h-4 w-4" />
          </button>
          <button 
            onClick={() => navigate(`/edit-assessment/${assessment.id}`)}
            className="text-purple-600 hover:text-purple-700 text-sm font-medium"
          >
            Edit Assessment &gt;
          </button>
          <button 
            onClick={() => handleCopyUrl(assessment)}
            className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 transition-colors"
            title="Copy Assessment URL"
          >
            {copiedAssessmentId === assessment.id ? (
              <Check className="h-4 w-4 text-green-500" />
            ) : (
              <Copy className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    );
  };

  const handleViewAll = () => {
    navigate('/my-assessment');
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  const handleCopyUrl = async (assessment) => {
    try {
      const url = `${window.location.origin}/assessment/${assessment.url || assessment.id}`;
      await navigator.clipboard.writeText(url);
      setCopiedAssessmentId(assessment.id);
      toast.success('Assessment URL copied to clipboard!');
      
      // Reset the copied state after 2 seconds
      setTimeout(() => {
        setCopiedAssessmentId(null);
      }, 2000);
    } catch (error) {
      toast.error('Failed to copy assessment URL');
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-8">
        {/* Greeting */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Good Morning, Dnyaneshwar!</h1>
        </div>

        {/* Assessment Insights */}
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Assessment Insights</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <InsightCard
              title="My Assessments"
              value={recentAssessments.length}
              subtitle="Total Assessments"
              change={`${recentAssessments.length} Published`}
              changeType="positive"
              graphColor="red"
            />
            <InsightCard
              title="Total Learners"
              value={stats?.totalLearners || 1285}
              subtitle="Total Learners"
              change="+5"
              changeType="positive"
              graphColor="red"
            />
            <InsightCard
              title="Avg Completion"
              value={`${stats?.avgCompletion || 82}%`}
              subtitle="Avg Completion"
              change="+12%"
              changeType="positive"
              graphColor="green"
            />
            <InsightCard
              title="Avg Score"
              value={`${stats?.avgScore || 88}%`}
              subtitle="Avg Score"
              change="-10"
              changeType="negative"
              graphColor="green"
            />
          </div>
        </div>

        {/* Recent Assessments */}
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Recent Assessments</h2>
            <div className="flex items-center space-x-4">
              <button 
                onClick={handleRefresh}
                className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
              <button 
                onClick={handleViewAll}
                className="text-purple-600 hover:text-purple-700 text-sm font-medium"
              >
                View All &gt;
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {recentAssessments.map((assessment) => (
              <AssessmentCard key={assessment.id} assessment={assessment} />
            ))}
          </div>
        </div>

        {/* Session Summary and Top Performers */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Session Summary */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Session Summary</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Completion Rate</span>
                  <span className="text-sm font-medium text-gray-900">84%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-purple-600 h-2 rounded-full" style={{ width: '84%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Average Score</span>
                  <span className="text-sm font-medium text-gray-900">84%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-purple-600 h-2 rounded-full" style={{ width: '84%' }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Top Performers */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performers of the Month</h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-purple-600">DR</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Drishti Rao</p>
                  <p className="text-xs text-gray-600">Cardiology • Advanced</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">Avg. Score: 92%</p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium text-blue-600">RT</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">Ravi Thakur</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">Avg. Score: 89%</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Dashboard;
