import React, { useEffect, useRef, useState } from "react";
import {
  Room,
  RoomEvent,
  RemoteVideoTrack,
  RemoteAudioTrack
} from "livekit-client";

const HeygenPlayer = ({ streamUrl, accessToken, onReady }) => {
  const videoRef = useRef(null);
  const roomRef = useRef(null);
  const connectionRef = useRef({ 
    isConnecting: false, 
    isConnected: false, 
    currentUrl: null,
    hasInitialized: false 
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);

  // Debug logging for props
  console.log('🔍 HeygenPlayer props:', {
    streamUrl: streamUrl ? `${streamUrl.substring(0, 50)}...` : 'None',
    accessToken: accessToken ? `${typeof accessToken} - ${accessToken.substring(0, 20)}...` : 'None',
    hasStreamUrl: !!streamUrl,
    hasAccessToken: !!accessToken
  });

  useEffect(() => {
    console.log('🔍 HeygenPlayer useEffect triggered:', {
      streamUrl: streamUrl ? 'Present' : 'Missing',
      accessToken: accessToken ? 'Present' : 'Missing'
    });
    
    if (!streamUrl || !accessToken) {
      console.log('🔍 Missing required props, skipping connection');
      return;
    }

    const connection = connectionRef.current;
    
    // Prevent multiple initializations for the same URL
    if (connection.hasInitialized && connection.currentUrl === streamUrl && connection.isConnected) {
      console.log('Already connected to this URL, skipping...');
      return;
    }
    
    // Prevent connection if already connecting
    if (connection.isConnecting) {
      console.log('Connection already in progress, skipping...');
      return;
    }
    
    // Check if room is already in a connecting state
    if (roomRef.current && roomRef.current.connectionState === 'connecting') {
      console.log('Room already connecting, skipping...');
      return;
    }

    // Only clean up if we're connecting to a different URL
    if (roomRef.current && connection.currentUrl !== streamUrl) {
      console.log('Cleaning up existing connection for different URL...');
      roomRef.current.disconnect();
      roomRef.current = null;
      connection.isConnected = false;
      connection.currentUrl = null;
    }

    connection.isConnecting = true;
    connection.isConnected = false;
    connection.currentUrl = streamUrl;
    connection.hasInitialized = true;

    const room = new Room();
    roomRef.current = room;

    const setup = async () => {
      try {
        console.log('Connecting to LiveKit room:', streamUrl);
        console.log('Access token:', accessToken ? `${accessToken.substring(0, 50)}...` : 'None');
        
        // Validate URL format
        if (!streamUrl.startsWith('wss://')) {
          throw new Error('Invalid LiveKit URL format. Expected wss:// URL');
        }
        
        await room.connect(streamUrl, accessToken, { 
          autoSubscribe: true,
          timeout: 30000, // 30 second timeout
          adaptiveStream: true,
          dynacast: true,
          publishDefaults: {
            simulcast: true,
            videoSimulcastLayers: [
              { width: 320, height: 180, fps: 15 },
              { width: 640, height: 360, fps: 30 },
              { width: 1280, height: 720, fps: 30 }
            ]
          }
        });
        
        // Wait a moment for room to stabilize
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        connection.isConnected = true;
        connection.isConnecting = false;
        console.log('✅ LiveKit connection established');

        // Handle tracks properly
        room.on(RoomEvent.TrackSubscribed, (track) => {
          console.log('Track subscribed:', track.kind);
          if (track.kind === "video" && videoRef.current) {
            track.attach(videoRef.current);
          }
          if (track.kind === "audio" && videoRef.current) {
            track.attach(videoRef.current);
          }

          setIsLoading(false);
          if (onReady) onReady();
        });

        room.on(RoomEvent.Disconnected, () => {
          console.log('LiveKit room disconnected');
          connection.isConnected = false;
          connection.currentUrl = null;
          connection.hasInitialized = false; // Allow reconnection
        });

        room.on(RoomEvent.ConnectionStateChanged, (state) => {
          console.log('LiveKit connection state changed:', state);
          
          // Safe logging with null checks
          try {
            console.log('Room info:', {
              name: room?.name || 'Unknown',
              sid: room?.sid || 'Unknown',
              participants: room?.participants?.size || 0
            });
          } catch (error) {
            console.log('Room info: Unable to access room properties');
          }
          
          if (state === 'connected') {
            connection.isConnected = true;
            connection.isConnecting = false;
            console.log('✅ LiveKit room connected successfully');
          } else if (state === 'disconnected' || state === 'failed') {
            connection.isConnected = false;
            connection.isConnecting = false;
            connection.hasInitialized = false; // Allow reconnection
            console.log('❌ LiveKit room disconnected or failed');
          }
        });

        // Handle data channel errors gracefully
        room.on(RoomEvent.DataReceived, (payload, participant) => {
          console.log('Data received from:', participant.identity);
        });

        // Handle participant events
        room.on(RoomEvent.ParticipantConnected, (participant) => {
          console.log('Participant connected:', participant.identity);
        });

        room.on(RoomEvent.ParticipantDisconnected, (participant) => {
          console.log('Participant disconnected:', participant.identity);
        });

      } catch (err) {
        console.error("LiveKit connection error:", err);
        
        // Clean up connection state
        connection.isConnecting = false;
        connection.isConnected = false;
        connection.currentUrl = null;
        connection.hasInitialized = false; // Allow retry
        
        // Clean up room reference if it exists
        if (roomRef.current) {
          try {
            roomRef.current.disconnect();
          } catch (disconnectError) {
            console.log('Error during disconnect:', disconnectError);
          }
          roomRef.current = null;
        }
        
        // Retry connection after a delay if it's a recoverable error
        if (err.message && !err.message.includes('Client initiated disconnect')) {
          // Add retry count to prevent infinite loops
          if (!connection.retryCount) {
            connection.retryCount = 0;
          }
          
          if (connection.retryCount < 3) {
            connection.retryCount++;
            console.log(`Scheduling retry ${connection.retryCount}/3 in 5 seconds...`);
            setTimeout(() => {
              if (connectionRef.current.currentUrl === streamUrl) {
                console.log('Retrying connection...');
                setup();
              }
            }, 5000);
          } else {
            console.log('Max retry attempts reached, stopping connection attempts');
            connection.retryCount = 0; // Reset for next attempt
          }
        }
      }
    };

    setup();

    return () => {
      // Only cleanup if component is actually unmounting (not just re-rendering)
      if (roomRef.current && connection.currentUrl !== streamUrl) {
        console.log('Component unmounting - cleaning up connection');
        connection.isConnecting = false;
        roomRef.current.disconnect();
        roomRef.current = null;
        connection.isConnected = false;
        connection.currentUrl = null;
        if (videoRef.current) {
          videoRef.current.srcObject = null;
        }
      }
    };
  }, [streamUrl, accessToken]); // Removed onReady from dependencies

  // Manual connection trigger when props are available (disabled to prevent loops)
  // useEffect(() => {
  //   if (streamUrl && accessToken && !connectionRef.current.isConnecting && !connectionRef.current.isConnected) {
  //     console.log('🔍 Manual connection trigger - props available but not connected');
  //     // Force a re-render to trigger the main useEffect
  //     const timeoutId = setTimeout(() => {
  //       console.log('🔍 Manual connection trigger - attempting connection');
  //       // This will trigger the main useEffect again
  //     }, 100);
  //     return () => clearTimeout(timeoutId);
  //   }
  // }, [streamUrl, accessToken]);

  // ✅ Toggle video by enabling/disabling remote tracks
  const toggleVideo = () => {
    setIsVideoEnabled((prev) => {
      const enabled = !prev;
      const room = roomRef.current;
      if (room && room.remoteParticipants) {
        room.remoteParticipants.forEach((p) => {
          if (p && p.videoTracks) {
            p.videoTracks.forEach((pub) => {
              if (pub && pub.track) pub.track.enabled = enabled;
            });
          }
        });
      }
      return enabled;
    });
  };

  // ✅ Toggle audio by enabling/disabling remote tracks
  const toggleAudio = () => {
    setIsAudioEnabled((prev) => {
      const enabled = !prev;
      const room = roomRef.current;
      if (room && room.remoteParticipants) {
        room.remoteParticipants.forEach((p) => {
          if (p && p.audioTracks) {
            p.audioTracks.forEach((pub) => {
              if (pub && pub.track) pub.track.enabled = enabled;
            });
          }
        });
      }
      return enabled;
    });
  };

  return (
    <div className="heygen-player">
      {isLoading && <p>Loading HeyGen avatar…</p>}

      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={!isAudioEnabled}
        style={{ width: "100%", borderRadius: "12px" }}
      />

      <div className="controls" style={{ marginTop: "10px" }}>
        <button onClick={toggleVideo}>
          {isVideoEnabled ? "Turn Video Off" : "Turn Video On"}
        </button>
        <button onClick={toggleAudio}>
          {isAudioEnabled ? "Mute" : "Unmute"}
        </button>
      </div>
    </div>
  );
};

export default HeygenPlayer;
