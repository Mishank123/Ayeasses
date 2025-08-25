import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Search, 
  Filter, 
  Plus, 
  Edit, 
  Trash2, 
  Eye, 
  Download,
  Calendar,
  Clock,
  Tag,
  BarChart3,
  FileText,
  MoreVertical,
  ChevronDown,
  Play,
  Copy
} from 'lucide-react';
import toast from 'react-hot-toast';
import assessmentService from '../services/assessmentService';
import { difficultyLevels, assessmentTypes, statusOptions } from '../utils/assessmentValidation';

const MyAssessment = () => {
  const navigate = useNavigate();
  const [assessments, setAssessments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  // Fetch assessments
  const fetchAssessments = async (page = 1, search = '', status = '') => {
    setLoading(true);
    try {
      const result = await assessmentService.getAssessments({
        page,
        limit: pagination.limit,
        search,
        status
      });

      if (result.success) {
        setAssessments(result.data.assessments);
        setPagination(result.data.pagination);
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error('Failed to fetch assessments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAssessments();
  }, []);

  // Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    fetchAssessments(1, searchTerm, statusFilter);
  };

  // Handle status filter change
  const handleStatusFilterChange = (status) => {
    setStatusFilter(status);
    fetchAssessments(1, searchTerm, status);
  };

  // Handle sort change
  const handleSortChange = (sort) => {
    setSortBy(sort);
    // Implement sorting logic here
  };

  // Delete assessment
  const handleDelete = async (id, title) => {
    if (window.confirm(`Are you sure you want to delete "${title}"?`)) {
      try {
        const result = await assessmentService.deleteAssessment(id);
        if (result.success) {
          toast.success('Assessment deleted successfully');
          fetchAssessments(pagination.page, searchTerm, statusFilter);
        } else {
          toast.error(result.error);
        }
      } catch (error) {
        toast.error('Failed to delete assessment');
      }
    }
  };

  // Download file
  const handleDownload = (filename) => {
    const url = assessmentService.getFileUrl(filename);
    window.open(url, '_blank');
  };

  // Get status badge color
  const getStatusBadgeColor = (status) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Format date
  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Calculate days ago
  const getDaysAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Assessment</h1>
        </div>
        <Link
          to="/create-assessment"
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create Assessment
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-6">
        {/* Search */}
        <form onSubmit={handleSearch} className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search assessment..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        </form>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <button className="flex items-center px-3 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Filter className="w-4 h-4 mr-2" />
            Filter
          </button>

          <select
            value={statusFilter}
            onChange={(e) => handleStatusFilterChange(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
          >
            <option value="">All Assessments</option>
            {statusOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Assessments Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
        </div>
      ) : assessments.length === 0 ? (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No assessments found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm || statusFilter 
              ? 'Try adjusting your search or filters'
              : 'Get started by creating your first assessment'
            }
          </p>
          {!searchTerm && !statusFilter && (
            <Link
              to="/create-assessment"
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Assessment
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {assessments.map((assessment) => (
              <div key={assessment.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
                {/* Card Header */}
                <div className="p-4 border-b border-gray-100">
                  <div className="flex items-start justify-between mb-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded ${getStatusBadgeColor(assessment.status)}`}>
                      {assessment.status}
                    </span>
                    <span className="text-xs text-gray-500">
                      Last activity {getDaysAgo(assessment.createdAt)} days ago
                    </span>
                  </div>
                  
                  <h3 className="font-semibold text-gray-900 mb-2 line-clamp-2">
                    {assessment.title}
                  </h3>
                  
                  <div className="text-sm text-gray-600 mb-2">
                    Department: {assessment.category || 'General'} • Level: {assessment.difficultyLevel || 'Beginner'} • Duration: {assessment.estimatedDuration} min
                  </div>
                  
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {assessment.description}
                  </p>
                </div>

                {/* Card Body */}
                <div className="p-4">
                  {/* Metrics */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="text-center">
                      <div className="text-sm font-semibold text-gray-900">100</div>
                      <div className="text-xs text-gray-500">Learners</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-semibold text-gray-900">50</div>
                      <div className="text-xs text-gray-500">Completed (50%)</div>
                    </div>
                    <div className="text-center">
                      <div className="text-sm font-semibold text-gray-900">80%</div>
                      <div className="text-xs text-gray-500">Avg Score</div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2">
                    <Link
                      to={`/edit-assessment/${assessment.id}`}
                      state={{ assessmentData: assessment }}
                      className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <Edit className="w-4 h-4 mr-2" />
                      Edit Simulation
                    </Link>
                    <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                      <Eye className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => navigate(`/assessment/${assessment.url}/personalize`)}
                      className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Play Assessment"
                    >
                      <Play className="w-4 h-4" />
                    </button>
                    {assessment.questionsFile && (
                      <button
                        onClick={() => handleDownload(assessment.questionsFile)}
                        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    )}
                    <button 
                      onClick={async () => {
                        try {
                          const fullUrl = `${window.location.origin}/assessment/${assessment.url}`;
                          await navigator.clipboard.writeText(fullUrl);
                          toast.success('Link copied!');
                        } catch (error) {
                          toast.error('Failed to copy URL');
                        }
                      }}
                      className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                      title="Copy Assessment URL"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(assessment.id, assessment.title)}
                      className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between bg-white rounded-lg border border-gray-200 px-4 py-3">
              <div className="text-sm text-gray-700">
                Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                {pagination.total} assessments
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => fetchAssessments(pagination.page - 1, searchTerm, statusFilter)}
                  disabled={pagination.page === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-sm text-gray-700">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <button
                  onClick={() => fetchAssessments(pagination.page + 1, searchTerm, statusFilter)}
                  disabled={pagination.page === pagination.totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default MyAssessment;
