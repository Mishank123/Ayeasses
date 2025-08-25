import React from 'react';

const CoursesIcon = ({ className = "h-5 w-5" }) => {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="coursesGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{stopColor: '#8B5CF6', stopOpacity: 1}} />
          <stop offset="100%" style={{stopColor: '#EC4899', stopOpacity: 1}} />
        </linearGradient>
      </defs>
      <path d="M4 19.5C4 18.1193 5.11929 17 6.5 17H20" stroke="url(#coursesGradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M6.5 2H20V22H6.5C5.11929 22 4 20.8807 4 19.5V4.5C4 3.11929 5.11929 2 6.5 2Z" stroke="url(#coursesGradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M2 19.5C2 18.1193 3.11929 17 4.5 17H18" stroke="url(#coursesGradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M4.5 2H18V22H4.5C3.11929 22 2 20.8807 2 19.5V4.5C2 3.11929 3.11929 2 4.5 2Z" stroke="url(#coursesGradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
};

export default CoursesIcon;
