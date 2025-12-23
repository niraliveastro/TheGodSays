"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  LiveKitRoom, 
  AudioConference,
  useLocalParticipant,
  useRemoteParticipants
} from "@livekit/components-react";
import { Track, Room, DataPacket_Kind, RemoteParticipant, RoomEvent, ParticipantEvent, ConnectionQuality } from "livekit-client";
import "@livekit/components-styles";
import { doc, onSnapshot, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import {
  ArrowLeft,
  PhoneOff,
  Mic,
  MicOff,
  Volume2,
  Loader2,
  MessageSquare,
  Send,
  ChevronDown,
} from "lucide-react";

// Mic Button Component - Inside LiveKitRoom context
function MicButton({ onMuteChange }) {
  const { localParticipant } = useLocalParticipant();
  const [isMuted, setIsMuted] = useState(false);

  // Sync with actual track state
  useEffect(() => {
    if (!localParticipant) return;
    
    const updateMuteState = () => {
      const micPublication = localParticipant.getTrackPublication(Track.Source.Microphone);
      let muted = false;
      
      if (micPublication) {
        muted = micPublication.isMuted;
      } else {
        muted = !localParticipant.isMicrophoneEnabled;
      }
      
      setIsMuted(muted);
      if (onMuteChange) onMuteChange(muted);
    };
    
    updateMuteState();
    
    // Listen for changes
    const handleTrackMuted = (pub) => {
      if (pub?.source === Track.Source.Microphone) {
        updateMuteState();
      }
    };
    const handleTrackUnmuted = (pub) => {
      if (pub?.source === Track.Source.Microphone) {
        updateMuteState();
      }
    };
    
    localParticipant.on(ParticipantEvent.TrackMuted, handleTrackMuted);
    localParticipant.on(ParticipantEvent.TrackUnmuted, handleTrackUnmuted);
    
    return () => {
      localParticipant.off(ParticipantEvent.TrackMuted, handleTrackMuted);
      localParticipant.off(ParticipantEvent.TrackUnmuted, handleTrackUnmuted);
    };
  }, [localParticipant, onMuteChange]);

  const handleToggleMute = async () => {
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
      setIsMuted(newMutedState);
      
      if (micPublication && micPublication.track) {
        // Use track methods
        if (newMutedState) {
          await micPublication.track.mute();
        } else {
          await micPublication.track.unmute();
        }
      } else {
        // Use setMicrophoneEnabled
        await localParticipant.setMicrophoneEnabled(!newMutedState);
      }
      
      console.log(`✅ Microphone ${newMutedState ? 'muted' : 'unmuted'}`);
    } catch (error) {
      console.error("❌ Error toggling mute:", error);
      // Revert on error
      const micPub = localParticipant.getTrackPublication(Track.Source.Microphone);
      setIsMuted(micPub?.isMuted ?? !localParticipant.isMicrophoneEnabled);
    }
  };

  return (
    <button
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        console.log("🎤 Mic button clicked!");
        handleToggleMute();
      }}
      className="btn"
      style={{
        width: "3.5rem",
        height: "3.5rem",
        borderRadius: "50%",
        border: isMuted ? "none" : "2px solid #e5e7eb",
        background: isMuted ? "#ef4444" : "#ffffff",
        color: isMuted ? "white" : "#374151",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        transition: "all 0.2s",
        boxShadow: isMuted ? "0 2px 8px rgba(239, 68, 68, 0.3)" : "0 2px 4px rgba(0, 0, 0, 0.1)",
        flexShrink: 0,
      }}
      title={isMuted ? "Click to Unmute" : "Click to Mute"}
    >
      {isMuted ? (
        <MicOff style={{ width: "1.5rem", height: "1.5rem" }} />
      ) : (
        <Mic style={{ width: "1.5rem", height: "1.5rem" }} />
      )}
    </button>
  );
}

// Inner component to access LiveKit hooks
function VoiceCallControls({ onDisconnect, onToggleMute, isMuted }) {
  const { localParticipant } = useLocalParticipant();
  const [actualMuted, setActualMuted] = useState(false);

  useEffect(() => {
    if (localParticipant) {
      const micPublication = localParticipant.getTrackPublication(Track.Source.Microphone);
      if (micPublication) {
        setActualMuted(micPublication.isMuted);
      }
    }
  }, [localParticipant]);

  const handleMuteToggle = async () => {
    try {
      if (localParticipant) {
        const micPublication = localParticipant.getTrackPublication(Track.Source.Microphone);
        if (micPublication && micPublication.track) {
          if (micPublication.isMuted) {
            await micPublication.track.unmute();
            setActualMuted(false);
          } else {
            await micPublication.track.mute();
            setActualMuted(true);
          }
        } else {
          await localParticipant.setMicrophoneEnabled(!actualMuted);
          setActualMuted(!actualMuted);
        }
      }
      onToggleMute();
    } catch (error) {
      console.error("Error toggling mute:", error);
    }
  };

  return (
    <button
      onClick={handleMuteToggle}
      className="btn"
      style={{
        flex: 1,
        background: actualMuted ? "white" : "rgba(255,255,255,0.1)",
        color: actualMuted ? "#dc2626" : "white",
        border: actualMuted ? "2px solid #fca5a5" : "2px solid rgba(255,255,255,0.3)",
        padding: "0.875rem 1.25rem",
        fontSize: "0.95rem",
        fontWeight: 600,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.5rem",
      }}
    >
      {actualMuted ? (
        <>
          <MicOff style={{ width: "1.125rem", height: "1.125rem" }} />
          <span>Microphone</span>
          <ChevronDown style={{ width: "1rem", height: "1rem" }} />
        </>
      ) : (
        <>
          <Mic style={{ width: "1.125rem", height: "1.125rem" }} />
          <span>Microphone</span>
          <ChevronDown style={{ width: "1rem", height: "1rem" }} />
        </>
      )}
    </button>
  );
}

