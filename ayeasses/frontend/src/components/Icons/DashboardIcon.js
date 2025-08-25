import React from 'react';

const DashboardIcon = ({ className = "h-5 w-5" }) => {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="dashboardGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{stopColor: '#8B5CF6', stopOpacity: 1}} />
          <stop offset="100%" style={{stopColor: '#EC4899', stopOpacity: 1}} />
        </linearGradient>
      </defs>
      <rect x="3" y="3" width="6" height="6" rx="1" fill="url(#dashboardGradient)"/>
      <rect x="12" y="3" width="6" height="6" rx="1" fill="url(#dashboardGradient)"/>
      <rect x="3" y="12" width="6" height="6" rx="1" fill="url(#dashboardGradient)"/>
      <rect x="12" y="12" width="6" height="6" rx="1" fill="url(#dashboardGradient)"/>
    </svg>
  );
};

export default DashboardIcon;
