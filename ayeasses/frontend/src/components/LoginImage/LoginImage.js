import React from 'react';
// Import the actual image
import loginHeroImage from '../../assets/images/login-image.jpg';

const LoginImage = () => {
  return (
    <div className="flex xl:w-1/2 relative h-screen items-center justify-center p-4 sm:p-6 lg:p-8 bg-gray-50">
      {/* White container with rounded corners and shadow - responsive sizing */}
      <div className="w-full max-w-sm sm:max-w-md lg:max-w-lg h-[60vh] sm:h-[70vh] lg:h-[80vh] xl:h-[90vh] relative overflow-hidden rounded-2xl sm:rounded-3xl bg-white shadow-lg">
        <img 
          src={loginHeroImage} 
          alt="Young man working at desk with headphones"
          className="w-full h-full object-cover object-center"
        />
      </div>
    </div>
  );
};

export default LoginImage;
