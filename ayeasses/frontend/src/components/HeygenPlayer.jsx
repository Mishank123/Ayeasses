import React, { useEffect, useRef, useState } from "react";
import {
  Room,
  RoomEvent,
  RemoteVideoTrack,
  RemoteAudioTrack
} from "livekit-client";

const HeygenPlayer = ({ streamUrl, accessToken, onReady, onError }) => {
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
  const [isAudioEnabled, setIsAudioEnabled] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Log only when inputs change
  useEffect(() => {
    console.log('🔍 HeygenPlayer props (on change):', {
      streamUrl: streamUrl ? `${streamUrl.substring(0, 50)}...` : 'None',
      accessToken: accessToken ? `${typeof accessToken} - ${accessToken.substring(0, 20)}...` : 'None'
    });
  }, [streamUrl, accessToken]);

  const isLiveKitUrl = (url) => typeof url === 'string' && url.startsWith('wss://');

  useEffect(() => {
    console.log('🔍 HeygenPlayer useEffect triggered:', {
      streamUrl: streamUrl ? 'Present' : 'Missing',
      accessToken: accessToken ? 'Present' : 'Missing'
    });
    
    if (!streamUrl) {
      return;
    }

    if (!isLiveKitUrl(streamUrl)) {
      const el = videoRef.current;
      if (!el) return;
      setIsLoading(true);
      setErrorMessage(null);
      try {
        el.muted = true;
        el.src = streamUrl;
        const playPromise = el.play();
        if (playPromise && typeof playPromise.then === 'function') {
          playPromise.then(() => {
            setIsLoading(false);
            if (onReady) onReady();
          }).catch((err) => {
            setIsLoading(false);
            setErrorMessage('Click video to start playback');
            if (onError) onError(err);
          });
        } else {
          setIsLoading(false);
          if (onReady) onReady();
        }
      } catch (err) {
        setIsLoading(false);
        setErrorMessage('Unable to start video');
        if (onError) onError(err);
      }
      return () => {
        if (videoRef.current) {
          try { videoRef.current.pause(); } catch {}
          videoRef.current.removeAttribute('src');
          videoRef.current.load?.();
        }
      };
    }

    if (!accessToken) {
      console.log('🔍 Missing accessToken for LiveKit, skipping');
      return;
    }

    // Check if this is a mock token (for development)
    if (accessToken.startsWith('mock_')) {
      console.log('🔍 Mock mode detected, showing placeholder video');
      setIsLoading(false);
      setErrorMessage('Mock mode: Avatar simulation (HeyGen API not available)');
      if (onReady) onReady();
      return;
    }

    // Validate LiveKit access token format
    if (!accessToken.startsWith('eyJ')) {
      console.error('❌ Invalid LiveKit access token format. Expected JWT token starting with "eyJ"');
      setErrorMessage('Invalid access token format');
      setIsLoading(false);
      return;
    }

    // Debug: Decode the JWT token to check its contents
    try {
      const tokenParts = accessToken.split('.');
      if (tokenParts.length === 3) {
        const payload = JSON.parse(atob(tokenParts[1]));
        console.log('🔍 JWT Token payload:', payload);
        console.log('🔍 Token expiration:', new Date(payload.exp * 1000));
        console.log('🔍 Token issued at:', new Date(payload.iat * 1000));
        console.log('🔍 Token subject:', payload.sub);
        console.log('🔍 Token room:', payload.room);
      }
    } catch (err) {
      console.error('❌ Failed to decode JWT token:', err);
    }

    const connection = connectionRef.current;
    if (connection.hasInitialized && connection.currentUrl === streamUrl && connection.isConnected) {
      return;
    }
    if (connection.isConnecting) {
      return;
    }
    if (roomRef.current && roomRef.current.connectionState === 'connecting') {
      return;
    }

    if (roomRef.current && connection.currentUrl !== streamUrl) {
      try { roomRef.current.disconnect(); } catch {}
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

    const attachTrackIfPossible = (track) => {
      console.log('🔍 Attempting to attach track:', {
        track: track,
        videoElement: !!videoRef.current,
        trackKind: track?.kind
      });
      if (!track || !videoRef.current) {
        console.log('❌ Cannot attach track - missing track or video element');
        return;
      }
      try { 
        track.attach(videoRef.current);
        console.log('✅ Track attached successfully to video element');
      } catch (err) {
        console.error('❌ Failed to attach track:', err);
      }
    };

    const setup = async () => {
      try {
        console.log('🔍 LiveKit setup starting...', {
          streamUrl: streamUrl,
          accessToken: accessToken ? `${accessToken.substring(0, 20)}...` : 'None',
          isLiveKitUrl: isLiveKitUrl(streamUrl)
        });

        if (!isLiveKitUrl(streamUrl)) {
          throw new Error('Invalid LiveKit URL format. Expected wss:// URL');
        }
        setIsLoading(true);
        setErrorMessage(null);
        if (videoRef.current) videoRef.current.muted = true;

        console.log('🔍 Connecting to LiveKit room...');
        console.log('🔍 Connection details:', {
          streamUrl: streamUrl,
          accessTokenLength: accessToken ? accessToken.length : 0,
          accessTokenStart: accessToken ? accessToken.substring(0, 50) + '...' : 'None'
        });
        
        await room.connect(streamUrl, accessToken, { 
          autoSubscribe: true,
          timeout: 60000, // Increased timeout to 60 seconds
          adaptiveStream: true,
          dynacast: true,
          reconnectPolicy: {
            nextRetryDelayInMs: (context) => {
              // Exponential backoff with max delay of 10 seconds
              return Math.min(1000 * Math.pow(2, context.retryCount), 10000);
            },
            maxRetries: 5
          }
        });
        console.log('✅ LiveKit room connected successfully');
        
        await new Promise(resolve => setTimeout(resolve, 500));
        connection.isConnected = true;
        connection.isConnecting = false;
        console.log('✅ LiveKit connection state updated');

        // Safely iterate maps (could be undefined briefly)
        if (room.remoteParticipants && room.remoteParticipants.forEach) {
          room.remoteParticipants.forEach((p) => {
            if (p?.videoTracks && p.videoTracks.forEach) {
              p.videoTracks.forEach((pub) => pub?.track && attachTrackIfPossible(pub.track));
            }
            if (p?.audioTracks && p.audioTracks.forEach) {
              p.audioTracks.forEach((pub) => pub?.track && attachTrackIfPossible(pub.track));
            }
          });
        }

        room.on(RoomEvent.TrackPublished, async (publication) => {
          console.log('🔍 Track published:', publication);
          try { 
            await publication.setSubscribed(true);
            console.log('✅ Track subscription set to true');
          } catch (err) {
            console.error('❌ Failed to subscribe to track:', err);
          }
        });

        room.on(RoomEvent.TrackSubscribed, (track) => {
          console.log('🔍 Track subscribed:', track);
          attachTrackIfPossible(track);
          setIsLoading(false);
          if (onReady) onReady();
        });

        room.on(RoomEvent.Disconnected, () => {
          connection.isConnected = false;
          connection.currentUrl = null;
          connection.hasInitialized = false;
        });

        room.on(RoomEvent.ConnectionStateChanged, (state) => {
          console.log('🔍 LiveKit connection state changed:', state);
          if (state === 'connected') {
            connection.isConnected = true;
            connection.isConnecting = false;
            console.log('✅ LiveKit connection established');
          } else if (state === 'disconnected' || state === 'failed') {
            connection.isConnected = false;
            connection.isConnecting = false;
            connection.hasInitialized = false;
            console.error('❌ LiveKit connection failed or disconnected:', state);
          }
        });

        room.on(RoomEvent.Connected, () => {
          console.log('✅ LiveKit room connected event fired');
        });

        room.on(RoomEvent.Disconnected, (reason) => {
          console.log('❌ LiveKit room disconnected:', reason);
          connection.isConnected = false;
          connection.isConnecting = false;
          connection.hasInitialized = false;
          
          // Handle different disconnection reasons
          let errorMessage = 'Connection lost';
          switch (reason) {
            case 5:
              errorMessage = 'Connection timeout. Please check your network.';
              break;
            case 1:
              errorMessage = 'Server error. Please try again.';
              break;
            case 2:
              errorMessage = 'Client error. Please refresh the page.';
              break;
            default:
              errorMessage = `Connection lost (${reason}). Please try again.`;
          }
          
          setErrorMessage(errorMessage);
          setIsLoading(false);
          
          // Attempt to reconnect after a short delay for recoverable errors
          if (reason !== 5 && reason !== 1) { // Don't reconnect on timeout or server errors
            console.log('🔄 Attempting to reconnect in 3 seconds...');
            setTimeout(() => {
              if (!connection.isConnected && !connection.isConnecting) {
                console.log('🔄 Reconnecting to LiveKit...');
                setErrorMessage(null);
                setup();
              }
            }, 3000);
          }
        });

      } catch (err) {
        console.error('❌ LiveKit connection failed:', err);
        console.error('❌ Error details:', {
          message: err?.message,
          stack: err?.stack,
          streamUrl: streamUrl,
          accessToken: accessToken ? 'Present' : 'Missing',
          accessTokenPreview: accessToken ? accessToken.substring(0, 20) + '...' : 'None',
          errorCode: err?.code,
          errorReason: err?.reason
        });
        
        connection.isConnecting = false;
        connection.isConnected = false;
        connection.currentUrl = null;
        connection.hasInitialized = false;
        setIsLoading(false);
        
        // Provide more specific error messages
        let errorMsg = 'Connection failed';
        if (err?.message?.includes('Invalid token')) {
          errorMsg = 'Invalid access token. Please refresh the page.';
        } else if (err?.message?.includes('Network')) {
          errorMsg = 'Network error. Please check your connection.';
        } else if (err?.message?.includes('timeout')) {
          errorMsg = 'Connection timeout. Please try again.';
        } else if (err?.message) {
          errorMsg = err.message;
        }
        
        setErrorMessage(errorMsg);
        if (onError) onError(err);
        if (roomRef.current) {
          try { roomRef.current.disconnect(); } catch {}
          roomRef.current = null;
        }
      }
    };

    setup();

    return () => {
      if (roomRef.current && connection.currentUrl !== streamUrl) {
        connection.isConnecting = false;
        try { roomRef.current.disconnect(); } catch {}
        roomRef.current = null;
        connection.isConnected = false;
        connection.currentUrl = null;
        if (videoRef.current) videoRef.current.srcObject = null;
      }
    };
  }, [streamUrl, accessToken, onReady, onError]);

  const toggleVideo = () => {
    setIsVideoEnabled((prev) => {
      const enabled = !prev;
      const room = roomRef.current;
      if (room && room.remoteParticipants && room.remoteParticipants.forEach) {
        room.remoteParticipants.forEach((p) => {
          if (p?.videoTracks && p.videoTracks.forEach) {
            p.videoTracks.forEach((pub) => { if (pub?.track) pub.track.enabled = enabled; });
          }
        });
      }
      return enabled;
    });
  };

  const toggleAudio = () => {
    setIsAudioEnabled((prev) => {
      const enabled = !prev;
      const room = roomRef.current;
      if (videoRef.current) videoRef.current.muted = !enabled;
      if (room && room.remoteParticipants && room.remoteParticipants.forEach) {
        room.remoteParticipants.forEach((p) => {
          if (p?.audioTracks && p.audioTracks.forEach) {
            p.audioTracks.forEach((pub) => { if (pub?.track) pub.track.enabled = enabled; });
          }
        });
      }
      return enabled;
    });
  };

  // Check if we're in mock mode
  const isMockMode = accessToken && accessToken.startsWith('mock_');

  return (
    <div className="heygen-player">
      {isLoading && !isMockMode && <p>Loading HeyGen avatar…</p>}
      {errorMessage && (
        <div style={{ color: '#b91c1c', fontSize: 12, marginBottom: 6 }}>{errorMessage}</div>
      )}

      {isMockMode ? (
        <div style={{ 
          width: "100%", 
          height: "300px", 
          borderRadius: "12px", 
          backgroundColor: "#f3f4f6", 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center",
          border: "2px dashed #d1d5db",
          flexDirection: "column"
        }}>
          <div style={{ fontSize: "48px", marginBottom: "16px" }}>🤖</div>
          <div style={{ fontSize: "16px", color: "#6b7280", textAlign: "center" }}>
            AI Avatar (Mock Mode)
          </div>
          <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "8px" }}>
            HeyGen API not available - using simulation
          </div>
        </div>
      ) : (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={!isAudioEnabled}
          style={{ width: "100%", borderRadius: "12px" }}
          onClick={() => { if (videoRef.current) { videoRef.current.play().catch(() => {}); } }}
        />
      )}

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

export default React.memo(HeygenPlayer);
