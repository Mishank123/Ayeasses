import React from 'react';

const SearchIcon = ({ className = "h-5 w-5" }) => {
  return (
    <svg 
      className={className} 
      viewBox="0 0 24 24" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="searchGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{stopColor: '#8B5CF6', stopOpacity: 1}} />
          <stop offset="100%" style={{stopColor: '#EC4899', stopOpacity: 1}} />
        </linearGradient>
      </defs>
      <circle cx="11" cy="11" r="8" stroke="url(#searchGradient)" strokeWidth="2"/>
      <path d="M21 21L16.65 16.65" stroke="url(#searchGradient)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
};

export default SearchIcon;
