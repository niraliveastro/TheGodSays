"use client";

import { useEffect, useState, Component, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  LiveKitRoom, 
  VideoConference,
  useLocalParticipant,
  useRemoteParticipants,
  ParticipantTile,
  TrackToggle,
  ControlBar
} from "@livekit/components-react";
import "@livekit/components-styles";
import { ArrowLeft, PhoneOff, Video, VideoOff, Mic, MicOff, Loader2, MessageSquare, Maximize2, Minimize2, X, Send } from "lucide-react";
import { Room, RoomEvent, ParticipantEvent, ConnectionQuality, DataPacket_Kind, Track } from "livekit-client";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

// Error Boundary to catch and suppress track-related errors
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    // Suppress track array errors that are common during LiveKit initialization
    const errorMessage = error?.message || error?.toString() || "";
    if (errorMessage.includes("not part of the array") || 
        errorMessage.includes("camera_placeholder") ||
        errorMessage.includes("_placeholder") ||
        errorMessage.includes("not in")) {
      // Suppress these errors - they're harmless LiveKit initialization issues
      return { hasError: false, error: null };
    }
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    // Only log non-track-related errors
    const errorMessage = error?.message || error?.toString() || "";
    if (!errorMessage.includes("not part of the array") && 
        !errorMessage.includes("camera_placeholder") &&
        !errorMessage.includes("_placeholder") &&
        !errorMessage.includes("not in")) {
      console.error("VideoConference error:", error, errorInfo);
    }
  }

  render() {
    if (this.state.hasError && this.state.error) {
      return (
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center", 
          height: "100%",
          flexDirection: "column",
          gap: "1rem",
          color: "white",
          padding: "2rem"
        }}>
          <p>Something went wrong with the video call.</p>
          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            style={{
              padding: "0.5rem 1rem",
              background: "white",
              color: "black",
              border: "none",
              borderRadius: "0.5rem",
              cursor: "pointer"
            }}
          >
            Refresh
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// Individual Video Tile Component
function VideoTile({ participant, isLocal, name, profilePicture, isMobile, isExpanded, isThumbnail, onClick }) {
  const videoElRef = useRef(null);
  const audioElRef = useRef(null);
  
  const videoPublication = participant?.getTrackPublication(Track.Source.Camera);
  const audioPublication = participant?.getTrackPublication(Track.Source.Microphone);
  const videoTrack = videoPublication?.track;
  const audioTrack = audioPublication?.track;
  const hasVideo = videoTrack && videoPublication?.isSubscribed && participant?.isCameraEnabled;
  const hasAudio = audioTrack && audioPublication?.isSubscribed && participant?.isMicrophoneEnabled;
  const isVideoMuted = !hasVideo;
  const isAudioMuted = !hasAudio || audioPublication?.isMuted || !participant?.isMicrophoneEnabled;
  
  // Attach video track - improved for better display
  useEffect(() => {
    if (!participant || !videoElRef.current) return;
    
    const attachVideoTrack = () => {
      const videoPub = participant.getTrackPublication(Track.Source.Camera);
      const track = videoPub?.track;
      
      if (videoElRef.current && track) {
        try {
          // Detach any existing track first
          if (videoElRef.current.srcObject) {
            const existingTracks = videoElRef.current.srcObject.getTracks();
            existingTracks.forEach(t => {
              t.stop();
              if (t.detach) t.detach();
            });
          }
          
          // Attach new track
          track.attach(videoElRef.current);
          
          // Ensure video plays
          const playPromise = videoElRef.current.play();
          if (playPromise !== undefined) {
            playPromise.catch(err => {
              console.warn("Video play error:", err);
            });
          }
        } catch (err) {
          console.error("Error attaching video track:", err);
        }
      } else if (videoElRef.current && !track) {
        // Clear video element if no track
        if (videoElRef.current.srcObject) {
          const existingTracks = videoElRef.current.srcObject.getTracks();
          existingTracks.forEach(t => t.stop());
        }
        videoElRef.current.srcObject = null;
      }
    };
    
    // Initial attach with small delay to ensure element is ready
    const timeoutId = setTimeout(attachVideoTrack, 100);
    
    // Event handlers
    const handleTrackSubscribed = (track, publication) => {
      if (publication?.source === Track.Source.Camera) {
        setTimeout(attachVideoTrack, 50);
      }
    };
    
    const handleTrackUnsubscribed = (track, publication) => {
      if (publication?.source === Track.Source.Camera) {
        attachVideoTrack();
      }
    };
    
    const handleTrackMuted = (publication) => {
      if (publication?.source === Track.Source.Camera) {
        attachVideoTrack();
      }
    };
    
    const handleTrackUnmuted = (publication) => {
      if (publication?.source === Track.Source.Camera) {
        setTimeout(attachVideoTrack, 50);
      }
    };
    
    const handleLocalTrackPublished = (publication) => {
      if (publication?.source === Track.Source.Camera && isLocal) {
        setTimeout(attachVideoTrack, 100);
      }
    };
    
    const handleLocalTrackUnpublished = (publication) => {
      if (publication?.source === Track.Source.Camera && isLocal) {
        attachVideoTrack();
      }
    };
    
    participant.on(ParticipantEvent.TrackSubscribed, handleTrackSubscribed);
    participant.on(ParticipantEvent.TrackUnsubscribed, handleTrackUnsubscribed);
    participant.on(ParticipantEvent.TrackMuted, handleTrackMuted);
    participant.on(ParticipantEvent.TrackUnmuted, handleTrackUnmuted);
    if (isLocal) {
      participant.on(ParticipantEvent.LocalTrackPublished, handleLocalTrackPublished);
      participant.on(ParticipantEvent.LocalTrackUnpublished, handleLocalTrackUnpublished);
    }
    
    return () => {
      clearTimeout(timeoutId);
      participant.off(ParticipantEvent.TrackSubscribed, handleTrackSubscribed);
      participant.off(ParticipantEvent.TrackUnsubscribed, handleTrackUnsubscribed);
      participant.off(ParticipantEvent.TrackMuted, handleTrackMuted);
      participant.off(ParticipantEvent.TrackUnmuted, handleTrackUnmuted);
      if (isLocal) {
        participant.off(ParticipantEvent.LocalTrackPublished, handleLocalTrackPublished);
        participant.off(ParticipantEvent.LocalTrackUnpublished, handleLocalTrackUnpublished);
      }
      if (videoElRef.current) {
        const videoPub = participant.getTrackPublication(Track.Source.Camera);
        const track = videoPub?.track;
        if (track) {
          try {
            track.detach(videoElRef.current);
          } catch (e) {}
        }
      }
    };
  }, [participant, isLocal]);
  
  // Attach audio track
  useEffect(() => {
    if (!participant || isLocal) return; // Don't attach local audio (echo prevention)
    
    const attachAudioTrack = () => {
      const audioPub = participant.getTrackPublication(Track.Source.Microphone);
      const track = audioPub?.track;
      
      if (audioElRef.current && track && audioPub?.isSubscribed && participant.isMicrophoneEnabled) {
        try {
          track.attach(audioElRef.current);
          audioElRef.current.play().catch(err => {
            console.warn("Audio play error:", err);
          });
        } catch (err) {
          console.error("Error attaching audio track:", err);
        }
      } else if (audioElRef.current && audioTrack) {
        try {
          audioTrack.detach(audioElRef.current);
        } catch (e) {}
      }
    };
    
    attachAudioTrack();
    
    const handleTrackSubscribed = (track, publication) => {
      if (publication?.source === Track.Source.Microphone) {
        requestAnimationFrame(attachAudioTrack);
      }
    };
    
    const handleTrackUnsubscribed = (track, publication) => {
      if (publication?.source === Track.Source.Microphone) {
        attachAudioTrack();
      }
    };
    
    participant.on(ParticipantEvent.TrackSubscribed, handleTrackSubscribed);
    participant.on(ParticipantEvent.TrackUnsubscribed, handleTrackUnsubscribed);
    
    return () => {
      participant.off(ParticipantEvent.TrackSubscribed, handleTrackSubscribed);
      participant.off(ParticipantEvent.TrackUnsubscribed, handleTrackUnsubscribed);
      if (audioElRef.current && audioTrack) {
        try {
          audioTrack.detach(audioElRef.current);
        } catch (e) {}
      }
    };
  }, [participant, isLocal, audioTrack]);
  
  return (
    <div
      onClick={onClick}
      style={{
        width: "100%",
        height: "100%",
        position: "relative",
        cursor: isThumbnail ? "pointer" : "default",
        transition: "all 0.3s ease",
      }}
    >
      {/* Always render video element for proper track attachment */}
      <video
        ref={videoElRef}
        autoPlay
        playsInline
        muted={isLocal}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: hasVideo ? "block" : "none",
          zIndex: hasVideo ? 1 : 0,
          backgroundColor: "#000",
        }}
      />
      {/* Audio element for remote participants */}
      {!isLocal && (
        <audio
          ref={audioElRef}
          autoPlay
          playsInline
          style={{ display: "none" }}
        />
      )}
      {/* Fallback when no video */}
      {!hasVideo && (
        <div
          style={{
            width: "100%",
            height: "100%",
            background: "linear-gradient(135deg, #f4d03f 0%, #d4af37 30%, #b8972e 70%, #f4d03f 100%)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            gap: "1rem",
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 0,
          }}
        >
          {/* Profile Picture */}
          {profilePicture ? (
            <img
              src={profilePicture}
              alt={name || "Participant"}
              style={{
                width: isMobile ? "80px" : "120px",
                height: isMobile ? "80px" : "120px",
                borderRadius: "50%",
                objectFit: "cover",
                border: "3px solid rgba(255, 255, 255, 0.3)",
                boxShadow: "0 4px 12px rgba(0, 0, 0, 0.3)",
              }}
              onError={(e) => {
                // Fallback to initial if image fails to load
                e.target.style.display = "none";
              }}
            />
          ) : (
            <div
              style={{
                width: isMobile ? "80px" : "120px",
                height: isMobile ? "80px" : "120px",
                borderRadius: "50%",
                background: "rgba(255, 255, 255, 0.2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: isMobile ? "2rem" : "3rem",
                fontWeight: "bold",
                border: "3px solid rgba(255, 255, 255, 0.3)",
              }}
            >
              {name?.charAt(0).toUpperCase() || "?"}
            </div>
          )}
          {/* Name */}
          <div
            style={{
              fontSize: isMobile ? "1rem" : "1.25rem",
              fontWeight: 600,
              textAlign: "center",
            }}
          >
            {name || "Participant"}
          </div>
        </div>
      )}
      
      {/* Participant Name Overlay */}
      <div
        style={{
          position: "absolute",
          bottom: "0.5rem",
          left: "0.5rem",
          background: "rgba(0, 0, 0, 0.75)",
          color: "white",
          padding: "0.5rem 0.75rem",
          borderRadius: "0.5rem",
          fontSize: "0.875rem",
          fontWeight: 500,
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
          backdropFilter: "blur(8px)",
        }}
      >
        {profilePicture && (
          <img
            src={profilePicture}
            alt={name || "Participant"}
            style={{
              width: "24px",
              height: "24px",
              borderRadius: "50%",
              objectFit: "cover",
              border: "1px solid rgba(255, 255, 255, 0.3)",
            }}
            onError={(e) => {
              e.target.style.display = "none";
            }}
          />
        )}
        {isLocal && <span style={{ fontSize: "0.7rem", opacity: 0.8 }}>You</span>}
        <span>{name || "Participant"}</span>
        {isAudioMuted && (
          <MicOff style={{ width: "0.875rem", height: "0.875rem", color: "#ef4444" }} />
        )}
      </div>

      {/* Video/Audio Status Indicators */}
      {!isThumbnail && (
        <div
          style={{
            position: "absolute",
            top: "0.5rem",
            right: "0.5rem",
            display: "flex",
            gap: "0.25rem",
            alignItems: "center",
            zIndex: 10,
          }}
        >
          {isLocal && (
            <>
              {isVideoMuted && (
                <div
                  style={{
                    background: "rgba(239, 68, 68, 0.9)",
                    padding: "0.25rem 0.5rem",
                    borderRadius: "0.25rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.25rem",
                  }}
                >
                  <VideoOff style={{ width: "0.875rem", height: "0.875rem", color: "white" }} />
                </div>
              )}
              {isAudioMuted && (
                <div
                  style={{
                    background: "rgba(239, 68, 68, 0.9)",
                    padding: "0.25rem 0.5rem",
                    borderRadius: "0.25rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.25rem",
                  }}
                >
                  <MicOff style={{ width: "0.875rem", height: "0.875rem", color: "white" }} />
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// Custom Video Grid Component (Zoom/Google Meet style)
function CustomVideoGrid({ room, onMuteToggle, onVideoToggle, isMuted, isVideoEnabled }) {
  const localParticipant = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const userRole = localStorage.getItem("tgs:role") || "user";
  const isAstrologer = userRole === "astrologer";
  const [isMobile, setIsMobile] = useState(false);
  const [participantProfiles, setParticipantProfiles] = useState({});
  const [expandedParticipantId, setExpandedParticipantId] = useState(null);
  const { userProfile } = useAuth();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Fetch participant profiles
  const [callData, setCallData] = useState(null);
  
  useEffect(() => {
    const fetchProfiles = async () => {
      const profiles = {};
      
      // Get call ID to fetch user IDs
      const callId = localStorage.getItem("tgs:currentCallId") || localStorage.getItem("tgs:callId");
      if (!callId) {
        console.warn("No call ID found for profile fetching");
        return;
      }

      try {
        const { db } = await import("@/lib/firebase");
        const { doc, getDoc } = await import("firebase/firestore");
        
        // Fetch call data to get userId and astrologerId
        const callDocRef = doc(db, "calls", callId);
        const callSnap = await getDoc(callDocRef);
        
        if (callSnap.exists()) {
          const data = callSnap.data();
          setCallData(data);
          const userId = data.userId;
          const astrologerId = data.astrologerId;

          console.log("Fetching profiles for:", { userId, astrologerId });

          // Fetch user profile - try multiple collections and API endpoint
          if (userId) {
            try {
              // Try API endpoint first (bypasses security rules)
              try {
                const apiResponse = await fetch(`/api/users/name?userId=${userId}`);
                if (apiResponse.ok) {
                  const apiData = await apiResponse.json();
                  if (apiData.success && apiData.name) {
                    profiles[userId] = {
                      name: apiData.name,
                      picture: null, // API doesn't return picture yet
                    };
                    console.log("✅ User profile fetched from API:", profiles[userId]);
                  }
                }
              } catch (apiError) {
                console.warn("API fetch failed, trying Firestore:", apiError);
              }
              
              // If API didn't work, try Firestore collections
              if (!profiles[userId]) {
                const collectionNames = ['users', 'user'];
                let userFound = false;
                
                for (const collectionName of collectionNames) {
                  try {
                    const userDoc = await getDoc(doc(db, collectionName, userId));
                    if (userDoc.exists()) {
                      const userData = userDoc.data();
                      profiles[userId] = {
                        name: userData.name || userData.displayName || userData.fullName || userData.email?.split("@")[0] || "User",
                        picture: userData.profilePicture || userData.photoURL || userData.avatar || null,
                      };
                      console.log(`✅ User profile fetched from ${collectionName}:`, profiles[userId]);
                      userFound = true;
                      break;
                    }
                  } catch (e) {
                    console.warn(`Error checking ${collectionName} for user:`, e);
                  }
                }
                
                if (!userFound) {
                  console.warn("User document not found in any collection:", userId);
                  profiles[userId] = {
                    name: `User ${userId.substring(0, 8)}`,
                    picture: null,
                  };
                }
              }
            } catch (e) {
              console.warn("Error fetching user profile:", e);
              profiles[userId] = {
                name: `User ${userId.substring(0, 8)}`,
                picture: null,
              };
            }
          }

          // Fetch astrologer profile
          if (astrologerId) {
            try {
              const astroDoc = await getDoc(doc(db, "astrologers", astrologerId));
              if (astroDoc.exists()) {
                const astroData = astroDoc.data();
                profiles[astrologerId] = {
                  name: astroData.name || astroData.displayName || astroData.fullName || "Astrologer",
                  picture: astroData.profilePicture || astroData.photoURL || astroData.avatar || null,
                };
                console.log("✅ Astrologer profile fetched:", profiles[astrologerId]);
              } else {
                console.warn("Astrologer document not found:", astrologerId);
                // Set a fallback
                profiles[astrologerId] = {
                  name: "Astrologer",
                  picture: null,
                };
              }
            } catch (e) {
              console.warn("Error fetching astrologer profile:", e);
            }
          }
        } else {
          console.warn("Call document not found:", callId);
        }

        console.log("All profiles:", profiles);
        setParticipantProfiles(profiles);
      } catch (error) {
        console.error("Error fetching participant profiles:", error);
      }
    };

    fetchProfiles();
  }, []); // Run once on mount

  // Re-compute allParticipants when profiles are fetched
  // This ensures names update when profiles are loaded

  // Get current user profile from AuthContext first, then fallback to fetched profiles
  const currentUserId = localStorage.getItem("tgs:userId");
  const currentAstrologerId = localStorage.getItem("tgs:astrologerId");
  const currentUserProfile = userProfile ? {
    name: userProfile.name || userProfile.displayName || (isAstrologer ? "Astrologer" : "User"),
    picture: userProfile.profilePicture || userProfile.photoURL || userProfile.avatar || null,
  } : (isAstrologer 
    ? participantProfiles[currentAstrologerId] 
    : participantProfiles[currentUserId]);

  // Get remote participant ID (the other person)
  const remoteParticipant = remoteParticipants[0];
  // Determine remote participant ID based on who is NOT the current user
  let remoteParticipantId = null;
  if (callData) {
    if (isAstrologer) {
      // If I'm astrologer, remote is user
      remoteParticipantId = callData.userId;
    } else {
      // If I'm user, remote is astrologer
      remoteParticipantId = callData.astrologerId;
    }
  }
  const remoteParticipantProfile = remoteParticipantId ? participantProfiles[remoteParticipantId] : {};

  console.log("Participant mapping:", {
    isAstrologer,
    currentUserId,
    currentAstrologerId,
    remoteParticipantId,
    currentUserProfile,
    remoteParticipantProfile,
    callData,
  });

  // Build participants array with proper name resolution
  const allParticipants = [
    { 
      participant: localParticipant.localParticipant, 
      isLocal: true, 
      name: currentUserProfile?.name || (isAstrologer ? "Astrologer" : "User"),
      profilePicture: currentUserProfile?.picture || null,
    },
    ...remoteParticipants.map(p => {
      // Determine if this remote participant is astrologer or user
      const isRemoteAstrologer = p.identity?.includes("astrologer") || remoteParticipantId === callData?.astrologerId;
      
      // Get the correct profile based on participant identity - check both ways
      let profile = null;
      if (isRemoteAstrologer && callData?.astrologerId) {
        profile = participantProfiles[callData.astrologerId];
      } else if (!isRemoteAstrologer && callData?.userId) {
        profile = participantProfiles[callData.userId];
      }
      
      // Also check remoteParticipantProfile as fallback
      if (!profile && remoteParticipantProfile?.name) {
        profile = remoteParticipantProfile;
      }
      
      // Use profile name first, then remoteParticipantProfile, then participant name, then generic label
      // NEVER show user ID - always use a name or generic label
      const displayName = profile?.name || remoteParticipantProfile?.name || p.name || (isRemoteAstrologer ? "Astrologer" : "User");
      
      console.log("Participant name resolution:", {
        participantId: p.identity,
        isRemoteAstrologer,
        remoteParticipantId,
        profileName: profile?.name,
        remoteProfileName: remoteParticipantProfile?.name,
        participantName: p.name,
        finalName: displayName
      });
      
      return {
        participant: p, 
        isLocal: false, 
        name: displayName, // Always use resolved name, never ID
        profilePicture: profile?.picture || remoteParticipantProfile?.picture || null,
      };
    })
  ];

  // Handle expand/collapse
  const handleTileClick = (participantId) => {
    if (expandedParticipantId === participantId) {
      setExpandedParticipantId(null); // Collapse if clicking the same tile
    } else {
      setExpandedParticipantId(participantId); // Expand clicked tile
    }
  };

  // Determine layout based on expanded state
  const hasExpanded = expandedParticipantId !== null;
  const expandedParticipant = allParticipants.find(p => p.participant?.identity === expandedParticipantId);
  const thumbnailParticipants = hasExpanded 
    ? allParticipants.filter(p => p.participant?.identity !== expandedParticipantId)
    : [];

  const containerStyle = {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: hasExpanded ? "column" : (isMobile ? "column" : "row"),
    gap: 0,
    padding: 0,
    overflow: "hidden",
    background: "linear-gradient(135deg, #fef9e7 0%, #fdf2d0 50%, #fef9e7 100%)",
    alignItems: "stretch",
    justifyContent: "stretch",
    position: "relative",
  };

  // Main expanded video style
  const expandedVideoStyle = {
    flex: "1 1 100%",
    width: "100%",
    height: "100%",
    position: "relative",
    overflow: "hidden",
    background: "rgba(255, 255, 255, 0.95)",
    border: "none",
    boxShadow: "0 4px 20px rgba(212, 175, 55, 0.3)",
  };

  // Thumbnail video style (small corner video)
  const thumbnailVideoStyle = {
    position: "absolute",
    bottom: isMobile ? "0.5rem" : "1rem",
    right: isMobile ? "0.5rem" : "1rem",
    width: isMobile ? "120px" : "200px",
    height: isMobile ? "90px" : "150px",
    maxWidth: isMobile ? "120px" : "200px",
    maxHeight: isMobile ? "90px" : "150px",
    borderRadius: "0.5rem",
    overflow: "hidden",
    background: "rgba(255, 255, 255, 0.95)",
    border: "3px solid rgba(212, 175, 55, 0.6)",
    boxShadow: "0 4px 12px rgba(0, 0, 0, 0.4)",
    zIndex: 20,
    cursor: "pointer",
    transition: "all 0.3s ease",
  };

  // Regular tile style (when not expanded)
  const regularTileStyle = {
    flex: "1 1 50%",
    width: isMobile ? "100%" : "50%",
    height: isMobile ? "50%" : "100%",
    position: "relative",
    overflow: "hidden",
    background: "rgba(255, 255, 255, 0.95)",
    border: "none",
    cursor: "pointer",
    transition: "all 0.3s ease",
  };

  return (
    <div style={containerStyle}>
      {hasExpanded ? (
        <>
          {/* Expanded main video */}
          {expandedParticipant && (
            <div style={expandedVideoStyle}>
              <VideoTile 
                participant={expandedParticipant.participant} 
                isLocal={expandedParticipant.isLocal} 
                name={expandedParticipant.name} 
                profilePicture={expandedParticipant.profilePicture}
                isMobile={isMobile}
                isExpanded={true}
                isThumbnail={false}
                onClick={() => handleTileClick(expandedParticipant.participant?.identity)}
              />
            </div>
          )}
          {/* Thumbnail videos */}
          {thumbnailParticipants.map(({ participant, isLocal, name }, index) => {
            if (!participant) return null;
            return (
              <div key={participant.identity || index} style={thumbnailVideoStyle}>
                <VideoTile 
                  participant={participant} 
                  isLocal={isLocal} 
                  name={name} 
                  profilePicture={allParticipants.find(p => p.participant?.identity === participant.identity)?.profilePicture}
                  isMobile={isMobile}
                  isExpanded={false}
                  isThumbnail={true}
                  onClick={() => handleTileClick(participant.identity)}
                />
              </div>
            );
          })}
        </>
      ) : (
        // Regular side-by-side or stacked layout
        allParticipants.map(({ participant, isLocal, name }, index) => {
          if (!participant) return null;
          return (
            <div key={participant.identity || index} style={regularTileStyle}>
              <VideoTile 
                participant={participant} 
                isLocal={isLocal} 
                name={name} 
                profilePicture={allParticipants[index]?.profilePicture}
                isMobile={isMobile}
                isExpanded={false}
                isThumbnail={false}
                onClick={() => handleTileClick(participant.identity)}
              />
            </div>
          );
        })
      )}
    </div>
  );
}

// Chat Component for Video Call
function VideoCallChat({ room, localParticipant }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);
  const userRole = localStorage.getItem("tgs:role") || "user";
  const isAstrologer = userRole === "astrologer";

  // Listen for incoming messages via room events
  useEffect(() => {
    // Try to get room from localParticipant if not available in prop
    const currentRoom = room || localParticipant?.room;
    
    if (!currentRoom) {
      console.warn("Chat: Room not available yet, will retry when ready");
      return;
    }

    if (!localParticipant) {
      console.warn("Chat: Local participant not available yet");
      return;
    }

    console.log("Chat: Setting up data listener", { 
      roomState: currentRoom.state, 
      localParticipantId: localParticipant.identity 
    });

    const handleDataReceived = (payload, participant, kind, topic) => {
      console.log("Chat: Data received", { kind, topic, participantId: participant?.identity });
      
      if (kind === DataPacket_Kind.RELIABLE && topic === undefined) {
        try {
          const decoder = new TextDecoder();
          const text = decoder.decode(payload);
          const data = JSON.parse(text);
          
          console.log("Chat: Parsed data", data);
          
          // Handle call-ended signal
          if (data.type === "call-ended") {
            return;
          }
          
          // Handle chat messages
          if (data.type === "chat" && data.message) {
            const isFromMe = participant?.identity === localParticipant?.identity;
            console.log("Chat: Adding message", { isFromMe, message: data.message });
            
            setMessages((prev) => [
              ...prev,
              {
                id: Date.now() + Math.random(),
                text: data.message,
                sender: data.sender || (isFromMe ? (isAstrologer ? "Astrologer" : "User") : participant?.name || "Unknown"),
                isUser: isFromMe,
                timestamp: new Date(),
              },
            ]);
          }
        } catch (error) {
          console.error("Chat: Error parsing data message:", error);
        }
      }
    };

    // Add listener regardless of connection state - it will work once connected
    currentRoom.on(RoomEvent.DataReceived, handleDataReceived);
    
    // Also listen for connection to ensure it's set up
    const handleConnected = () => {
      console.log("Chat: Room connected");
    };
    currentRoom.on(RoomEvent.Connected, handleConnected);

    return () => {
      console.log("Chat: Cleaning up listener");
      currentRoom.off(RoomEvent.DataReceived, handleDataReceived);
      currentRoom.off(RoomEvent.Connected, handleConnected);
    };
  }, [room, localParticipant, isAstrologer]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (!input.trim()) {
      console.warn("Chat: Empty message");
      return;
    }
    
    // Try to get room from localParticipant if not available in prop
    const currentRoom = room || localParticipant?.room;
    
    if (!currentRoom) {
      console.warn("Chat: Room not available yet, will retry", { room: !!room, localParticipant: !!localParticipant, participantRoom: !!localParticipant?.room });
      // Don't show alert, just silently return - the chat will work once room is ready
      return;
    }
    
    if (!localParticipant) {
      console.warn("Chat: Local participant not available yet");
      // Don't show alert, just silently return
      return;
    }

    const messageData = {
      type: "chat",
      message: input.trim(),
      sender: isAstrologer ? "Astrologer" : "User",
    };

    try {
      console.log("Chat: Sending message", messageData);
      
      // Check room state
      if (currentRoom.state !== "connected") {
        console.warn("Chat: Room not connected yet, state:", currentRoom.state);
        // Don't show alert, just return - user can try again when ready
        return;
      }

      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify(messageData));
      
      // Use localParticipant directly (not room.localParticipant)
      localParticipant.publishData(data, DataPacket_Kind.RELIABLE);
      
      // Add message to local state immediately for better UX
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + Math.random(),
          text: input.trim(),
          sender: messageData.sender,
          isUser: true,
          timestamp: new Date(),
        },
      ]);
      
      setInput("");
      console.log("Chat: Message sent successfully");
    } catch (error) {
      console.error("Chat: Error sending message:", error);
      // Show error in console but don't interrupt user with alert
      // The message will be retried automatically when connection is ready
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        background: "rgba(253, 251, 247, 0.95)",
        backdropFilter: "blur(20px)",
        borderRadius: "0.75rem",
        border: "2px solid rgba(212, 175, 55, 0.3)",
        display: "flex",
        flexDirection: "column",
        boxShadow: "0 8px 32px rgba(212, 175, 55, 0.2)",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "1rem",
          borderBottom: "2px solid rgba(212, 175, 55, 0.2)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          background: "linear-gradient(135deg, #d4af37 0%, #b8972e 100%)",
        }}
      >
        <h3 style={{ color: "white", margin: 0, fontSize: "1rem", fontWeight: 700, fontFamily: "'Georgia', serif" }}>Chat</h3>
        <button
          onClick={() => {/* Close chat handled by parent */}}
          style={{
            background: "rgba(255, 255, 255, 0.2)",
            border: "none",
            color: "white",
            cursor: "pointer",
            padding: "0.25rem",
            borderRadius: "0.25rem",
            transition: "background 0.2s",
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = "rgba(255, 255, 255, 0.3)"}
          onMouseLeave={(e) => e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)"}
        >
          <X style={{ width: "1rem", height: "1rem" }} />
        </button>
      </div>
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "1rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
        }}
      >
        {messages.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              color: "#6b7280",
              fontSize: "0.875rem",
              padding: "2rem 1rem",
            }}
          >
            No messages yet. Start a conversation!
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: msg.isUser ? "flex-end" : "flex-start",
              }}
            >
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "#6b7280",
                  marginBottom: "0.25rem",
                  fontWeight: 500,
                }}
              >
                {msg.sender}
              </div>
              <div
                style={{
                  background: msg.isUser
                    ? "linear-gradient(135deg, #d4af37 0%, #b8972e 100%)"
                    : "rgba(212, 175, 55, 0.1)",
                  color: msg.isUser ? "white" : "#1f2937",
                  padding: "0.5rem 0.75rem",
                  borderRadius: "0.75rem",
                  maxWidth: "80%",
                  fontSize: "0.875rem",
                  wordWrap: "break-word",
                  border: msg.isUser ? "none" : "1px solid rgba(212, 175, 55, 0.3)",
                }}
              >
                {msg.text}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      <div
        style={{
          padding: "1rem",
          borderTop: "2px solid rgba(212, 175, 55, 0.2)",
          display: "flex",
          gap: "0.5rem",
          background: "rgba(253, 251, 247, 0.8)",
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Type a message..."
          style={{
            flex: 1,
            padding: "0.75rem",
            background: "white",
            border: "2px solid rgba(212, 175, 55, 0.3)",
            borderRadius: "0.5rem",
            color: "#1f2937",
            fontSize: "0.875rem",
            outline: "none",
          }}
        />
        <button
          onClick={handleSendMessage}
          disabled={!input.trim()}
          style={{
            padding: "0.75rem",
            background: input.trim() ? "linear-gradient(135deg, #f4d03f 0%, #d4af37 50%, #b8972e 100%)" : "rgba(212, 175, 55, 0.2)",
            color: "white",
            border: "none",
            borderRadius: "0.5rem",
            cursor: input.trim() ? "pointer" : "not-allowed",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Send style={{ width: "1rem", height: "1rem" }} />
        </button>
      </div>
    </div>
  );
}

// Control Buttons Hook Provider - Inside LiveKitRoom context (like voice call)
// This component uses hooks and exposes handlers via ref callback
function VideoCallControlButtonsProvider({ onHandlersReady, onStateChange }) {
  const { localParticipant } = useLocalParticipant();
  const [internalMuted, setInternalMuted] = useState(false);
  const [internalVideoEnabled, setInternalVideoEnabled] = useState(true);
  const handlersRef = useRef({});

  // Sync with actual track state
  useEffect(() => {
    if (!localParticipant) return;
    
    const updateStates = () => {
      const micPublication = localParticipant.getTrackPublication(Track.Source.Microphone);
      const videoPublication = localParticipant.getTrackPublication(Track.Source.Camera);
      
      let muted = false;
      if (micPublication) {
        muted = micPublication.isMuted;
      } else {
        muted = !localParticipant.isMicrophoneEnabled;
      }
      
      let videoEnabled = false;
      if (videoPublication) {
        videoEnabled = videoPublication.isSubscribed && localParticipant.isCameraEnabled;
      } else {
        videoEnabled = localParticipant.isCameraEnabled;
      }
      
      setInternalMuted(muted);
      setInternalVideoEnabled(videoEnabled);
      if (onStateChange) {
        onStateChange({ isMuted: muted, isVideoEnabled: videoEnabled });
      }
    };
    
    updateStates();
    
    // Create handlers that use localParticipant from hook
    // Use a function to get current state to avoid stale closures
    const getCurrentState = () => {
      const micPub = localParticipant.getTrackPublication(Track.Source.Microphone);
      const videoPub = localParticipant.getTrackPublication(Track.Source.Camera);
      return {
        isMuted: micPub?.isMuted ?? !localParticipant.isMicrophoneEnabled,
        isVideoEnabled: (videoPub?.isSubscribed && localParticipant.isCameraEnabled) ?? localParticipant.isCameraEnabled,
      };
    };

    handlersRef.current.handleToggleMute = async () => {
      if (!localParticipant) {
        console.warn("Local participant not available");
        return;
      }
      
      try {
        const micPublication = localParticipant.getTrackPublication(Track.Source.Microphone);
        const currentMuted = micPublication?.isMuted ?? !localParticipant.isMicrophoneEnabled;
        const newMutedState = !currentMuted;
        
        console.log(`🎤 Toggling mute: ${currentMuted ? 'unmuting' : 'muting'}`);
        
        // Update optimistically
        setInternalMuted(newMutedState);
        const currentState = getCurrentState();
        if (onStateChange) onStateChange({ isMuted: newMutedState, isVideoEnabled: currentState.isVideoEnabled });
        
        if (micPublication && micPublication.track) {
          if (newMutedState) {
            await micPublication.track.mute();
          } else {
            await micPublication.track.unmute();
          }
        } else {
          await localParticipant.setMicrophoneEnabled(!newMutedState);
        }
        
        setTimeout(() => {
          const updatedState = getCurrentState();
          setInternalMuted(updatedState.isMuted);
          if (onStateChange) onStateChange(updatedState);
        }, 300);
      } catch (error) {
        console.error("❌ Error toggling mute:", error);
        const updatedState = getCurrentState();
        setInternalMuted(updatedState.isMuted);
        if (onStateChange) onStateChange(updatedState);
      }
    };

    handlersRef.current.handleToggleVideo = async () => {
      if (!localParticipant) {
        console.warn("Local participant not available");
        return;
      }
      
      try {
        const videoPublication = localParticipant.getTrackPublication(Track.Source.Camera);
        const currentVideoEnabled = (videoPublication?.isSubscribed && localParticipant.isCameraEnabled) ?? localParticipant.isCameraEnabled;
        const newState = !currentVideoEnabled;
        
        console.log(`📹 Toggling camera: ${currentVideoEnabled ? 'disabling' : 'enabling'}`);
        
        setInternalVideoEnabled(newState);
        const currentState = getCurrentState();
        if (onStateChange) onStateChange({ isMuted: currentState.isMuted, isVideoEnabled: newState });
        
        const success = await localParticipant.setCameraEnabled(newState);
        
        if (!success) {
          console.warn("⚠️ Failed to enable/disable camera");
          const updatedState = getCurrentState();
          setInternalVideoEnabled(updatedState.isVideoEnabled);
          if (onStateChange) onStateChange(updatedState);
          return;
        }
        
        if (!newState && videoPublication && videoPublication.track) {
          try {
            await localParticipant.unpublishTrack(videoPublication.track);
          } catch (unpubError) {
            console.warn("⚠️ Error unpublishing track:", unpubError);
          }
        }
        
        setTimeout(() => {
          const updatedState = getCurrentState();
          setInternalVideoEnabled(updatedState.isVideoEnabled);
          if (onStateChange) onStateChange(updatedState);
        }, 1000);
      } catch (error) {
        console.error("❌ Error toggling video:", error);
        const updatedState = getCurrentState();
        setInternalVideoEnabled(updatedState.isVideoEnabled);
        if (onStateChange) onStateChange(updatedState);
      }
    };
    
    // Notify parent that handlers are ready
    if (onHandlersReady) {
      onHandlersReady(handlersRef.current);
    }
    
    // Listen for changes
    const handleTrackMuted = (pub) => {
      if (pub?.source === Track.Source.Microphone || pub?.source === Track.Source.Camera) {
        updateStates();
      }
    };
    const handleTrackUnmuted = (pub) => {
      if (pub?.source === Track.Source.Microphone || pub?.source === Track.Source.Camera) {
        updateStates();
      }
    };
    const handleTrackPublished = (pub) => {
      if (pub?.source === Track.Source.Microphone || pub?.source === Track.Source.Camera) {
        updateStates();
      }
    };
    const handleTrackUnpublished = (pub) => {
      if (pub?.source === Track.Source.Microphone || pub?.source === Track.Source.Camera) {
        updateStates();
      }
    };
    
    localParticipant.on(ParticipantEvent.TrackMuted, handleTrackMuted);
    localParticipant.on(ParticipantEvent.TrackUnmuted, handleTrackUnmuted);
    localParticipant.on(ParticipantEvent.LocalTrackPublished, handleTrackPublished);
    localParticipant.on(ParticipantEvent.LocalTrackUnpublished, handleTrackUnpublished);
    
    return () => {
      localParticipant.off(ParticipantEvent.TrackMuted, handleTrackMuted);
      localParticipant.off(ParticipantEvent.TrackUnmuted, handleTrackUnmuted);
      localParticipant.off(ParticipantEvent.LocalTrackPublished, handleTrackPublished);
      localParticipant.off(ParticipantEvent.LocalTrackUnpublished, handleTrackUnpublished);
    };
  }, [localParticipant, onHandlersReady, onStateChange, internalMuted, internalVideoEnabled]);

  return null; // This component doesn't render anything
}

// Room Capture Component - Gets room from LiveKit context as fallback
function RoomCapture({ onRoomReady }) {
  const { localParticipant } = useLocalParticipant();
  
  useEffect(() => {
    if (localParticipant?.room && onRoomReady) {
      const room = localParticipant.room;
      console.log("✅ Room captured from LiveKit context", { roomName: room.name, roomState: room.state });
      onRoomReady(room);
    }
  }, [localParticipant, onRoomReady]);
  
  return null;
}

// Wrapper to use hooks inside LiveKitRoom
function CustomVideoGridWrapper({ room, onMuteToggle, onVideoToggle, isMuted, isVideoEnabled }) {
  return <CustomVideoGrid room={room} onMuteToggle={onMuteToggle} onVideoToggle={onVideoToggle} isMuted={isMuted} isVideoEnabled={isVideoEnabled} />;
}

// Chat Wrapper
function VideoCallChatWrapper({ room: roomProp, showChat, setShowChat }) {
  const { localParticipant } = useLocalParticipant();
  
  if (!showChat) return null;
  
  // Get room from localParticipant if available, otherwise use prop
  const room = localParticipant?.localParticipant?.room || roomProp;
  
  // Always render chat, even if room/participant not ready yet (it will connect when ready)
  return (
    <div style={{ 
      position: "fixed", 
      right: "1rem", 
      top: "4rem", 
      width: "320px", 
      height: "calc(100vh - 8rem)",
      maxHeight: "500px",
      zIndex: 2000,
      pointerEvents: "auto",
    }}>
      <VideoCallChat room={room} localParticipant={localParticipant?.localParticipant} />
    </div>
  );
}

export default function VideoCallRoom() {
  const params = useParams();
  const router = useRouter();
  const [token, setToken] = useState("");
  const [wsUrl, setWsUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [callDuration, setCallDuration] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [room, setRoom] = useState(null);
  const [isRoomReady, setIsRoomReady] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoEnabled, setIsVideoEnabled] = useState(true);
  const [showChat, setShowChat] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const roomRef = useRef(null);
  const callIdRef = useRef(null);
  const isDisconnectingRef = useRef(false);
  const firebaseUnsubscribeRef = useRef(null);
  const mediaTracksRef = useRef([]);
  const controlHandlersRef = useRef({ handleToggleMute: null, handleToggleVideo: null });

  useEffect(() => {
    const initializeRoom = async () => {
      try {
        const roomName = params.room;
        const userRole = localStorage.getItem("tgs:role") || "user";
        const userId = localStorage.getItem("tgs:userId");
        const astrologerId = localStorage.getItem("tgs:astrologerId");
        const isAstrologer = userRole === "astrologer";

        if (!userId) throw new Error("User not authenticated");

        const callId = localStorage.getItem("tgs:currentCallId") ||
          localStorage.getItem("tgs:callId");

        if (!callId) throw new Error("Call ID not found");

        callIdRef.current = callId;

        const response = await fetch("/api/livekit/create-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            astrologerId,
            userId,
            callId: callId,
            roomName: roomName,
            callType: "video",
            role: isAstrologer ? "astrologer" : "user",
            displayName: isAstrologer ? "Astrologer" : "User",
          }),
        });

        if (!response.ok) {
          const contentType = response.headers.get("content-type");
          let errorData = {};
          if (contentType && contentType.includes("application/json")) {
            try {
              errorData = await response.json();
            } catch (e) {
              console.warn("Error parsing error response as JSON:", e);
            }
          }
          throw new Error(errorData.error || "Failed to create session");
        }

        // Check content type before parsing JSON
        const contentType = response.headers.get("content-type");
        if (!contentType || !contentType.includes("application/json")) {
          throw new Error("Invalid response format from server");
        }

        const data = await response.json();
        if (!data.token || !data.wsUrl) {
          throw new Error("Invalid session data: missing token or wsUrl");
        }
        
        console.log("✅ Session created successfully", { 
          hasToken: !!data.token, 
          hasWsUrl: !!data.wsUrl,
          wsUrl: data.wsUrl 
        });
        
        setToken(data.token);
        setWsUrl(data.wsUrl);
        setLoading(false);
      } catch (err) {
        console.error("Error initializing room:", err);
        setError(err.message || "Failed to initialize video call");
        setLoading(false);
      }
    };

    initializeRoom();
  }, [params.room]);

  // Firebase real-time listener for call status changes
  useEffect(() => {
    const callId = callIdRef.current ||
      localStorage.getItem("tgs:currentCallId") ||
      localStorage.getItem("tgs:callId");

    if (!callId) return;

    // Listen for call status changes in Firebase
    const callRef = doc(db, "calls", callId);
    firebaseUnsubscribeRef.current = onSnapshot(
      callRef,
      (snapshot) => {
        if (!snapshot.exists()) return;

        const callData = snapshot.data();

        // If call is completed, cancelled, or rejected, disconnect immediately
        if (callData.status === "completed" ||
          callData.status === "cancelled" ||
          callData.status === "rejected") {

          if (!isDisconnectingRef.current) {
            console.log(`Call ${callId} ended by other party. Status: ${callData.status}`);
            // Auto-disconnect when other party ends call
            handleDisconnect();
          }
        }
      },
      (error) => {
        console.error("Firebase call listener error:", error);
      }
    );

    return () => {
      if (firebaseUnsubscribeRef.current) {
        firebaseUnsubscribeRef.current();
        firebaseUnsubscribeRef.current = null;
      }
    };
  }, [params.room]); // Re-run when room changes

  // Server-side duration sync - fetch from server every second
  useEffect(() => {
    if (!isConnected) return;
    
    const callId = callIdRef.current || 
      localStorage.getItem("tgs:currentCallId") || 
      localStorage.getItem("tgs:callId");
    
    if (!callId) return;

    // Mark call as connected when we join (only once)
    const markConnected = async () => {
      try {
        const response = await fetch("/api/calls", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "mark-connected",
            callId: callId,
          }),
        });
        if (response.ok) {
          const data = await response.json();
          console.log("✅ Call marked as connected:", data);
        }
      } catch (error) {
        console.error("Error marking call as connected:", error);
      }
    };

    // Mark connected immediately
    markConnected();

    // Sync duration from server every second
    const syncDuration = async () => {
      try {
        const response = await fetch("/api/calls", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "get-duration",
            callId: callId,
          }),
        });
        if (response.ok) {
          const data = await response.json();
          if (data.durationSeconds !== undefined) {
            setCallDuration(data.durationSeconds);
          }
        }
      } catch (error) {
        console.error("Error syncing duration:", error);
      }
    };

    // Initial sync
    syncDuration();
    
    // Sync every second
    const interval = setInterval(syncDuration, 1000);
    
    return () => clearInterval(interval);
  }, [isConnected]);

  // Set up room event listeners when room is available
  useEffect(() => {
    const currentRoom = roomRef.current || room;

    if (!currentRoom || !isConnected) return;

    // Listen for call-ended signals via data channel
    const handleDataReceived = (payload, participant, kind, topic) => {
      if (kind === DataPacket_Kind.RELIABLE && topic === undefined) {
        try {
          const data = JSON.parse(new TextDecoder().decode(payload));
          if (data.type === "call-ended" && !isDisconnectingRef.current) {
            console.log("✅ Received call-ended signal from other party - disconnecting now");
            isDisconnectingRef.current = true;
            // Disconnect immediately when other party ends call
            // Use immediate execution instead of setTimeout for faster response
            handleDisconnect();
          }
        } catch (error) {
          console.error("Error parsing disconnect signal:", error);
        }
      }
    };

    // Set up participant disconnect listeners
    const handleParticipantDisconnected = (participant) => {
      console.log("Participant disconnected:", participant.identity);

      // Check if there are any other participants left
      const otherParticipants = Array.from(currentRoom.remoteParticipants.values());

      // If no other participants, the other party left
      if (otherParticipants.length === 0 && !isDisconnectingRef.current) {
        console.log("Other party disconnected. Ending call...");
        // Auto-disconnect when other party leaves
        handleDisconnect();
      }
    };

    const handleDisconnected = () => {
      console.log("Room disconnected event received");
      // When room disconnects, allow user to exit manually if needed
      // Don't auto-call handleDisconnect here to avoid conflicts
      // The user can still click the button to exit
    };

    // Monitor connection quality
    const handleConnectionQualityChanged = (quality, participant) => {
      if (participant === currentRoom.localParticipant) {
        // Log connection quality for debugging
        const qualityLevels = {
          [ConnectionQuality.Excellent]: "Excellent",
          [ConnectionQuality.Good]: "Good",
          [ConnectionQuality.Poor]: "Poor",
          [ConnectionQuality.Lost]: "Lost",
        };
        console.log(`Connection quality: ${qualityLevels[quality] || quality}`);

        // If connection is lost, attempt reconnection
        if (quality === ConnectionQuality.Lost) {
          console.warn("Connection lost, attempting to maintain call...");
        }
      }
    };

    // Listen for data received (for call-ended signals)
    currentRoom.on(RoomEvent.DataReceived, handleDataReceived);

    // Listen for participant disconnect events
    currentRoom.on(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
    currentRoom.on(RoomEvent.Disconnected, handleDisconnected);
    currentRoom.on(RoomEvent.ConnectionQualityChanged, handleConnectionQualityChanged);

    // Store media tracks for cleanup
    currentRoom.localParticipant.videoTrackPublications.forEach((publication) => {
      if (publication.track && !mediaTracksRef.current.includes(publication.track)) {
        mediaTracksRef.current.push(publication.track);
      }
    });

    currentRoom.localParticipant.audioTrackPublications.forEach((publication) => {
      if (publication.track && !mediaTracksRef.current.includes(publication.track)) {
        mediaTracksRef.current.push(publication.track);
      }
    });

    // Sync mute/video state with actual track state
    const updateLocalState = () => {
      const localParticipant = currentRoom.localParticipant;
      if (!localParticipant) {
        console.warn("No local participant for state update");
        return;
      }
      
      const micPub = localParticipant.getTrackPublication(Track.Source.Microphone);
      const videoPub = localParticipant.getTrackPublication(Track.Source.Camera);
      
      // More accurate state detection
      let micMuted = true; // Default to muted for safety
      if (micPub) {
        micMuted = micPub.isMuted;
      } else {
        micMuted = !localParticipant.isMicrophoneEnabled;
      }
      
      let videoEnabled = false; // Default to disabled for safety
      if (videoPub && videoPub.track) {
        videoEnabled = videoPub.isSubscribed && localParticipant.isCameraEnabled;
      } else {
        videoEnabled = localParticipant.isCameraEnabled;
      }
      
      setIsMuted(micMuted);
      setIsVideoEnabled(videoEnabled);
      
      console.log(`State updated - Mic: ${micMuted ? 'muted' : 'unmuted'}, Video: ${videoEnabled ? 'enabled' : 'disabled'}`, {
        micPub: !!micPub,
        micTrack: !!micPub?.track,
        micMuted: micPub?.isMuted,
        micEnabled: localParticipant.isMicrophoneEnabled,
        videoPub: !!videoPub,
        videoTrack: !!videoPub?.track,
        videoSubscribed: videoPub?.isSubscribed,
        cameraEnabled: localParticipant.isCameraEnabled,
      });
    };

    // Update state initially
    updateLocalState();

    // Listen for track changes
    const handleTrackPublished = (publication) => {
      console.log("Track published:", publication.kind, publication.source);
      updateLocalState();
    };
    const handleTrackUnpublished = (publication) => {
      console.log("Track unpublished:", publication.kind, publication.source);
      updateLocalState();
    };
    const handleTrackMuted = (publication) => {
      console.log("Track muted:", publication.kind, publication.source);
      updateLocalState();
    };
    const handleTrackUnmuted = (publication) => {
      console.log("Track unmuted:", publication.kind, publication.source);
      updateLocalState();
    };

    // Listen for local track events
    const handleLocalTrackPublished = (publication, participant) => {
      if (participant === currentRoom.localParticipant) {
        console.log("Local track published:", publication.kind, publication.source);
        updateLocalState();
      }
    };
    
    const handleLocalTrackUnpublished = (publication, participant) => {
      if (participant === currentRoom.localParticipant) {
        console.log("Local track unpublished:", publication.kind, publication.source);
        updateLocalState();
      }
    };

    currentRoom.localParticipant.on(ParticipantEvent.TrackPublished, handleTrackPublished);
    currentRoom.localParticipant.on(ParticipantEvent.TrackUnpublished, handleTrackUnpublished);
    currentRoom.localParticipant.on(ParticipantEvent.TrackMuted, handleTrackMuted);
    currentRoom.localParticipant.on(ParticipantEvent.TrackUnmuted, handleTrackUnmuted);
    currentRoom.on(RoomEvent.LocalTrackPublished, handleLocalTrackPublished);
    currentRoom.on(RoomEvent.LocalTrackUnpublished, handleLocalTrackUnpublished);

    // Cleanup function
    return () => {
      if (currentRoom) {
        currentRoom.off(RoomEvent.DataReceived, handleDataReceived);
        currentRoom.off(RoomEvent.ParticipantDisconnected, handleParticipantDisconnected);
        currentRoom.off(RoomEvent.Disconnected, handleDisconnected);
        currentRoom.off(RoomEvent.ConnectionQualityChanged, handleConnectionQualityChanged);
        
        // Cleanup track listeners
        const localParticipant = currentRoom.localParticipant;
        if (localParticipant) {
          localParticipant.off(ParticipantEvent.TrackPublished, handleTrackPublished);
          localParticipant.off(ParticipantEvent.TrackUnpublished, handleTrackUnpublished);
          localParticipant.off(ParticipantEvent.TrackMuted, handleTrackMuted);
          localParticipant.off(ParticipantEvent.TrackUnmuted, handleTrackUnmuted);
        }
        currentRoom.off(RoomEvent.LocalTrackPublished, handleLocalTrackPublished);
        currentRoom.off(RoomEvent.LocalTrackUnpublished, handleLocalTrackUnpublished);
      }
    };
  }, [room, isConnected]); // Re-run when room or connection status changes

  const updateCallStatus = async (status, durationMinutes = null) => {
    const callId = callIdRef.current ||
      localStorage.getItem("tgs:currentCallId") ||
      localStorage.getItem("tgs:callId");

    if (!callId) return;

    try {
      const updateData = {
        action: "update-call-status",
        callId: callId,
        status: status,
      };

      if (durationMinutes !== null) {
        updateData.durationMinutes = durationMinutes;
      }

      const response = await fetch("/api/calls", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(updateData),
      });

      if (!response.ok) {
        const contentType = response.headers.get("content-type");
        let errorData = {};
        if (contentType && contentType.includes("application/json")) {
          try {
            errorData = await response.json();
          } catch (e) {
            console.warn("Error parsing error response as JSON:", e);
          }
        }
        console.error("Failed to update call status:", errorData);
      } else {
        console.log(`Call status updated to: ${status}`);
      }
    } catch (error) {
      console.error("Error updating call status:", error);
    }
  };

  const handleDisconnect = async (forceExit = false) => {
    // If force exit, allow it even if already disconnecting (user manually clicked)
    if (!forceExit && isDisconnectingRef.current) {
      console.log("Already disconnecting, ignoring duplicate call");
      return;
    }

    // Show disconnecting state
    setIsDisconnecting(true);

    // Set flag to prevent multiple simultaneous disconnects
    if (!isDisconnectingRef.current) {
      isDisconnectingRef.current = true;
    }

    try {
      // Get call details from localStorage or URL
      const callId = callIdRef.current ||
        localStorage.getItem("tgs:currentCallId") ||
        localStorage.getItem("tgs:callId") ||
        params.room;
      // Use server-side duration calculation instead of client-side
      let durationMinutes = 0;
      try {
        const durationResponse = await fetch("/api/calls", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "get-duration",
            callId: callId,
          }),
        });
        if (durationResponse.ok) {
          const durationData = await durationResponse.json();
          durationMinutes = Math.max(1, durationData.durationMinutes || 1);
          console.log(`✅ Server-calculated duration: ${durationMinutes} minutes`);
        } else {
          // Fallback to client duration if server fails
          durationMinutes = Math.max(1, Math.ceil(callDuration / 60));
          console.warn("⚠️ Using fallback client duration:", durationMinutes);
        }
      } catch (error) {
        // Fallback to client duration if server fails
        durationMinutes = Math.max(1, Math.ceil(callDuration / 60));
        console.warn("⚠️ Error getting server duration, using fallback:", error);
      }

      console.log(
        `Ending call ${callId} with duration ${durationMinutes} minutes`
      );

      // CRITICAL: Send disconnect signal via LiveKit data channel FIRST
      // This ensures the other party gets immediate notification
      if (roomRef.current) {
        try {
          // Try to send signal even if room state is not perfect
          const roomState = roomRef.current.state;
          if (roomState === "connected" || roomState === "connecting") {
            const disconnectSignal = {
              type: "call-ended",
              callId: callId,
              timestamp: new Date().toISOString(),
            };
            const encoder = new TextEncoder();
            const data = encoder.encode(JSON.stringify(disconnectSignal));
            await roomRef.current.localParticipant.publishData(data, DataPacket_Kind.RELIABLE);
            console.log("Disconnect signal sent via LiveKit");

            // Give a moment for the signal to be sent
            await new Promise(resolve => setTimeout(resolve, 100));
          } else {
            console.log(`Room state is ${roomState}, skipping data channel signal`);
          }
        } catch (e) {
          console.warn("Error sending disconnect signal:", e);
          // Continue with disconnect even if signal fails
        }
      }

      // Update call status to completed BEFORE disconnecting
      // This ensures Firebase listener on other party picks it up immediately
      if (callId && durationMinutes > 0) {
        // Try direct billing API first
        try {
          const billingResponse = await fetch("/api/billing", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "immediate-settlement",
              callId: callId,
              durationMinutes: durationMinutes,
            }),
          });

          // Check if response is OK and is JSON before parsing
          if (billingResponse.ok) {
            const contentType = billingResponse.headers.get("content-type");
            if (contentType && contentType.includes("application/json")) {
              try {
                const billingResult = await billingResponse.json();
                if (billingResult.success) {
                  console.log(
                    `✅ Billing finalized: ₹${billingResult.finalAmount} charged, ₹${billingResult.refundAmount} refunded`
                  );
                } else {
                  console.error("❌ Billing finalization failed:", billingResult.error);
                }
              } catch (jsonError) {
                console.warn("Error parsing billing response as JSON:", jsonError);
              }
            } else {
              console.warn("Billing API returned non-JSON response");
            }
          } else {
            console.warn(`Billing API returned ${billingResponse.status} status`);
          }

          // Update call status
          await fetch("/api/calls", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "update-call-status",
              callId: callId,
              status: "completed",
              durationMinutes: durationMinutes,
            }),
          }).catch((e) => console.warn("Error updating call status:", e));
        } catch (billingError) {
          console.error("Error finalizing billing:", billingError);
          // Still update call status even if billing fails
          await fetch("/api/calls", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "update-call-status",
              callId: callId,
              status: "completed",
            }),
          }).catch((e) => console.warn("Error updating call status:", e));
        }
      }

      // Small delay to ensure Firebase update propagates (only if not force exit)
      if (!forceExit) {
        await new Promise(resolve => setTimeout(resolve, 300));
      }

      // Stop all media tracks
      mediaTracksRef.current.forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          console.warn("Error stopping track:", e);
        }
      });
      mediaTracksRef.current = [];

      // Disconnect from LiveKit room (try even if already disconnected)
      if (roomRef.current) {
        try {
          const roomState = roomRef.current.state;
          if (roomState !== "disconnected") {
            await roomRef.current.disconnect();
          } else {
            console.log("Room already disconnected");
          }
        } catch (e) {
          console.warn("Error disconnecting from room:", e);
          // Continue even if disconnect fails
        }
        roomRef.current = null;
      }

      // Unsubscribe from Firebase listener
      if (firebaseUnsubscribeRef.current) {
        firebaseUnsubscribeRef.current();
        firebaseUnsubscribeRef.current = null;
      }

      // Clear stored call IDs
      localStorage.removeItem("tgs:currentCallId");
      localStorage.removeItem("tgs:callId");
    } catch (error) {
      console.error("Error finalizing call:", error);
      // Even if there's an error, ensure user can exit
    } finally {
      // Always navigate away, even if there were errors
      // Use a timeout to ensure navigation happens
      setTimeout(() => {
        const role = localStorage.getItem("tgs:role");
        const path =
          role === "astrologer" ? "/astrologer-dashboard" : "/talk-to-astrologer";
        router.push(path);
      }, forceExit ? 0 : 100);
    }
  };

  // Force exit function - always works, even if room is disconnected
  const handleForceExit = () => {
    console.log("Force exit requested by user");
    // Show disconnecting state
    setIsDisconnecting(true);
    // Clear the disconnecting flag to allow exit
    isDisconnectingRef.current = false;
    // Call disconnect with force flag
    handleDisconnect(true);
  };

  const handleToggleMute = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Try roomRef first, then fallback to room state
    const currentRoom = roomRef.current || room;
    if (!currentRoom) {
      console.error("❌ Room not available for mute toggle", { 
        roomRef: !!roomRef.current, 
        roomState: !!room,
        isConnected,
        isRoomReady 
      });
      alert("Room not connected. Please wait for connection.");
      return;
    }
    
    if (currentRoom.state !== "connected") {
      console.error("❌ Room not connected, state:", currentRoom.state);
      alert("Please wait for the call to connect.");
      return;
    }
    
    try {
      const localParticipant = currentRoom.localParticipant;
      if (!localParticipant) {
        console.error("❌ Local participant not available");
        alert("Participant not available. Please refresh the page.");
        return;
      }
      
      const micPublication = localParticipant.getTrackPublication(Track.Source.Microphone);
      const currentMuted = micPublication?.isMuted ?? !localParticipant.isMicrophoneEnabled;
      const newMutedState = !currentMuted;
      
      console.log(`🎤 Toggling microphone: ${currentMuted ? 'unmuting' : 'muting'}`);
      
      // Update state optimistically
      setIsMuted(newMutedState);
      
      if (micPublication && micPublication.track) {
        // Track exists, mute/unmute it directly
        try {
          if (newMutedState) {
            await micPublication.track.mute();
          } else {
            await micPublication.track.unmute();
          }
          console.log(`✅ Microphone ${newMutedState ? 'muted' : 'unmuted'} via track`);
          
          // Sync state after a brief delay
          setTimeout(() => {
            const updatedMicPub = localParticipant.getTrackPublication(Track.Source.Microphone);
            const actuallyMuted = updatedMicPub?.isMuted ?? !localParticipant.isMicrophoneEnabled;
            setIsMuted(actuallyMuted);
          }, 300);
        } catch (trackError) {
          console.error("❌ Error muting/unmuting track:", trackError);
          // Revert state on error
          setIsMuted(currentMuted);
          alert("Failed to toggle microphone. Please try again.");
        }
      } else {
        // No track, enable/disable microphone (will create new track)
        try {
          console.log("No track found, using setMicrophoneEnabled");
          const success = await localParticipant.setMicrophoneEnabled(!newMutedState);
          console.log("setMicrophoneEnabled result:", success);
          
          if (!success) {
            console.warn("⚠️ Failed to enable/disable microphone");
            setIsMuted(currentMuted);
            alert("Failed to toggle microphone. Please check your browser permissions.");
          } else {
            console.log(`✅ Microphone ${newMutedState ? 'muted' : 'unmuted'} via setMicrophoneEnabled`);
            
            // Sync state after track is created
            setTimeout(() => {
              const updatedMicPub = localParticipant.getTrackPublication(Track.Source.Microphone);
              const actuallyMuted = updatedMicPub?.isMuted ?? !localParticipant.isMicrophoneEnabled;
              setIsMuted(actuallyMuted);
            }, 500);
          }
        } catch (enableError) {
          console.error("❌ Error enabling/disabling microphone:", enableError);
          setIsMuted(currentMuted);
          alert(`Failed to toggle microphone: ${enableError.message || "Unknown error"}`);
        }
      }
    } catch (error) {
      console.error("❌ Error toggling mute:", error);
      // Revert state on error
      const currentRoom = roomRef.current || room;
      const micPub = currentRoom?.localParticipant?.getTrackPublication(Track.Source.Microphone);
      setIsMuted(micPub?.isMuted ?? !currentRoom?.localParticipant?.isMicrophoneEnabled);
      alert(`Error toggling microphone: ${error.message || "Unknown error"}`);
    }
  };

  const handleToggleVideo = async (e) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    
    // Try roomRef first, then fallback to room state
    const currentRoom = roomRef.current || room;
    if (!currentRoom) {
      console.error("❌ Room not available for video toggle", { 
        roomRef: !!roomRef.current, 
        roomState: !!room,
        isConnected,
        isRoomReady 
      });
      alert("Room not connected. Please wait for connection.");
      return;
    }
    
    if (currentRoom.state !== "connected") {
      console.error("❌ Room not connected, state:", currentRoom.state);
      alert("Please wait for the call to connect.");
      return;
    }
    
    try {
      const localParticipant = currentRoom.localParticipant;
      if (!localParticipant) {
        console.error("❌ Local participant not available");
        alert("Participant not available. Please refresh the page.");
        return;
      }
      
      const videoPub = localParticipant.getTrackPublication(Track.Source.Camera);
      const currentVideoEnabled = (videoPub?.isSubscribed && localParticipant.isCameraEnabled) ?? localParticipant.isCameraEnabled;
      const newState = !currentVideoEnabled;
      
      console.log(`📹 Toggling camera: ${currentVideoEnabled ? 'disabling' : 'enabling'}`);
      
      // Update state optimistically
      setIsVideoEnabled(newState);
      
      // Enable/disable camera - this should handle track publishing/unpublishing
      try {
        console.log("Calling setCameraEnabled with:", newState);
        const success = await localParticipant.setCameraEnabled(newState);
        console.log(`setCameraEnabled result: ${success}`);
        
        if (!success) {
          console.warn("⚠️ Failed to enable/disable camera");
          // Revert state
          setIsVideoEnabled(currentVideoEnabled);
          alert("Failed to toggle camera. Please check your browser permissions.");
          return;
        }
        
        // If disabling and there's an existing track, unpublish it
        if (!newState && videoPub && videoPub.track) {
          try {
            await localParticipant.unpublishTrack(videoPub.track);
            console.log("✅ Camera track unpublished");
          } catch (unpubError) {
            console.warn("⚠️ Error unpublishing track:", unpubError);
            // Continue anyway
          }
        }
        
        console.log(`✅ Camera ${newState ? 'enabled' : 'disabled'}`);
        
        // Update state after a brief delay to allow track to initialize/stop
        setTimeout(() => {
          const updatedVideoPub = localParticipant.getTrackPublication(Track.Source.Camera);
          const actuallyEnabled = (updatedVideoPub?.isSubscribed && localParticipant.isCameraEnabled) ?? localParticipant.isCameraEnabled;
          setIsVideoEnabled(actuallyEnabled);
          console.log(`✅ Camera state synced: ${actuallyEnabled ? 'enabled' : 'disabled'}`);
        }, 1000);
      } catch (setError) {
        console.error("❌ Error in setCameraEnabled:", setError);
        // Revert state on error
        setIsVideoEnabled(currentVideoEnabled);
        alert(`Failed to toggle camera: ${setError.message || "Unknown error"}`);
      }
    } catch (error) {
      console.error("❌ Error toggling video:", error);
      // Revert state on error
      const currentRoom = roomRef.current || room;
      const videoPub = currentRoom?.localParticipant?.getTrackPublication(Track.Source.Camera);
      const currentEnabled = (videoPub?.isSubscribed && currentRoom?.localParticipant?.isCameraEnabled) ?? currentRoom?.localParticipant?.isCameraEnabled;
      setIsVideoEnabled(currentEnabled);
      alert(`Error toggling camera: ${error.message || "Unknown error"}`);
    }
  };

  const formatDuration = (s) => {
    const m = Math.floor(s / 60)
      .toString()
      .padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--color-cream)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            textAlign: "center",
            color: "#374151",
          }}
        >
          <h2
            style={{
              fontSize: "1.5rem",
              fontWeight: 600,
              marginBottom: "0.5rem",
              fontFamily: "var(--font-heading)",
            }}
          >
            Setting up Video Call
          </h2>
          <p style={{ color: "#d1d5db", margin: "0 0 1rem 0" }}>
            Please wait while we connect you...
          </p>
          <div
            className="spinner"
            style={{
              width: "2rem",
              height: "2rem",
              borderTopColor: "#fbbf24",
              margin: "0 auto",
            }}
          ></div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        height: "100vh",
        background: "linear-gradient(135deg, #fef9e7 0%, #fdf2d0 50%, #fef9e7 100%)",
        overflow: "hidden",
        position: "relative",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Minimal Header - Zoom/Google Meet Style */}
      <header
        className="video-call-header"
        style={{
          background: "linear-gradient(135deg, rgba(244, 208, 63, 0.95) 0%, rgba(212, 175, 55, 0.95) 50%, rgba(184, 151, 46, 0.95) 100%)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          padding: "0.5rem 1rem",
          position: "relative",
          zIndex: 10,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "3px solid rgba(212, 175, 55, 0.6)",
          boxShadow: "0 4px 12px rgba(212, 175, 55, 0.3)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button
            onClick={handleForceExit}
            disabled={isDisconnecting}
            className="btn btn-ghost video-call-back-btn"
            style={{
              color: "#1f2937",
              border: "2px solid rgba(212, 175, 55, 0.5)",
              background: "rgba(255, 255, 255, 0.9)",
              cursor: isDisconnecting ? "not-allowed" : "pointer",
              opacity: isDisconnecting ? 0.6 : 1,
              padding: "0.5rem",
              minWidth: "44px",
              minHeight: "44px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "0.5rem",
              transition: "all 0.15s ease",
              boxShadow: "0 2px 4px rgba(212, 175, 55, 0.2)",
            }}
            onMouseEnter={(e) => {
              if (!isDisconnecting) {
                e.currentTarget.style.background = "rgba(244, 208, 63, 0.2)";
                e.currentTarget.style.borderColor = "rgba(212, 175, 55, 0.8)";
                e.currentTarget.style.transform = "scale(1.05)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isDisconnecting) {
                e.currentTarget.style.background = "rgba(255, 255, 255, 0.9)";
                e.currentTarget.style.borderColor = "rgba(212, 175, 55, 0.5)";
                e.currentTarget.style.transform = "scale(1)";
              }
            }}
          >
            <ArrowLeft style={{ width: "1.25rem", height: "1.25rem" }} />
          </button>
          <div>
            <p
              className="video-call-duration"
              style={{
                color: "#1f2937",
                fontSize: "0.875rem",
                margin: 0,
                fontWeight: 600,
                fontFamily: "'Georgia', serif",
              }}
            >
              {formatDuration(callDuration)}
            </p>
          </div>
        </div>

        <div
          className="video-call-header-right"
          style={{
            display: "flex",
            gap: "0.5rem",
            alignItems: "center",
          }}
        >
          <div
            className="video-call-live-badge"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              padding: "0.25rem 0.75rem",
              background: "linear-gradient(135deg, #d4af37 0%, #b8972e 100%)",
              borderRadius: "var(--radius-full)",
              flexShrink: 0,
              boxShadow: "0 2px 8px rgba(212, 175, 55, 0.3)",
            }}
          >
            <div
              style={{
                width: "0.5rem",
                height: "0.5rem",
                borderRadius: "50%",
                background: "white",
                boxShadow: "0 0 8px rgba(255, 255, 255, 0.8)",
                animation: "pulse 2s infinite",
              }}
            ></div>
            <span
              className="video-call-live-text"
              style={{ fontSize: "0.75rem", color: "white", fontWeight: 600 }}
            >
              LIVE
            </span>
          </div>
        </div>
      </header>

      {/* Video Conference Area - Full Screen */}
      <div
        className="video-call-main-content"
        style={{
          flex: 1,
          height: "calc(100vh - 80px)", // Reduced header height
          position: "relative",
          minHeight: 0,
          overflow: "hidden",
          background: "linear-gradient(135deg, #fef9e7 0%, #fdf2d0 50%, #fef9e7 100%)",
          width: "100%",
        }}
      >
        {!token || !wsUrl ? (
          <div style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "100%",
            color: "#1f2937",
            fontSize: "1rem",
            fontFamily: "'Georgia', serif",
            fontWeight: 500,
            flexDirection: "column",
            gap: "1rem",
          }}>
            <Loader2 style={{ width: "2rem", height: "2rem", animation: "spin 1s linear infinite", color: "#d4af37" }} />
            <div>Connecting to video call...</div>
          </div>
        ) : (
        <LiveKitRoom
          serverUrl={wsUrl}
          token={token}
          onDisconnected={(reason) => {
            console.log("Room disconnected:", reason);
            handleDisconnect();
          }}
          onError={(err) => {
            // Ignore track-related errors that are common during initialization
            const errorMessage = err?.message || err?.toString() || "";
            if (errorMessage.includes("not part of the array") ||
              errorMessage.includes("camera_placeholder") ||
              errorMessage.includes("_placeholder") ||
              errorMessage.includes("not in")) {
              // Suppress these errors - they're harmless LiveKit initialization issues
              return;
            }
            console.error("LiveKit error:", err);
            setError(`Video call error: ${errorMessage}`);
          }}
          onConnected={async (roomParam) => {
            setError("");
            
            // Get room from parameter or try to get it from LiveKitRoom context
            // Sometimes roomParam might be undefined, so we'll handle it gracefully
            let room = roomParam;
            
            // If room is not provided, we'll set up listeners in useEffect to get it
            if (!room) {
              console.warn("⚠️ Room not provided in onConnected callback, will set up listeners");
              setIsConnected(true);
              setIsRoomReady(true);
              return; // Exit early, room will be set up via RoomEvent listener
            }
            
            console.log("✅ Video call connected successfully", { 
              roomName: room.name || "unknown", 
              roomState: room.state || "unknown",
              hasLocalParticipant: !!room.localParticipant
            });
            setIsConnected(true);

            // Store room reference immediately
            setRoom(room);
            roomRef.current = room;
            isDisconnectingRef.current = false;
            
            // Set room ready immediately
            setIsRoomReady(true);

            // Explicitly enable camera and microphone after connection
            try {
                console.log("🎥 Requesting camera and microphone permissions...");
                const localParticipant = room.localParticipant;
                
                // Enable microphone first (usually faster)
                try {
                  console.log("🎤 Enabling microphone...");
                  const micEnabled = await localParticipant.setMicrophoneEnabled(true);
                  console.log("✅ Microphone enabled:", micEnabled);
                  // Immediate state sync - no delay needed
                  requestAnimationFrame(() => {
                    const micPub = localParticipant.getTrackPublication(Track.Source.Microphone);
                    const micMuted = micPub?.isMuted ?? !micEnabled;
                    setIsMuted(micMuted);
                    console.log("🎤 Mic state synced:", micMuted ? 'muted' : 'unmuted');
                  });
                } catch (micError) {
                  console.error("❌ Error enabling microphone:", micError);
                  setIsMuted(true); // Default to muted on error
                }
                
                // Enable camera with retry logic (reduced delays)
                let cameraEnabled = false;
                let retries = 2; // Reduced retries
                while (!cameraEnabled && retries > 0) {
                  try {
                    console.log(`📹 Enabling camera (attempt ${3 - retries})...`);
                    cameraEnabled = await localParticipant.setCameraEnabled(true);
                    console.log(`✅ Camera enabled (attempt ${3 - retries}):`, cameraEnabled);
                    if (cameraEnabled) {
                      // Immediate state sync
                      requestAnimationFrame(() => {
                        const videoPub = localParticipant.getTrackPublication(Track.Source.Camera);
                        const videoEnabled = (videoPub?.isSubscribed && localParticipant.isCameraEnabled) ?? cameraEnabled;
                        setIsVideoEnabled(videoEnabled);
                        console.log("📹 Video state synced:", videoEnabled ? 'enabled' : 'disabled');
                      });
                      break;
                    }
                  } catch (camError) {
                    console.error(`❌ Camera enable error (attempt ${3 - retries}):`, camError);
                  }
                  retries--;
                  if (retries > 0) {
                    await new Promise(resolve => setTimeout(resolve, 200)); // Reduced delay
                  }
                }
                
                if (!cameraEnabled) {
                  console.warn("⚠️ Camera permission denied or device unavailable");
                  setIsVideoEnabled(false);
                  setError("Please allow camera access to use video call. You can still use audio.");
                }
              } catch (permError) {
                console.error("❌ Error requesting permissions:", permError);
                setError("Please allow camera and microphone access to use video call");
              }

            // Final state sync after a brief delay to allow tracks to initialize
            setTimeout(() => {
              if (room && room.localParticipant) {
                const localParticipant = room.localParticipant;
                const micPub = localParticipant.getTrackPublication(Track.Source.Microphone);
                const videoPub = localParticipant.getTrackPublication(Track.Source.Camera);
                const micMuted = micPub?.isMuted ?? !localParticipant.isMicrophoneEnabled;
                const videoEnabled = (videoPub?.isSubscribed && localParticipant.isCameraEnabled) ?? localParticipant.isCameraEnabled;
                setIsMuted(micMuted);
                setIsVideoEnabled(videoEnabled);
                console.log("✅ Final state sync - Mic:", micMuted ? 'muted' : 'unmuted', "Video:", videoEnabled ? 'enabled' : 'disabled');
              }
            }, 500);
          }}
          connectOptions={{
            autoSubscribe: true,
            adaptiveStream: true, // Enable adaptive streaming to reduce lag
            dynacast: true, // Enable dynamic casting for better performance
            publishDefaults: {
              videoResolution: {
                width: 1280,
                height: 720,
              },
              videoCodec: "vp8",
              videoPreset: {
                maxBitrate: 2500000, // Optimize video bitrate
              },
              audioPreset: {
                maxBitrate: 32000, // Optimize audio bitrate
              },
            },
          }}
          style={{ height: "100%", width: "100%" }}
        >
          <ErrorBoundary>
            {/* Room Capture - Fallback to get room from context if onConnected didn't provide it */}
            <RoomCapture onRoomReady={(capturedRoom) => {
              if (!roomRef.current && capturedRoom) {
                console.log("✅ Setting room from RoomCapture component");
                setRoom(capturedRoom);
                roomRef.current = capturedRoom;
                setIsRoomReady(true);
                setIsConnected(true);
              }
            }} />
            {isRoomReady ? (
              <>
                {/* Control Buttons Provider - Uses hooks inside LiveKitRoom */}
                <VideoCallControlButtonsProvider
                  onHandlersReady={(handlers) => {
                    controlHandlersRef.current = handlers;
                  }}
                  onStateChange={({ isMuted: muted, isVideoEnabled: videoEnabled }) => {
                    setIsMuted(muted);
                    setIsVideoEnabled(videoEnabled);
                  }}
                />
                <CustomVideoGridWrapper
                  room={roomRef.current || room}
                  onMuteToggle={handleToggleMute}
                  onVideoToggle={handleToggleVideo}
                  isMuted={isMuted}
                  isVideoEnabled={isVideoEnabled}
                />
                {/* Chat Overlay - Inside LiveKitRoom to access hooks */}
                {showChat && (
                  <VideoCallChatWrapper 
                    room={roomRef.current || room} 
                    showChat={showChat}
                    setShowChat={setShowChat}
                  />
                )}
              </>
            ) : (
              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                height: "100%",
                color: "#1f2937",
                fontSize: "1rem",
                fontFamily: "'Georgia', serif",
                fontWeight: 500,
              }}>
                Initializing video...
              </div>
            )}
          </ErrorBoundary>
        </LiveKitRoom>
        )}
      </div>

      {/* Bottom Control Bar - Zoom/Google Meet Style */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "linear-gradient(135deg, rgba(244, 208, 63, 0.95) 0%, rgba(212, 175, 55, 0.95) 50%, rgba(184, 151, 46, 0.95) 100%)",
          backdropFilter: "blur(20px)",
          WebkitBackdropFilter: "blur(20px)",
          padding: "1rem",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000,
          borderTop: "3px solid rgba(212, 175, 55, 0.6)",
          boxShadow: "0 -4px 12px rgba(212, 175, 55, 0.3)",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: "0.75rem",
            alignItems: "center",
            flexWrap: "wrap",
            justifyContent: "center",
            maxWidth: "100%",
          }}
        >
          {/* Mute/Unmute Button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              // Use handler from provider if available, otherwise fallback to old handler
              if (controlHandlersRef.current?.handleToggleMute) {
                controlHandlersRef.current.handleToggleMute();
              } else {
                handleToggleMute(e);
              }
            }}
            className="control-btn"
            type="button"
            disabled={!isRoomReady || !isConnected}
            style={{
              width: "3rem",
              height: "3rem",
              borderRadius: "50%",
              border: "none",
              background: isMuted ? "#ef4444" : "linear-gradient(135deg, #f4d03f 0%, #d4af37 50%, #b8972e 100%)",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: (!isRoomReady || !isConnected) ? "not-allowed" : "pointer",
              opacity: (!isRoomReady || !isConnected) ? 0.5 : 1,
              transition: "all 0.15s ease",
              boxShadow: isMuted ? "0 2px 8px rgba(239, 68, 68, 0.3)" : "0 2px 8px rgba(212, 175, 55, 0.3)",
            }}
            onMouseEnter={(e) => {
              if (!isMuted && isRoomReady && isConnected) {
                e.currentTarget.style.transform = "scale(1.1)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(212, 175, 55, 0.4)";
              }
            }}
            onMouseLeave={(e) => {
              if (!isMuted) {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(212, 175, 55, 0.3)";
              }
            }}
          >
            {isMuted ? (
              <MicOff style={{ width: "1.5rem", height: "1.5rem" }} />
            ) : (
              <Mic style={{ width: "1.5rem", height: "1.5rem" }} />
            )}
          </button>

          {/* Video On/Off Button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              // Use handler from provider if available, otherwise fallback to old handler
              if (controlHandlersRef.current?.handleToggleVideo) {
                controlHandlersRef.current.handleToggleVideo();
              } else {
                handleToggleVideo(e);
              }
            }}
            className="control-btn"
            type="button"
            disabled={!isRoomReady || !isConnected}
            style={{
              width: "3rem",
              height: "3rem",
              borderRadius: "50%",
              border: "none",
              background: isVideoEnabled ? "linear-gradient(135deg, #f4d03f 0%, #d4af37 50%, #b8972e 100%)" : "#ef4444",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: (!isRoomReady || !isConnected) ? "not-allowed" : "pointer",
              opacity: (!isRoomReady || !isConnected) ? 0.5 : 1,
              transition: "all 0.15s ease",
              boxShadow: isVideoEnabled ? "0 2px 8px rgba(212, 175, 55, 0.3)" : "0 2px 8px rgba(239, 68, 68, 0.3)",
            }}
            onMouseEnter={(e) => {
              if (isVideoEnabled && isRoomReady && isConnected) {
                e.currentTarget.style.transform = "scale(1.1)";
                e.currentTarget.style.boxShadow = "0 4px 12px rgba(212, 175, 55, 0.4)";
              }
            }}
            onMouseLeave={(e) => {
              if (isVideoEnabled) {
                e.currentTarget.style.transform = "scale(1)";
                e.currentTarget.style.boxShadow = "0 2px 8px rgba(212, 175, 55, 0.3)";
              }
            }}
          >
            {isVideoEnabled ? (
              <Video style={{ width: "1.5rem", height: "1.5rem" }} />
            ) : (
              <VideoOff style={{ width: "1.5rem", height: "1.5rem" }} />
            )}
          </button>

          {/* Chat Button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const newChatState = !showChat;
              setShowChat(newChatState);
              console.log("Chat toggled:", newChatState);
            }}
            className="control-btn"
            style={{
              width: "3rem",
              height: "3rem",
              borderRadius: "50%",
              border: "none",
              background: showChat ? "linear-gradient(135deg, #f4d03f 0%, #d4af37 50%, #b8972e 100%)" : "linear-gradient(135deg, #d4af37 0%, #f4d03f 50%, #b8972e 100%)",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.15s ease",
              boxShadow: "0 2px 8px rgba(212, 175, 55, 0.3)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "scale(1.1)";
              e.currentTarget.style.boxShadow = showChat ? "0 4px 12px rgba(124, 58, 237, 0.4)" : "0 4px 12px rgba(212, 175, 55, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.boxShadow = "0 2px 8px rgba(212, 175, 55, 0.3)";
            }}
            type="button"
          >
            <MessageSquare style={{ width: "1.5rem", height: "1.5rem" }} />
          </button>

          {/* End Call Button - Red, Prominent */}
          <button
            onClick={handleForceExit}
            disabled={isDisconnecting}
            className="control-btn end-call-btn"
            style={{
              width: "3rem",
              height: "3rem",
              borderRadius: "50%",
              border: "none",
              background: isDisconnecting ? "#991b1b" : "#ef4444",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: isDisconnecting ? "not-allowed" : "pointer",
              transition: "all 0.2s",
            }}
          >
            {isDisconnecting ? (
              <Loader2 style={{ width: "1.5rem", height: "1.5rem", animation: "spin 1s linear infinite" }} />
            ) : (
              <PhoneOff style={{ width: "1.5rem", height: "1.5rem" }} />
            )}
          </button>
        </div>
      </div>

      {/* Disconnecting Overlay */}
      {isDisconnecting && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.7)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            flexDirection: "column",
            gap: "1rem",
          }}
        >
          <Loader2
            style={{
              width: "3rem",
              height: "3rem",
              color: "white",
              animation: "spin 1s linear infinite",
            }}
          />
          <p
            style={{
              color: "white",
              fontSize: "1.25rem",
              fontWeight: 600,
              margin: 0,
            }}
          >
            Disconnecting call...
          </p>
        </div>
      )}

      {/* Comprehensive Responsive Styles */}
      <style jsx>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }

        /* Mobile First - Base styles */
        .video-call-header {
          padding: 0.5rem 1rem !important;
        }

        .video-call-main-content {
          height: calc(100vh - 140px) !important;
        }

        /* Small Mobile (max-width: 480px) */
        @media (max-width: 480px) {
          .video-call-header {
            padding: 0.5rem 0.75rem !important;
          }

          .video-call-main-content {
            height: calc(100vh - 120px) !important;
          }

          .control-btn {
            width: 2.75rem !important;
            height: 2.75rem !important;
          }

          .control-btn svg {
            width: 1.25rem !important;
            height: 1.25rem !important;
          }
        }

        /* Mobile (max-width: 768px) */
        @media (max-width: 768px) {
          .video-call-main-content {
            height: calc(100vh - 130px) !important;
          }
        }

        /* Desktop (1024px+) */
        @media (min-width: 1025px) {
          .video-call-main-content {
            height: calc(100vh - 150px) !important;
          }
        }

        /* Landscape Mobile */
        @media (max-height: 500px) and (orientation: landscape) {
          .video-call-main-content {
            height: calc(100vh - 100px) !important;
          }

          .control-btn {
            width: 2.5rem !important;
            height: 2.5rem !important;
          }
        }

        /* Touch-friendly buttons */
        @media (hover: none) and (pointer: coarse) {
          .control-btn {
            min-width: 44px !important;
            min-height: 44px !important;
          }
        }
      `}</style>
    </div>
  );
}
