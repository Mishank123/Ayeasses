import React, { useState } from 'react';
import { PlayIcon, ClipboardIcon } from '@heroicons/react/24/outline';

const AssessmentCard = ({ assessment }) => {
  const [showToast, setShowToast] = useState(false);

  const handlePlay = () => {
    console.log('Assessment clicked:', assessment);
    console.log('Assessment type:', assessment.assessmentType);
    console.log('Assessment URL:', assessment.url);
    
    // Check assessment type and route accordingly
    if (assessment.assessmentType === 'text') {
      console.log('Routing to text assessment:', `/assessment/${assessment.url}`);
      // For text assessments, go directly to the assessment (which will auto-start)
      window.location.href = `/assessment/${assessment.url}`;
    } else {
      console.log('Routing to personalization:', `/assessment/${assessment.url}/personalize`);
      // For video/audio assessments, go to avatar personalization first
      window.location.href = `/assessment/${assessment.url}/personalize`;
    }
  };

  const handleCopy = async () => {
    try {
      const fullUrl = `${window.location.origin}/assessment/${assessment.url}`;
      await navigator.clipboard.writeText(fullUrl);
      setShowToast(true);
      setTimeout(() => setShowToast(false), 3000);
    } catch (error) {
      console.error('Failed to copy URL:', error);
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty) {
      case 'beginner':
        return 'bg-green-100 text-green-800';
      case 'intermediate':
        return 'bg-yellow-100 text-yellow-800';
      case 'advanced':
        return 'bg-orange-100 text-orange-800';
      case 'expert':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'video':
        return '🎥';
      case 'text':
        return '📝';
      case 'audio':
        return '🎧';
      default:
        return '📋';
    }
  };

  return (
    <div className="relative bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow duration-300 border border-gray-200">
      {/* Toast Notification */}
      {showToast && (
        <div className="absolute top-4 right-4 bg-green-500 text-white px-4 py-2 rounded-md shadow-lg z-10 animate-fade-in">
          Link copied!
        </div>
      )}

      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
              {assessment.title}
            </h3>
            <p className="text-sm text-gray-600 line-clamp-3">
              {assessment.description}
            </p>
          </div>
        </div>

        {/* Meta Information */}
        <div className="flex flex-wrap gap-2 mb-4">
          {assessment.category && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              {assessment.category}
            </span>
          )}
          {assessment.difficultyLevel && (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getDifficultyColor(assessment.difficultyLevel)}`}>
              {assessment.difficultyLevel}
            </span>
          )}
          {assessment.assessmentType && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
              {getTypeIcon(assessment.assessmentType)} {assessment.assessmentType}
            </span>
          )}
          {assessment.estimatedDuration && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
              ⏱️ {assessment.estimatedDuration} min
            </span>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={handlePlay}
            className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors duration-200 font-medium"
          >
            <PlayIcon className="w-4 h-4" />
            Play Assessment
          </button>
          <button
            onClick={handleCopy}
            className="flex items-center justify-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-md transition-colors duration-200 font-medium"
            title="Copy assessment URL"
          >
            <ClipboardIcon className="w-4 h-4" />
            Copy
          </button>
        </div>

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>Created: {new Date(assessment.createdAt).toLocaleDateString()}</span>
            <span className="font-mono text-xs bg-gray-50 px-2 py-1 rounded">
              {assessment.url}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AssessmentCard;
