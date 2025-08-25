import React from 'react';

const HelpIcon = ({ className = "h-5 w-5" }) => {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="helpGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{stopColor: '#8B5CF6', stopOpacity: 1}} />
          <stop offset="100%" style={{stopColor: '#EC4899', stopOpacity: 1}} />
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="10" stroke="url(#helpGradient)" strokeWidth="2"/>
      <path d="M9.09 9C9.3251 8.33167 9.78918 7.76811 10.4 7.40921C11.0108 7.0503 11.7289 6.91894 12.4272 7.03871C13.1255 7.15849 13.7588 7.52252 14.2151 8.06383C14.6713 8.60514 14.9211 9.30196 14.92 10C14.92 12 11.92 13 11.92 13" stroke="url(#helpGradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      <path d="M12 17H12.01" stroke="url(#helpGradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
};

export default HelpIcon;
