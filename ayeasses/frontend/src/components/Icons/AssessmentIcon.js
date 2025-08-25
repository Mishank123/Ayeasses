import React from 'react';

const AssessmentIcon = ({ className = "h-5 w-5" }) => {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="2" y="2" width="20" height="20" rx="4" fill="currentColor"/>
      <text x="12" y="14" textAnchor="middle" fill="white" fontSize="8" fontWeight="bold">A+</text>
      <circle cx="16" cy="8" r="2" fill="white"/>
      <path d="M15 7L17 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  );
};

export default AssessmentIcon;
