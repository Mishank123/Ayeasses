import React from 'react';
// Import the actual logo icon from assets
import ayeSuiteLogo from '../../assets/images/Aye Suite.png';

const AyeAssessLogo = ({ size = 'default', className = '' }) => {
  const sizeClasses = {
    small: 'w-8 h-8',
    default: 'w-12 h-12',
    large: 'w-16 h-16',
    xlarge: 'w-20 h-20'
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      {/* Actual logo icon from assets - properly sized to fit container */}
      <img 
        src={ayeSuiteLogo} 
        alt="AYE ASSESS Logo"
        className={`${sizeClasses[size]} object-contain`}
      />
    </div>
  );
};

export default AyeAssessLogo;
