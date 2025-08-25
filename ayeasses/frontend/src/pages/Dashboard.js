import React, { useState, useEffect } from 'react';
import { 
  RefreshCw,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { dashboardAPI } from '../services/api';
import Layout from '../components/Layout/Layout';
import GraphIcon from '../components/Icons/GraphIcon';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentAssessments, setRecentAssessments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const [statsResponse, assessmentsResponse] = await Promise.all([
          dashboardAPI.getStats(),
          dashboardAPI.getRecentActivity({ limit: 3 })
        ]);

        setStats(statsResponse.data.stats);
        setRecentAssessments([
          { id: 1, title: 'Finance Generative AI', status: 'Published' },
          { id: 2, title: 'Risks and Ethical', status: 'Published' },
          { id: 3, title: 'Introduction to Generative AI', status: 'Published' }
        ]);
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
          { id: 1, title: 'Finance Generative AI', status: 'Published' },
          { id: 2, title: 'Risks and Ethical', status: 'Published' },
          { id: 3, title: 'Introduction to Generative AI', status: 'Published' }
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

  const AssessmentCard = ({ assessment }) => (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h3 className="text-sm font-medium text-gray-900">{assessment.title}</h3>
      <p className="text-xs text-gray-500 mt-1">{assessment.status}</p>
    </div>
  );

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
              value={stats?.totalAssessments || 26}
              subtitle="My Assessments"
              change="26 Published"
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
              <button className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100">
                <RefreshCw className="h-5 w-5" />
              </button>
              <button className="text-purple-600 hover:text-purple-700 text-sm font-medium">
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
      </div>
    </Layout>
  );
};

export default Dashboard;
