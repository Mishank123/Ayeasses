import React from 'react';

const StatisticsIcon = ({ className = "h-5 w-5" }) => {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="statsGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{stopColor: '#8B5CF6', stopOpacity: 1}} />
          <stop offset="100%" style={{stopColor: '#EC4899', stopOpacity: 1}} />
        </linearGradient>
      </defs>
      <path d="M3 3V21H21" stroke="url(#statsGradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M9 9L12 6L16 10L21 5" stroke="url(#statsGradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M21 5H16V10" stroke="url(#statsGradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
};

export default StatisticsIcon;