// Participant Status Component - WhatsApp/Zoom Style
function VoiceCallParticipantStatus() {
  const { localParticipant } = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const userRole = localStorage.getItem("tgs:role") || "user";
  const isAstrologer = userRole === "astrologer";
  const [waveformHeights, setWaveformHeights] = useState([40, 50, 60, 50, 40]);
  const [participantProfiles, setParticipantProfiles] = useState({});
  const [callData, setCallData] = useState(null);
  const { userProfile } = useAuth();

  // Animate waveform
  useEffect(() => {
    const interval = setInterval(() => {
      setWaveformHeights([
        Math.random() * 60 + 40,
        Math.random() * 60 + 40,
        Math.random() * 60 + 40,
        Math.random() * 60 + 40,
        Math.random() * 60 + 40,
      ]);
    }, 200);
    return () => clearInterval(interval);
  }, []);

  // Fetch participant profiles
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
        // Fetch call data to get userId and astrologerId
        const callDocRef = doc(db, "calls", callId);
        const callSnap = await getDoc(callDocRef);
        
        if (callSnap.exists()) {
          const data = callSnap.data();
          setCallData(data);
          const userId = data.userId;
          const astrologerId = data.astrologerId;

          console.log("Fetching profiles for voice call:", { userId, astrologerId });

          // Fetch user profile
          if (userId) {
            try {
              const userDoc = await getDoc(doc(db, "users", userId));
              if (userDoc.exists()) {
                const userData = userDoc.data();
                profiles[userId] = {
                  name: userData.name || userData.displayName || userData.email?.split("@")[0] || "User",
                  picture: userData.profilePicture || userData.photoURL || userData.avatar || null,
                };
                console.log("User profile fetched:", profiles[userId]);
              }
            } catch (e) {
              console.warn("Error fetching user profile:", e);
            }
          }

          // Fetch astrologer profile
          if (astrologerId) {
            try {
              const astroDoc = await getDoc(doc(db, "astrologers", astrologerId));
              if (astroDoc.exists()) {
                const astroData = astroDoc.data();
                profiles[astrologerId] = {
                  name: astroData.name || astroData.displayName || "Astrologer",
                  picture: astroData.profilePicture || astroData.photoURL || astroData.avatar || null,
                };
                console.log("Astrologer profile fetched:", profiles[astrologerId]);
              }
            } catch (e) {
              console.warn("Error fetching astrologer profile:", e);
            }
          }
        }

        console.log("All profiles for voice call:", profiles);
        setParticipantProfiles(profiles);
      } catch (error) {
        console.error("Error fetching participant profiles:", error);
      }
    };

    fetchProfiles();
  }, []);

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

  // Always show both user and astrologer, even if remote participant hasn't joined yet
  const allParticipants = [];
  
  // Add local participant (You)
  if (localParticipant?.localParticipant) {
    allParticipants.push({
      participant: localParticipant.localParticipant,
      isLocal: true,
      name: currentUserProfile?.name || (isAstrologer ? "Astrologer" : "You"),
      displayName: currentUserProfile?.name || (isAstrologer ? "Astrologer" : "You"),
      avatarLetter: (currentUserProfile?.name || (isAstrologer ? "Astrologer" : "You")).charAt(0).toUpperCase(),
      profilePicture: currentUserProfile?.picture || null,
    });
  }
  
  // Add remote participants
  remoteParticipants.forEach(p => {
    const isRemoteAstrologer = p.identity.includes("astrologer");
    allParticipants.push({
      participant: p,
      isLocal: false,
      name: remoteParticipantProfile?.name || p.name || (isRemoteAstrologer ? "Astrologer" : "User"),
      displayName: remoteParticipantProfile?.name || p.name || (isRemoteAstrologer ? "Astrologer" : "User"),
      avatarLetter: (remoteParticipantProfile?.name || p.name || (isRemoteAstrologer ? "Astrologer" : "User")).charAt(0).toUpperCase(),
      profilePicture: remoteParticipantProfile?.picture || null,
    });
  });
  
  // If no remote participants yet, show placeholder for the other person
  if (remoteParticipants.length === 0) {
    const otherPersonIsAstrologer = !isAstrologer;
    allParticipants.push({
      participant: null,
      isLocal: false,
      name: remoteParticipantProfile?.name || (otherPersonIsAstrologer ? "Astrologer" : "User"),
      displayName: remoteParticipantProfile?.name || (otherPersonIsAstrologer ? "Astrologer" : "User"),
      avatarLetter: (remoteParticipantProfile?.name || (otherPersonIsAstrologer ? "Astrologer" : "User")).charAt(0).toUpperCase(),
      profilePicture: remoteParticipantProfile?.picture || null,
      isPlaceholder: true
    });
  }

  return (
    <div style={{ 
      display: "flex", 
      flexDirection: "column",
      gap: "1rem",
      width: "100%",
      maxWidth: "400px",
    }}>
      {allParticipants.map(({ participant, isLocal, name, displayName, avatarLetter, isPlaceholder, profilePicture }, index) => {
        // Handle placeholder (when other person hasn't joined yet)
        const micPublication = participant?.getTrackPublication(Track.Source.Microphone);
        const isAudioMuted = isPlaceholder ? false : (micPublication?.isMuted ?? !participant?.isMicrophoneEnabled);
        
        return (
          <div
            key={participant?.identity || `placeholder-${index}` || index}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1rem",
              padding: "1rem",
              background: "#f9fafb",
              borderRadius: "0.75rem",
              border: "1px solid #e5e7eb",
            }}
          >
            {/* Avatar with Profile Picture */}
            {profilePicture ? (
              <img
                src={profilePicture}
                alt={displayName}
                style={{
                  width: "3rem",
                  height: "3rem",
                  borderRadius: "50%",
                  objectFit: "cover",
                  border: "2px solid rgba(255, 255, 255, 0.3)",
                  boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
                  flexShrink: 0,
                }}
                onError={(e) => {
                  // Fallback to initial if image fails to load
                  e.target.style.display = "none";
                  const fallback = e.target.nextElementSibling;
                  if (fallback) fallback.style.display = "flex";
                }}
              />
            ) : null}
            <div
              style={{
                width: "3rem",
                height: "3rem",
                borderRadius: "50%",
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                display: profilePicture ? "none" : "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "white",
                fontSize: "1.5rem",
                fontWeight: "bold",
                flexShrink: 0,
              }}
            >
              {avatarLetter || displayName.charAt(0).toUpperCase()}
            </div>
            
            {/* Name and Status */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ 
                fontSize: "1rem", 
                fontWeight: 600, 
                color: "#374151",
                marginBottom: "0.25rem",
              }}>
                {isLocal ? "You" : displayName}
              </div>
              <div style={{ 
                fontSize: "0.875rem", 
                color: "#6b7280",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}>
                {isPlaceholder ? (
                  <>
                    <div style={{ width: "0.5rem", height: "0.5rem", borderRadius: "50%", background: "#9ca3af" }}></div>
                    <span>Connecting...</span>
                  </>
                ) : isAudioMuted ? (
                  <>
                    <MicOff style={{ width: "0.875rem", height: "0.875rem", color: "#ef4444" }} />
                    <span>Muted</span>
                  </>
                ) : (
                  <>
                    <Mic style={{ width: "0.875rem", height: "0.875rem", color: "#22c55e" }} />
                    <span>Speaking</span>
                  </>
                )}
              </div>
            </div>
            
            {/* Audio Waveform Indicator */}
            {!isPlaceholder && !isAudioMuted && (
              <div style={{
                display: "flex",
                alignItems: "center",
                gap: "0.25rem",
                height: "1.5rem",
              }}>
                {waveformHeights.map((height, i) => (
                  <div
                    key={i}
                    style={{
                      width: "0.25rem",
                      height: `${height}%`,
                      background: "#22c55e",
                      borderRadius: "0.125rem",
                      transition: "height 0.2s ease",
                    }}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Wrapper to access LiveKit hooks
function VoiceCallChatWrapper() {
  const { localParticipant } = useLocalParticipant();
  const room = localParticipant?.localParticipant?.room || null;
  
  useEffect(() => {
    if (room) {
      console.log("✅ Chat: Room available:", room.name);
    } else {
      console.log("⏳ Chat: Waiting for room...");
    }
  }, [room]);
  
  if (!room) {
    return (
      <div style={{ 
        padding: "1rem", 
        color: "#6b7280", 
        fontSize: "0.875rem", 
        textAlign: "center",
        background: "#f9fafb",
        borderRadius: "0.5rem",
        margin: "1rem 0"
      }}>
        Connecting to chat...
      </div>
    );
  }
  
  return <VoiceCallChat room={room} localParticipant={localParticipant?.localParticipant} />;
}

// Chat component for LiveKit room
function VoiceCallChat({ room, localParticipant }) {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef(null);
  const userRole = localStorage.getItem("tgs:role") || "user";
  const isAstrologer = userRole === "astrologer";

  // Listen for incoming messages via room events
  useEffect(() => {
    if (!room) {
      console.log("Chat: Room not available yet");
      return;
    }

    console.log("Chat: Setting up message listener for room:", room.name);

    const handleDataReceived = (payload, participant, kind, topic) => {
      if (kind === DataPacket_Kind.RELIABLE && topic === undefined) {
        try {
          const data = JSON.parse(new TextDecoder().decode(payload));
          
          // Handle call-ended signal
          if (data.type === "call-ended") {
            console.log("Received call-ended signal from other party");
            return;
          }
          
          // Handle chat messages
          if (data.type === "chat" && data.message) {
            const isFromMe = participant?.identity === localParticipant?.identity;
            console.log("Chat: Received message from", isFromMe ? "me" : participant?.name, ":", data.message);
            // Only add if not from me (we already added it locally)
            if (!isFromMe) {
              setMessages((prev) => [
                ...prev,
                {
                  id: Date.now() + Math.random(),
                  text: data.message,
                  sender: data.sender || participant?.name || (participant?.identity?.includes("astrologer") ? "Astrologer" : "User"),
                  isUser: false,
                  timestamp: new Date(),
                },
              ]);
            }
          }
        } catch (error) {
          console.error("Error parsing data message:", error);
        }
      }
    };

    // Use RoomEvent.DataReceived
    room.on(RoomEvent.DataReceived, handleDataReceived);
    console.log("Chat: Message listener attached");

    return () => {
      if (room) {
        room.off(RoomEvent.DataReceived, handleDataReceived);
        console.log("Chat: Message listener removed");
      }
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
      console.warn("Cannot send empty message");
      return;
    }
    
    if (!room) {
      console.error("Room not available for sending message");
      return;
    }
    
    if (!room.localParticipant) {
      console.error("Local participant not available for sending message");
      return;
    }

    const messageData = {
      type: "chat",
      message: input.trim(),
      sender: isAstrologer ? "Astrologer" : "User",
    };

    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify(messageData));
      room.localParticipant.publishData(data, DataPacket_Kind.RELIABLE);
      
      // Add message to local state immediately for better UX
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + Math.random(),
          text: input.trim(),
          sender: isAstrologer ? "Astrologer" : "User",
          isUser: true,
          timestamp: new Date(),
        },
      ]);
      
      setInput("");
      console.log("Message sent successfully");
    } catch (error) {
      console.error("Error sending message:", error);
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
        display: "flex",
        flexDirection: "column",
        height: "100%",
        borderTop: "1px solid #e5e7eb",
        paddingTop: "1rem",
      }}
    >
      <div
        style={{
          fontSize: "0.875rem",
          fontWeight: 600,
          color: "#374151",
          marginBottom: "0.75rem",
          padding: "0 0.5rem",
        }}
      >
        Messages
      </div>
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          marginBottom: "1rem",
          maxHeight: "200px",
          padding: "0.5rem",
          background: "#f9fafb",
          borderRadius: "0.5rem",
        }}
      >
        {messages.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              color: "#9ca3af",
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
                marginBottom: "0.75rem",
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
                  padding: "0 0.5rem",
                }}
              >
                {msg.sender}
              </div>
              <div
                style={{
                  background: msg.isUser
                    ? "linear-gradient(135deg, #d4af37, #b8972e)"
                    : "#e5e7eb",
                  color: msg.isUser ? "white" : "#374151",
                  padding: "0.5rem 0.75rem",
                  borderRadius: "0.75rem",
                  maxWidth: "80%",
                  fontSize: "0.875rem",
                  wordWrap: "break-word",
                }}
              >
                {msg.text}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Enter a message..."
          style={{
            flex: 1,
            padding: "0.75rem",
            border: "1px solid #e5e7eb",
            borderRadius: "0.5rem",
            fontSize: "0.875rem",
            outline: "none",
            focus: {
              borderColor: "#d4af37",
            },
          }}
          onFocus={(e) => {
            e.target.style.borderColor = "#d4af37";
          }}
          onBlur={(e) => {
            e.target.style.borderColor = "#e5e7eb";
          }}
        />
        <button
          onClick={handleSendMessage}
          disabled={!input.trim()}
          style={{
            padding: "0.75rem 1rem",
            background: input.trim()
              ? "linear-gradient(135deg, #d4af37, #b8972e)"
              : "#e5e7eb",
            color: input.trim() ? "white" : "#9ca3af",
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

export default function VoiceCallRoom() {
  const params = useParams();
  const router = useRouter();
  const [token, setToken] = useState("");
  const [wsUrl, setWsUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [permissionError, setPermissionError] = useState("");
  const [room, setRoom] = useState(null);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [showChat, setShowChat] = useState(false);
  const roomRef = useRef(null);
  const callIdRef = useRef(null);
  const isDisconnectingRef = useRef(false);
  const firebaseUnsubscribeRef = useRef(null);
  const mediaTracksRef = useRef([]);

  // Request microphone permission before connecting
  useEffect(() => {
    const requestMicrophonePermission = async () => {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          setPermissionError("Your browser doesn't support microphone access. Please use a modern browser.");
          return false;
        }

        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        stream.getTracks().forEach(track => track.stop());
        setPermissionError("");
        return true;
      } catch (err) {
        console.error("Microphone permission error:", err);
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          setPermissionError("Microphone permission denied. Please allow microphone access in your browser settings and refresh the page.");
        } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
          setPermissionError("No microphone found. Please connect a microphone and refresh the page.");
        } else {
          setPermissionError(`Microphone access error: ${err.message}. Please check your browser settings.`);
        }
        return false;
      }
    };

    requestMicrophonePermission();
  }, []);

  useEffect(() => {
    const initializeRoom = async () => {
      if (permissionError) {
        setLoading(false);
        return;
      }
      const userRole = localStorage.getItem("tgs:role") || "user";
      const userId = localStorage.getItem("tgs:userId");
      const astrologerId = localStorage.getItem("tgs:astrologerId");
      const isAstrologer = userRole === "astrologer";

      try {
        const roomName = params.room;
        if (!userId) throw new Error("User not authenticated");

        const callId = localStorage.getItem("tgs:currentCallId") || 
                      localStorage.getItem("tgs:callId");
        callIdRef.current = callId;

        const participantId = isAstrologer
          ? `astrologer-${userId}`
          : `user-${userId}`;
        const sessionAstrologerId = isAstrologer
          ? astrologerId
          : astrologerId || "user-session";

        const response = await fetch("/api/livekit/create-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            astrologerId: sessionAstrologerId,
            userId: participantId,
            roomName,
            callType: "voice",
            role: isAstrologer ? "astrologer" : "user",
            displayName: isAstrologer ? "Astrologer" : "User",
          }),
        });

        if (!response.ok) {
          const err = await response.text();
          let data = { error: "Unknown error" };
          try {
            data = JSON.parse(err);
          } catch {}
          throw new Error(data.error || "Session failed");
        }

        const data = await response.json();
        if (!data.token || !data.wsUrl) throw new Error("Invalid session data");

        setToken(data.token);
        setWsUrl(data.wsUrl);
      } catch (err) {
        setError(`Failed to join voice call: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    if (params.room && !permissionError) initializeRoom();
  }, [params.room, permissionError]);

  // Call duration timer
  useEffect(() => {
    if (isConnected) {
      const timer = setInterval(() => setCallDuration((p) => p + 1), 1000);
      return () => clearInterval(timer);
    }
  }, [isConnected]);

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
  }, [isConnected]); // Re-run when connection status changes

  const updateCallStatus = async (status, durationMinutes = null) => {
    try {
      const callId = callIdRef.current || 
                    localStorage.getItem("tgs:currentCallId") || 
                    localStorage.getItem("tgs:callId");
      
      if (!callId) {
        console.warn("No callId found for status update");
        return;
      }

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
        const errorData = await response.json().catch(() => ({}));
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
      const callId = callIdRef.current || 
                    localStorage.getItem("tgs:currentCallId") || 
                    localStorage.getItem("tgs:callId");
      const durationMinutes = Math.max(1, Math.ceil(callDuration / 60));

      console.log(`Ending voice call ${callId} with duration ${durationMinutes} minutes`);

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
      if (callId) {
        try {
          await updateCallStatus("completed", durationMinutes);
          console.log("Call status updated to completed in Firebase");
        } catch (e) {
          console.warn("Error updating call status:", e);
        }

        // Finalize billing
        if (durationMinutes > 0) {
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

            const billingResult = await billingResponse.json();
            if (billingResult.success) {
              console.log(`✅ Voice billing finalized: ₹${billingResult.finalAmount} charged`);
            } else {
              console.error("❌ Voice billing finalization failed:", billingResult.error);
            }
          } catch (billingError) {
            console.error("Error finalizing billing:", billingError);
          }
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
      console.error("Error finalizing voice call:", error);
      // Even if there's an error, ensure user can exit
    } finally {
      // Always navigate away, even if there were errors
      // Use a timeout to ensure navigation happens
      setTimeout(() => {
        const role = localStorage.getItem("tgs:role");
        const path = role === "astrologer" ? "/astrologer-dashboard" : "/talk-to-astrologer";
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
    currentRoom.localParticipant.audioTrackPublications.forEach((publication) => {
      if (publication.track && !mediaTracksRef.current.includes(publication.track)) {
        mediaTracksRef.current.push(publication.track);
      }
    });

    // Sync mute state with actual track state
    const updateMuteState = () => {
      const localParticipant = currentRoom.localParticipant;
      if (localParticipant) {
        const micPublication = localParticipant.getTrackPublication(Track.Source.Microphone);
        const micMuted = micPublication?.isMuted ?? !localParticipant.isMicrophoneEnabled;
        setIsMuted(micMuted);
      }
    };

    // Update state initially
    updateMuteState();

    // Listen for track changes
    const handleTrackMuted = (publication) => {
      if (publication && publication.source === Track.Source.Microphone) {
        console.log("📢 Track muted event received");
        updateMuteState();
      }
    };
    const handleTrackUnmuted = (publication) => {
      if (publication && publication.source === Track.Source.Microphone) {
        console.log("📢 Track unmuted event received");
        updateMuteState();
      }
    };
    const handleTrackPublished = (publication) => {
      if (publication && publication.source === Track.Source.Microphone) {
        console.log("📢 Track published event received");
        updateMuteState();
      }
    };
    
    // Listen for track subscriptions
    const handleLocalTrackSubscribed = (track, publication, participant) => {
      if (participant === currentRoom.localParticipant && publication?.source === Track.Source.Microphone) {
        console.log("📢 Local microphone track subscribed");
        updateMuteState();
      }
    };

    currentRoom.localParticipant.on(ParticipantEvent.TrackMuted, handleTrackMuted);
    currentRoom.localParticipant.on(ParticipantEvent.TrackUnmuted, handleTrackUnmuted);
    currentRoom.localParticipant.on(ParticipantEvent.TrackPublished, handleTrackPublished);
    currentRoom.on(RoomEvent.TrackSubscribed, handleLocalTrackSubscribed);

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
          localParticipant.off(ParticipantEvent.TrackMuted, handleTrackMuted);
          localParticipant.off(ParticipantEvent.TrackUnmuted, handleTrackUnmuted);
          localParticipant.off(ParticipantEvent.TrackPublished, handleTrackPublished);
        }
        currentRoom.off(RoomEvent.TrackSubscribed, handleLocalTrackSubscribed);
        currentRoom.off(RoomEvent.TrackSubscribed, handleLocalTrackSubscribed);
      }
    };
  }, [room, isConnected]); // Re-run when room or connection status changes

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Cleanup on component unmount
      if (roomRef.current && !isDisconnectingRef.current) {
        roomRef.current.disconnect().catch(console.error);
      }
      
      // Stop all media tracks
      mediaTracksRef.current.forEach((track) => {
        try {
          track.stop();
        } catch (e) {
          console.warn("Error stopping track on unmount:", e);
        }
      });
      
      // Unsubscribe from Firebase
      if (firebaseUnsubscribeRef.current) {
        firebaseUnsubscribeRef.current();
      }
    };
  }, []);

  const handleToggleMute = async () => {
    const currentRoom = roomRef.current || room;
    
    if (!currentRoom) {
      console.warn("Room not available, cannot toggle mute");
      return;
    }
    
    if (!isConnected) {
      console.warn("Not connected yet, cannot toggle mute");
      return;
    }
    
    try {
      const localParticipant = currentRoom.localParticipant;
      if (!localParticipant) {
        console.warn("Local participant not available");
        return;
      }
      
      // Get current mute state
      const micPublication = localParticipant.getTrackPublication(Track.Source.Microphone);
      let currentMuted = false;
      
      if (micPublication) {
        currentMuted = micPublication.isMuted;
      } else {
        // If no publication, check if microphone is enabled
        currentMuted = !localParticipant.isMicrophoneEnabled;
      }
      
      const newMutedState = !currentMuted;
      
      console.log(`🎤 Toggling microphone: current=${currentMuted} (muted), new=${newMutedState} (muted)`);
      
      try {
        // Update state optimistically first for immediate UI feedback
        setIsMuted(newMutedState);
        
        // Method 1: If track exists and is a LocalTrack, use track.mute()/unmute()
        if (micPublication && micPublication.track) {
          console.log("🎤 Using track.mute()/unmute() method");
          const track = micPublication.track;
          
          if (newMutedState) {
            // Mute the track
            if (track.mute) {
              await track.mute();
              console.log("✅ Track muted via track.mute()");
            } else {
              // Fallback: use setMicrophoneEnabled
              await localParticipant.setMicrophoneEnabled(false);
              console.log("✅ Microphone disabled via setMicrophoneEnabled(false)");
            }
          } else {
            // Unmute the track
            if (track.unmute) {
              await track.unmute();
              console.log("✅ Track unmuted via track.unmute()");
            } else {
              // Fallback: use setMicrophoneEnabled
              await localParticipant.setMicrophoneEnabled(true);
              console.log("✅ Microphone enabled via setMicrophoneEnabled(true)");
            }
          }
        } 
        // Method 2: If no track, use setMicrophoneEnabled
        else {
          console.log("🎤 Using setMicrophoneEnabled() method (no track yet)");
          const enabled = !newMutedState; // enabled = not muted
          const result = await localParticipant.setMicrophoneEnabled(enabled);
          console.log(`✅ setMicrophoneEnabled(${enabled}) result:`, result);
          
          if (!result) {
            console.warn("⚠️ setMicrophoneEnabled returned false - permission may be denied");
          }
        }
        
        // Verify state after operation with multiple checks
        setTimeout(() => {
          const updatedMicPub = localParticipant.getTrackPublication(Track.Source.Microphone);
          let actualMuted = false;
          
          if (updatedMicPub) {
            actualMuted = updatedMicPub.isMuted;
            console.log("📊 Mic publication state:", {
              isMuted: updatedMicPub.isMuted,
              hasTrack: !!updatedMicPub.track,
              trackMuted: updatedMicPub.track?.isMuted
            });
          } else {
            actualMuted = !localParticipant.isMicrophoneEnabled;
            console.log("📊 No mic publication, using isMicrophoneEnabled:", localParticipant.isMicrophoneEnabled);
          }
          
          setIsMuted(actualMuted);
          console.log(`✅ Microphone state verified: ${actualMuted ? 'MUTED 🔴' : 'UNMUTED 🟢'}`);
        }, 300);
        
      } catch (error) {
        console.error("❌ Error toggling mute:", error);
        console.error("Error details:", {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
        // Revert state on error
        setIsMuted(currentMuted);
      }
    } catch (error) {
      console.error("❌ Error toggling mute:", error);
    }
  };

  const handleBack = () => {
    // Back button should work same as End Call - disconnect properly
    handleForceExit();
  };

  const formatDuration = (s) => {
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const sec = (s % 60).toString().padStart(2, "0");
    return `${m}:${sec}`;
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #fdfbf7 0%, #f8f5f0 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <Loader2
            style={{
              width: "3rem",
              height: "3rem",
              color: "#d4af37",
              animation: "spin 1s linear infinite",
              margin: "0 auto 1rem",
            }}
          />
          <p style={{ color: "#374151", fontSize: "1.125rem" }}>
            Connecting to voice call...
          </p>
        </div>
      </div>
    );
  }

  if (error || permissionError) {
    const displayError = permissionError || error;
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #fdfbf7 0%, #f8f5f0 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
        }}
      >
        <div
          className="card"
          style={{
            maxWidth: "28rem",
            background: "white",
            backdropFilter: "blur(12px)",
            WebkitBackdropFilter: "blur(12px)",
            border: "1px solid rgba(212, 175, 55, 0.2)",
            shadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1)",
            textAlign: "center",
            padding: "2rem",
            borderRadius: "1rem",
          }}
        >
          <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>🔇</div>
          <h2
            style={{
              color: "#374151",
              fontSize: "1.5rem",
              fontWeight: 600,
              marginBottom: "0.5rem",
              fontFamily: "var(--font-heading)",
            }}
          >
            {permissionError ? "Microphone Permission Required" : "Connection Failed"}
          </h2>
          <p
            style={{
              color: "#6b7280",
              marginBottom: "1.5rem",
              lineHeight: 1.6,
            }}
          >
            {displayError}
          </p>
          {permissionError && (
            <div
              style={{
                background: "#fef3c7",
                padding: "1rem",
                borderRadius: "0.5rem",
                marginBottom: "1.5rem",
                textAlign: "left",
              }}
            >
              <p style={{ color: "#92400e", fontSize: "0.875rem", marginBottom: "0.5rem", fontWeight: 600 }}>
                How to fix:
              </p>
              <ol style={{ color: "#92400e", fontSize: "0.875rem", paddingLeft: "1.5rem", margin: 0 }}>
                <li>Click the lock icon in your browser's address bar</li>
                <li>Find "Microphone" in the permissions list</li>
                <li>Change it to "Allow"</li>
                <li>Refresh this page</li>
              </ol>
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <button
              onClick={() => window.location.reload()}
              className="btn btn-primary"
              style={{
                width: "100%",
                background: "linear-gradient(135deg, #d4af37, #b8972e)",
                color: "white",
                border: "none",
              }}
            >
              Retry Connection
            </button>
            <button
              onClick={handleBack}
              className="btn btn-ghost"
              style={{
                width: "100%",
                color: "#374151",
                border: "1px solid #e5e7eb",
              }}
            >
              <ArrowLeft style={{ width: "1rem", height: "1rem", marginRight: "0.5rem" }} />
              Back
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!token || !wsUrl) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #fdfbf7 0%, #f8f5f0 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>⏳</div>
          <h2
            style={{
              color: "#374151",
              fontSize: "1.5rem",
              fontWeight: "600",
              marginBottom: "0.5rem",
              fontFamily: "var(--font-heading)",
            }}
          >
            Setting up Voice Call
          </h2>
          <p style={{ color: "#6b7280", marginBottom: "1rem" }}>
            Please wait while we connect you...
          </p>
          <Loader2
            style={{
              width: "2rem",
              height: "2rem",
              color: "#d4af37",
              animation: "spin 1s linear infinite",
              margin: "0 auto",
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #fdfbf7 0%, #f8f5f0 100%)",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
      {/* Golden background orbs */}
      <div
        style={{
          position: "absolute",
          top: "10%",
          left: "10%",
          width: "500px",
          height: "500px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(212, 175, 55, 0.15), transparent)",
          filter: "blur(120px)",
          zIndex: 0,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "10%",
          right: "10%",
          width: "600px",
          height: "600px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(184, 151, 46, 0.15), transparent)",
          filter: "blur(120px)",
          zIndex: 0,
        }}
      />

      {/* Header */}
      <header
        className="voice-call-header"
        style={{
          background: "rgba(255, 255, 255, 0.8)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          borderBottom: "1px solid rgba(212, 175, 55, 0.2)",
          padding: "0.75rem 1rem",
          position: "relative",
          zIndex: 10,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "0.75rem",
            width: "100%",
          }}
        >
          <div 
            className="voice-call-header-left"
            style={{ 
              display: "flex", 
              alignItems: "center", 
              gap: "0.75rem", 
              flex: "1 1 auto", 
              minWidth: 0 
            }}
          >
            <button
              onClick={handleBack}
              disabled={isDisconnecting}
              className="btn btn-ghost voice-call-back-btn"
              style={{
                color: "#374151",
                border: "1px solid rgba(212, 175, 55, 0.3)",
                padding: "0.5rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                background: "white",
                cursor: isDisconnecting ? "not-allowed" : "pointer",
                opacity: isDisconnecting ? 0.6 : 1,
                minWidth: "44px",
                minHeight: "44px",
                flexShrink: 0,
              }}
            >
              {isDisconnecting ? (
                <>
                  <Loader2 style={{ width: "1rem", height: "1rem", animation: "spin 1s linear infinite" }} />
                  <span className="voice-call-btn-text">Disconnecting...</span>
                </>
              ) : (
                <>
                  <ArrowLeft style={{ width: "1rem", height: "1rem" }} />
                  <span className="voice-call-btn-text">Back</span>
                </>
              )}
            </button>
            <div style={{ minWidth: 0, flex: "1 1 auto" }}>
              <p 
                className="voice-call-duration"
                style={{ 
                  color: "#374151", 
                  fontSize: "0.875rem", 
                  margin: 0, 
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                Duration: {formatDuration(callDuration)}
              </p>
            </div>
          </div>

          <div 
            className="voice-call-controls"
            style={{ 
              display: "flex", 
              gap: "0.5rem", 
              alignItems: "center",
              flexShrink: 0,
            }}
          >
            <button
              onClick={handleForceExit}
              disabled={isDisconnecting}
              className="btn voice-call-end-btn"
              style={{
                background: isDisconnecting 
                  ? "linear-gradient(135deg, #991b1b, #7f1d1d)" 
                  : "linear-gradient(135deg, #dc2626, #991b1b)",
                color: "white",
                border: "none",
                boxShadow: "0 4px 12px rgba(220, 38, 38, 0.3)",
                padding: "0.5rem 1rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                cursor: isDisconnecting ? "not-allowed" : "pointer",
                opacity: isDisconnecting ? 0.8 : 1,
                minHeight: "44px",
                whiteSpace: "nowrap",
              }}
            >
              {isDisconnecting ? (
                <>
                  <Loader2 style={{ width: "1rem", height: "1rem", animation: "spin 1s linear infinite" }} />
                  <span className="voice-call-btn-text">Disconnecting...</span>
                </>
              ) : (
                <>
                  <PhoneOff style={{ width: "1rem", height: "1rem" }} />
                  <span className="voice-call-btn-text">End Call</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div
        className="voice-call-main-content"
        style={{
          flex: 1,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: "1rem",
          position: "relative",
          zIndex: 1,
          minHeight: 0,
          overflow: "auto",
        }}
      >
        <div
          className="card voice-call-card"
          style={{
            width: "100%",
            maxWidth: "40rem",
            background: "white",
            borderRadius: "1rem",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            display: "flex",
            flexDirection: "column",
            minHeight: "32rem",
            padding: "1.5rem",
            border: "1px solid rgba(212, 175, 55, 0.2)",
            maxHeight: "calc(100vh - 120px)",
            overflow: "auto",
          }}
        >
          {/* Audio Conference */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", marginBottom: "1.5rem" }}>
            <LiveKitRoom
              serverUrl={wsUrl}
              token={token}
              onDisconnected={handleDisconnect}
              onError={(err) => {
                console.error("LiveKit error:", err);
                if (err.message && (err.message.includes("Permission denied") || err.message.includes("NotAllowedError"))) {
                  setPermissionError("Microphone permission denied. Please allow microphone access in your browser settings.");
                } else {
                  setError(`Voice call error: ${err.message}`);
                }
              }}
              onConnected={async (room) => {
                setIsConnected(true);
                setError("");
                
                // Store room reference - room might be undefined, so check first
                if (room) {
                  setRoom(room);
                  roomRef.current = room;
                  isDisconnectingRef.current = false;
                  
                  // Explicitly enable microphone after connection
                  try {
                    console.log("Enabling microphone after connection...");
                    const localParticipant = room.localParticipant;
                    const micEnabled = await localParticipant.setMicrophoneEnabled(true);
                    console.log("Microphone enabled:", micEnabled);
                    
                    if (!micEnabled) {
                      console.warn("Failed to enable microphone - may need user permission");
                    }
                  } catch (permError) {
                    console.error("Error enabling microphone:", permError);
                    setPermissionError("Please allow microphone access to use voice call");
                  }
                } else {
                  // If room is not provided, we'll set up listeners in useEffect
                  console.warn("Room not provided in onConnected callback");
                }
              }}
              connectOptions={{
                autoSubscribe: true,
                adaptiveStream: true, // Enable adaptive streaming to reduce lag
                dynacast: true, // Enable dynamic casting for better performance
                publishDefaults: {
                  audioPreset: {
                    maxBitrate: 32000, // Optimize audio bitrate
                  },
                },
              }}
              audio={true}
              video={false}
              style={{ width: "100%", height: "100%" }}
            >
              <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                {/* Audio Conference - Handles audio playback */}
                <div style={{ 
                  position: "absolute",
                  width: 0,
                  height: 0,
                  overflow: "hidden",
                }}>
                  <AudioConference />
                </div>
                
                {/* Participant Status Cards - Clean Voice Chat Style */}
                <div style={{ 
                  flex: 1, 
                  display: "flex", 
                  flexDirection: "column",
                  alignItems: "center", 
                  justifyContent: "center", 
                  gap: "2rem",
                  padding: "2rem 1rem",
                }}>
                  <VoiceCallParticipantStatus />
                </div>

                {/* Bottom Controls - WhatsApp/Zoom Style */}
                <div style={{ 
                  borderTop: "1px solid #e5e7eb", 
                  paddingTop: "1.5rem", 
                  marginTop: "auto",
                  background: "white",
                }}>
                  <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem", justifyContent: "center", alignItems: "center" }}>
                    {/* Mic Button - Inside LiveKitRoom context */}
                    <MicButton onMuteChange={(muted) => setIsMuted(muted)} />
                    <button
                      onClick={() => setShowChat(!showChat)}
                      className="btn"
                      style={{
                        flex: 1,
                        background: showChat ? "rgba(59, 130, 246, 0.1)" : "white",
                        color: showChat ? "#3b82f6" : "#6b7280",
                        border: `2px solid ${showChat ? "#3b82f6" : "#e5e7eb"}`,
                        padding: "0.875rem 1.25rem",
                        fontSize: "0.95rem",
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.5rem",
                        cursor: "pointer",
                        transition: "all 0.2s",
                      }}
                    >
                      <MessageSquare style={{ width: "1.125rem", height: "1.125rem" }} />
                      <span>Chat</span>
                    </button>
                    <button
                      onClick={handleForceExit}
                      className="btn"
                      style={{
                        background: "linear-gradient(135deg, #dc2626, #991b1b)",
                        color: "white",
                        border: "none",
                        padding: "0.875rem 1.25rem",
                        fontSize: "0.95rem",
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.5rem",
                        cursor: "pointer",
                      }}
                    >
                      <PhoneOff style={{ width: "1.125rem", height: "1.125rem" }} />
                      <span>Leave</span>
                    </button>
                  </div>
                </div>

                {/* Chat Component - Show/Hide */}
                {showChat && (
                  <div style={{ 
                    borderTop: "1px solid #e5e7eb",
                    marginTop: "1rem",
                    paddingTop: "1rem",
                  }}>
                    <VoiceCallChatWrapper />
                  </div>
                )}
              </div>
            </LiveKitRoom>
          </div>

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

        /* Mobile First - Base styles */
        .voice-call-header {
          padding: 0.75rem 1rem !important;
        }

        .voice-call-btn-text {
          display: inline;
        }

        .voice-call-duration {
          font-size: 0.875rem !important;
        }

        .voice-call-card {
          padding: 1.5rem !important;
          min-height: auto !important;
          max-height: calc(100vh - 100px) !important;
        }

        .voice-call-main-content {
          padding: 0.75rem !important;
        }

        /* Small Mobile (max-width: 480px) */
        @media (max-width: 480px) {
          .voice-call-header {
            padding: 0.5rem 0.75rem !important;
          }

          .voice-call-header > div {
            flex-direction: column !important;
            align-items: stretch !important;
            gap: 0.5rem !important;
          }

          .voice-call-header > div > div:first-child {
            width: 100% !important;
            justify-content: space-between !important;
          }

          .voice-call-header > div > div:last-child {
            width: 100% !important;
            justify-content: space-between !important;
            gap: 0.5rem !important;
          }

          .voice-call-back-btn,
          .voice-call-mute-btn,
          .voice-call-end-btn {
            flex: 1 1 auto !important;
            min-width: 0 !important;
          }

          .voice-call-btn-text {
            font-size: 0.75rem !important;
          }

          .voice-call-duration {
            font-size: 0.75rem !important;
          }

          .voice-call-card {
            padding: 1rem !important;
            border-radius: 0.75rem !important;
            max-height: calc(100vh - 140px) !important;
          }

          .voice-call-main-content {
            padding: 0.5rem !important;
          }
        }

        /* Mobile (max-width: 640px) */
        @media (max-width: 640px) {
          .voice-call-header > div {
            gap: 0.75rem !important;
          }

          .voice-call-controls {
            gap: 0.5rem !important;
          }

          .voice-call-card {
            padding: 1.25rem !important;
            max-height: calc(100vh - 120px) !important;
          }

          .voice-call-main-content {
            padding: 0.5rem !important;
          }
        }

        /* Tablet (641px - 1024px) */
        @media (min-width: 641px) and (max-width: 1024px) {
          .voice-call-header {
            padding: 1rem 1.25rem !important;
          }

          .voice-call-card {
            padding: 1.75rem !important;
            max-width: 36rem !important;
          }

          .voice-call-main-content {
            padding: 1.5rem !important;
          }
        }

        /* Desktop (1024px+) */
        @media (min-width: 1025px) {
          .voice-call-header {
            padding: 1rem 1.5rem !important;
          }

          .voice-call-card {
            padding: 2rem !important;
          }

          .voice-call-main-content {
            padding: 2rem 1.5rem !important;
          }
        }

        /* Landscape Mobile */
        @media (max-height: 500px) and (orientation: landscape) {
          .voice-call-header {
            padding: 0.5rem 1rem !important;
          }

          .voice-call-card {
            padding: 1rem !important;
            min-height: auto !important;
            max-height: calc(100vh - 80px) !important;
          }

          .voice-call-main-content {
            padding: 0.5rem !important;
          }

          .voice-call-btn-text {
            display: none !important;
          }

          .voice-call-back-btn,
          .voice-call-mute-btn,
          .voice-call-end-btn {
            padding: 0.5rem !important;
          }
        }

        /* Touch-friendly buttons */
        @media (hover: none) and (pointer: coarse) {
          .voice-call-back-btn,
          .voice-call-mute-btn,
          .voice-call-end-btn {
            min-width: 44px !important;
            min-height: 44px !important;
          }
        }

        /* Prevent text overflow */
        .voice-call-duration {
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      `}</style>
    </div>
  );
}
