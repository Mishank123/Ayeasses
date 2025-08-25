import React from 'react';
import { RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import graph1Icon from '../assets/images/graph1.png';
import graph3Icon from '../assets/images/graph3.png';

const AyeAssess = () => {
  const assessmentInsights = [
    {
      title: 'My Assessments',
      value: '26',
      subtitle: '26 Published',
      trend: 'up',
      graphIcon: graph1Icon
    },
    {
      title: 'Total Learners',
      value: '1,285',
      subtitle: '+5',
      trend: 'up',
      graphIcon: graph1Icon
    },
    {
      title: 'Avg Completion',
      value: '82%',
      subtitle: '+12%',
      trend: 'up',
      graphIcon: graph3Icon
    },
    {
      title: 'Avg Score',
      value: '88%',
      subtitle: '-10',
      trend: 'down',
      graphIcon: graph3Icon
    }
  ];

  const recentAssessments = [
    {
      title: 'Finance Generative AI Governance Blueprint - Australia',
      category: 'Finance • Advanced',
      publishedDate: 'August 12, 2025',
      assignedLearners: 225
    },
    {
      title: 'Risks and Ethical Considerations',
      category: 'Finance • Expert',
      publishedDate: 'August 12, 2025',
      assignedLearners: 92
    },
    {
      title: 'Introduction to Generative AI & Finance use cases',
      category: 'Finance • Advanced',
      publishedDate: 'August 12, 2025',
      assignedLearners: 144
    }
  ];

  const sessionSummary = [
    { label: 'Completion Rate', value: 84 },
    { label: 'Average Score', value: 84 },
    { label: 'Learner Satisfaction', value: 85 },
    { label: 'Retake Percentage', value: 88 }
  ];

  const topPerformers = [
    {
      name: 'Drishti Rao',
      specialty: 'Cardiology • Advanced',
      avgScore: 92,
      avatar: 'DR'
    },
    {
      name: 'Ravi Thakur',
      specialty: 'Neurology • Intermediate',
      avgScore: 89,
      avatar: 'RT'
    },
    {
      name: 'Sneha Iyer',
      specialty: 'Pediatrics • Beginner',
      avgScore: 94,
      avatar: 'SI'
    }
  ];

  return (
    <div className="space-y-8">
      {/* Greeting */}
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">Good Morning, Dnyaneshwar!</h1>
      </div>

      {/* Assessment Insights */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-6">Assessment Insights</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {assessmentInsights.map((insight, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{insight.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{insight.value}</p>
                  <p className="text-sm text-gray-500 mt-1">{insight.subtitle}</p>
                </div>
                <div className="flex items-center space-x-2">
                  {insight.trend === 'up' ? (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  ) : (
                    <TrendingDown className="h-4 w-4 text-red-500" />
                  )}
                  <img 
                    src={insight.graphIcon} 
                    alt="Graph" 
                    className="w-12 h-8 object-contain"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Assessments */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Recent Assessments</h2>
          <div className="flex items-center space-x-4">
            <a href="#" className="text-purple-600 hover:text-purple-700 font-medium">
              View All &gt;
            </a>
            <button className="flex items-center space-x-2 text-gray-600 hover:text-gray-700">
              <RefreshCw className="h-4 w-4" />
              <span>Refresh</span>
            </button>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {recentAssessments.map((assessment, index) => (
            <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">{assessment.title}</h3>
              <p className="text-sm text-gray-600 mb-2">{assessment.category}</p>
              <p className="text-sm text-gray-500 mb-2">Published on: {assessment.publishedDate}</p>
              <p className="text-sm text-gray-500 mb-4">Assigned Learners: {assessment.assignedLearners}</p>
              <a href="#" className="text-purple-600 hover:text-purple-700 font-medium text-sm">
                Edit Assessment &gt;
              </a>
            </div>
          ))}
        </div>
      </div>

      {/* Session Summary and Top Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Session Summary */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Session Summary</h2>
          <div className="space-y-6">
            {sessionSummary.map((item, index) => (
              <div key={index}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">{item.label}</span>
                  <span className="text-sm font-semibold text-gray-900">{item.value}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-purple-600 to-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${item.value}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Performers */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Top Performers of the Month</h2>
          <div className="space-y-4">
            {topPerformers.map((performer, index) => (
              <div key={index} className="flex items-center space-x-4">
                <div className="h-10 w-10 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 flex items-center justify-center">
                  <span className="text-white font-medium text-sm">{performer.avatar}</span>
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">{performer.name}</p>
                  <p className="text-sm text-gray-600">{performer.specialty}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900">Avg. Score: {performer.avgScore}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AyeAssess;
