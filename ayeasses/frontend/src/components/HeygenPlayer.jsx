import React, { useEffect, useRef, useState } from 'react';
import StreamingAvatar from '@heygen/streaming-avatar';

const HeygenPlayer = ({ streamUrl, onError, onReady, avatarSettings, spokenText, isSpeaking }) => {
  const videoRef = useRef(null);
  const avatarRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [volume, setVolume] = useState(80);
  const [avatarInstance, setAvatarInstance] = useState(null);

  useEffect(() => {
    if (!streamUrl) {
      setError('No stream URL provided');
      setIsLoading(false);
      return;
    }

    const initializePlayer = async () => {
      try {
        setIsLoading(true);
        setError(null);

        // For WebRTC streams, use the official Heygen SDK
        if (streamUrl.startsWith('wss://')) {
          console.log('Initializing Heygen streaming avatar with WebSocket URL:', streamUrl);
          
          // Convert WebSocket URL to proper format for SDK
          const streamUrlForSDK = streamUrl.replace('wss://', 'webrtc://');
          console.log('Converted stream URL for SDK:', streamUrlForSDK);
          
          // Create streaming avatar instance
          const avatar = new StreamingAvatar({
            container: avatarRef.current,
            streamUrl: streamUrlForSDK,
            onReady: () => {
              console.log('Heygen avatar ready');
              setIsLoading(false);
              setAvatarInstance(avatar);
              if (onReady) onReady();
            },
            onError: (err) => {
              console.error('Heygen avatar error:', err);
              setError('Failed to load avatar stream');
              setIsLoading(false);
              if (onError) onError(err);
            }
          });

          // Start the avatar
          await avatar.start();
          
        } else if (streamUrl.startsWith('webrtc://')) {
          console.log('Initializing Heygen streaming avatar with WebRTC URL:', streamUrl);
          
          // Create streaming avatar instance
          const avatar = new StreamingAvatar({
            container: avatarRef.current,
            streamUrl: streamUrl,
            onReady: () => {
              console.log('Heygen avatar ready');
              setIsLoading(false);
              setAvatarInstance(avatar);
              if (onReady) onReady();
            },
            onError: (err) => {
              console.error('Heygen avatar error:', err);
              setError('Failed to load avatar stream');
              setIsLoading(false);
              if (onError) onError(err);
            }
          });

          // Start the avatar
          await avatar.start();
          
        } else if (streamUrl.startsWith('rtmp://')) {
          // RTMP stream - might need a different player
          console.log('RTMP stream URL:', streamUrl);
          setIsLoading(false);
          if (onReady) onReady();
        } else {
          // Regular video URL
          if (videoRef.current) {
            videoRef.current.src = streamUrl;
            videoRef.current.load();
            
            videoRef.current.onloadeddata = () => {
              setIsLoading(false);
              if (onReady) onReady();
            };
            
            videoRef.current.onerror = (e) => {
              console.error('Video error:', e);
              setError('Failed to load video stream');
              setIsLoading(false);
              if (onError) onError(e);
            };
          }
        }
      } catch (err) {
        console.error('Player initialization error:', err);
        setError('Failed to initialize player');
        setIsLoading(false);
        if (onError) onError(err);
      }
    };

    // Add a small delay to ensure the container is ready
    const timer = setTimeout(() => {
      initializePlayer();
    }, 100);

    // Cleanup function
    return () => {
      clearTimeout(timer);
      if (avatarInstance) {
        try {
          avatarInstance.stop();
        } catch (err) {
          console.error('Error stopping avatar:', err);
        }
      }
    };
  }, [streamUrl, onError, onReady]);

  const toggleVideo = () => {
    setIsVideoEnabled(!isVideoEnabled);
    if (avatarInstance) {
      avatarInstance.setVideoEnabled(!isVideoEnabled);
    } else if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => {
        if (track.kind === 'video') {
          track.enabled = !isVideoEnabled;
        }
      });
    }
  };

  const toggleAudio = () => {
    setIsAudioEnabled(!isAudioEnabled);
    if (avatarInstance) {
      avatarInstance.setAudioEnabled(!isAudioEnabled);
    } else if (videoRef.current && videoRef.current.srcObject) {
      const tracks = videoRef.current.srcObject.getTracks();
      tracks.forEach(track => {
        if (track.kind === 'audio') {
          track.enabled = !isAudioEnabled;
        }
      });
    }
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseInt(e.target.value);
    setVolume(newVolume);
    if (avatarInstance) {
      avatarInstance.setVolume(newVolume / 100);
    } else if (videoRef.current) {
      videoRef.current.volume = newVolume / 100;
    }
  };

  const getAvatarName = (avatar) => {
    return avatar === 'dr-jacob-jones' ? 'Dr. Jacob Jones' : 'Dr. Jane Doe';
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
        <div className="text-center">
          <div className="text-white mb-4">
            <svg className="w-16 h-16 mx-auto" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
            </svg>
          </div>
          <p className="text-white font-semibold mb-2">Dr. Jacob Jones</p>
          <p className="text-white text-sm opacity-90">Avatar temporarily unavailable</p>
          <p className="text-white text-xs opacity-75 mt-1">Stream URL: {streamUrl}</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white font-semibold mb-2">Dr. Jacob Jones</p>
          <p className="text-white text-sm opacity-90">Connecting to avatar stream...</p>
        </div>
      </div>
    );
  }

  // For WebRTC streams, show the official Heygen avatar
  if (streamUrl.startsWith('webrtc://')) {
    return (
      <div className="relative h-full bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg overflow-hidden">
        {/* Heygen Avatar Container */}
        <div 
          ref={avatarRef} 
          className="w-full h-full"
          style={{ minHeight: '256px' }}
        />
        
        {/* Speaking Indicator */}
        {isSpeaking && (
          <div className="absolute top-4 right-4 bg-green-500 text-white px-2 py-1 rounded-full text-xs flex items-center">
            <div className="w-2 h-2 bg-white rounded-full mr-1 animate-pulse"></div>
            Speaking
          </div>
        )}
        
        <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
          LIVE
        </div>
        
        {/* Video Controls */}
        <div className="absolute bottom-4 right-4 flex space-x-2">
          <button
            onClick={toggleVideo}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              isVideoEnabled ? 'bg-green-500' : 'bg-gray-600'
            }`}
            title={isVideoEnabled ? 'Disable Video' : 'Enable Video'}
          >
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M2 6a2 2 0 012-2h6l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
            </svg>
          </button>
          <button
            onClick={toggleAudio}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              isAudioEnabled ? 'bg-green-500' : 'bg-gray-600'
            }`}
            title={isAudioEnabled ? 'Mute Audio' : 'Unmute Audio'}
          >
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.793L4.5 14H2a1 1 0 01-1-1V7a1 1 0 011-1h2.5l3.883-3.793a1 1 0 011.617.793zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
        
        {/* Volume Control */}
        <div className="absolute top-4 left-4 bg-black bg-opacity-50 rounded-lg p-2">
          <div className="flex items-center space-x-2">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.793L4.5 14H2a1 1 0 01-1-1V7a1 1 0 011-1h2.5l3.883-3.793a1 1 0 011.617.793zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
            <input
              type="range"
              min="0"
              max="100"
              value={volume}
              onChange={handleVolumeChange}
              className="w-16 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
            />
          </div>
        </div>
      </div>
    );
  }

  // For regular video streams
  return (
    <div className="relative h-full bg-black rounded-lg overflow-hidden">
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        controls
        autoPlay
        muted
        playsInline
      >
        <source src={streamUrl} type="video/mp4" />
        Your browser does not support the video tag.
      </video>
      
      {/* Speaking Indicator */}
      {isSpeaking && (
        <div className="absolute top-4 right-4 bg-green-500 text-white px-2 py-1 rounded-full text-xs flex items-center">
          <div className="w-2 h-2 bg-white rounded-full mr-1 animate-pulse"></div>
          Speaking
        </div>
      )}
      
      <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-xs">
        LIVE
      </div>
      
      {/* Video Controls */}
      <div className="absolute bottom-4 right-4 flex space-x-2">
        <button
          onClick={toggleVideo}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
            isVideoEnabled ? 'bg-green-500' : 'bg-gray-600'
          }`}
          title={isVideoEnabled ? 'Disable Video' : 'Enable Video'}
        >
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path d="M2 6a2 2 0 012-2h6l2 2h6a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6zM14.553 7.106A1 1 0 0014 8v4a1 1 0 00.553.894l2 1A1 1 0 0018 13V7a1 1 0 00-1.447-.894l-2 1z" />
          </svg>
        </button>
        <button
          onClick={toggleAudio}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
            isAudioEnabled ? 'bg-green-500' : 'bg-gray-600'
          }`}
          title={isAudioEnabled ? 'Mute Audio' : 'Unmute Audio'}
        >
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.793L4.5 14H2a1 1 0 01-1-1V7a1 1 0 011-1h2.5l3.883-3.793a1 1 0 011.617.793zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
      
      {/* Volume Control */}
      <div className="absolute top-4 left-4 bg-black bg-opacity-50 rounded-lg p-2">
        <div className="flex items-center space-x-2">
          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M9.383 3.076A1 1 0 0110 4v12a1 1 0 01-1.617.793L4.5 14H2a1 1 0 01-1-1V7a1 1 0 011-1h2.5l3.883-3.793a1 1 0 011.617.793zM12.293 7.293a1 1 0 011.414 0L15 8.586l1.293-1.293a1 1 0 111.414 1.414L16.414 10l1.293 1.293a1 1 0 01-1.414 1.414L15 11.414l-1.293 1.293a1 1 0 01-1.414-1.414L13.586 10l-1.293-1.293a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
          <input
            type="range"
            min="0"
            max="100"
            value={volume}
            onChange={handleVolumeChange}
            className="w-16 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>
    </div>
  );
};

export default HeygenPlayer;
