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
function VideoTile({ participant, isLocal, name, isMobile }) {
  const videoElRef = useRef(null);
  
  const videoPublication = participant?.getTrackPublication(Track.Source.Camera);
  const audioPublication = participant?.getTrackPublication(Track.Source.Microphone);
  const videoTrack = videoPublication?.track;
  const audioTrack = audioPublication?.track;
  const isVideoMuted = !videoTrack || !videoPublication?.isSubscribed || !participant?.isCameraEnabled;
  const isAudioMuted = !audioTrack || !audioPublication?.isSubscribed || participant?.isMicrophoneEnabled === false;
  
  useEffect(() => {
    if (!videoElRef.current || !participant) return;
    
    const attachTrack = () => {
      const videoPub = participant.getTrackPublication(Track.Source.Camera);
      const track = videoPub?.track;
      
      if (track && videoPub?.isSubscribed && participant.isCameraEnabled) {
        track.attach(videoElRef.current);
      } else if (videoElRef.current) {
        // Clear video element if no track
        const existingTracks = videoElRef.current.srcObject?.getTracks();
        if (existingTracks) {
          existingTracks.forEach(t => t.stop());
        }
        videoElRef.current.srcObject = null;
      }
    };
    
    attachTrack();
    
    // Listen for track updates
    const handleTrackSubscribed = () => {
      attachTrack();
    };
    
    participant.on(ParticipantEvent.TrackSubscribed, handleTrackSubscribed);
    participant.on(ParticipantEvent.TrackUnsubscribed, attachTrack);
    
    return () => {
      participant.off(ParticipantEvent.TrackSubscribed, handleTrackSubscribed);
      participant.off(ParticipantEvent.TrackUnsubscribed, attachTrack);
      
      const videoPub = participant.getTrackPublication(Track.Source.Camera);
      const track = videoPub?.track;
      if (videoElRef.current && track) {
        track.detach(videoElRef.current);
      }
    };
  }, [participant]);
  
  return (
    <>
      {videoTrack && !isVideoMuted && participant.isCameraEnabled ? (
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
          }}
        />
      ) : (
        <div
          style={{
            width: "100%",
            height: "100%",
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontSize: isMobile ? "2rem" : "4rem",
            fontWeight: "bold",
          }}
        >
          {name?.charAt(0).toUpperCase() || "?"}
        </div>
      )}
      
      {/* Participant Name Overlay */}
      <div
        style={{
          position: "absolute",
          bottom: "0.5rem",
          left: "0.5rem",
          background: "rgba(0, 0, 0, 0.7)",
          color: "white",
          padding: "0.25rem 0.75rem",
          borderRadius: "0.25rem",
          fontSize: "0.875rem",
          fontWeight: 500,
          display: "flex",
          alignItems: "center",
          gap: "0.5rem",
        }}
      >
        {isLocal && <span style={{ fontSize: "0.7rem" }}>You</span>}
        <span>{name || "Participant"}</span>
        {isAudioMuted && (
          <MicOff style={{ width: "0.875rem", height: "0.875rem", color: "#ef4444" }} />
        )}
      </div>

      {/* Video/Audio Status Indicators */}
      {isLocal && (
        <div
          style={{
            position: "absolute",
            top: "0.5rem",
            right: "0.5rem",
            display: "flex",
            gap: "0.25rem",
          }}
        >
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
        </div>
      )}
    </>
  );
}

// Custom Video Grid Component (Zoom/Google Meet style)
function CustomVideoGrid({ room, onMuteToggle, onVideoToggle, isMuted, isVideoEnabled }) {
  const localParticipant = useLocalParticipant();
  const remoteParticipants = useRemoteParticipants();
  const userRole = localStorage.getItem("tgs:role") || "user";
  const isAstrologer = userRole === "astrologer";
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  const allParticipants = [
    { participant: localParticipant.localParticipant, isLocal: true, name: isAstrologer ? "Astrologer" : "You" },
    ...remoteParticipants.map(p => ({ 
      participant: p, 
      isLocal: false, 
      name: p.name || (p.identity.includes("astrologer") ? "Astrologer" : "User") 
    }))
  ];

  // Mobile: Stack vertically (up and bottom), Desktop: Side by side (left and right)
  const containerStyle = {
    width: "100%",
    height: "100%",
    display: "flex",
    flexDirection: isMobile ? "column" : "row",
    gap: isMobile ? "0.5rem" : "0.75rem",
    padding: isMobile ? "0.5rem" : "1rem",
    overflow: "hidden",
    background: "#1a1a1a",
  };

  const videoTileStyle = {
    flex: "1 1 50%",
    width: isMobile ? "100%" : "50%",
    height: isMobile ? "calc(50% - 0.25rem)" : "100%",
    minHeight: isMobile ? "calc(50% - 0.25rem)" : "100%",
    position: "relative",
    borderRadius: "0.5rem",
    overflow: "hidden",
    background: "#2a2a2a",
    border: "2px solid rgba(255, 255, 255, 0.1)",
  };

  return (
    <div style={containerStyle}>
      {allParticipants.map(({ participant, isLocal, name }, index) => {
        if (!participant) return null;
        
        const videoTrack = participant.getTrackPublication(Track.Source.Camera)?.track;
        const audioTrack = participant.getTrackPublication(Track.Source.Microphone)?.track;
        const isVideoMuted = !videoTrack || !participant.isCameraEnabled;
        const isAudioMuted = !audioTrack || participant.isMicrophoneEnabled === false;

        return (
          <div key={participant.identity || index} style={videoTileStyle}>
            <VideoTile participant={participant} isLocal={isLocal} name={name} isMobile={isMobile} />
          </div>
        );
      })}
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
    if (!room) return;

    const handleDataReceived = (payload, participant, kind, topic) => {
      if (kind === DataPacket_Kind.RELIABLE && topic === undefined) {
        try {
          const data = JSON.parse(new TextDecoder().decode(payload));
          
          // Handle call-ended signal
          if (data.type === "call-ended") {
            return;
          }
          
          // Handle chat messages
          if (data.type === "chat" && data.message) {
            const isFromMe = participant?.identity === localParticipant?.identity;
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
          console.error("Error parsing data message:", error);
        }
      }
    };

    room.on(RoomEvent.DataReceived, handleDataReceived);

    return () => {
      room.off(RoomEvent.DataReceived, handleDataReceived);
    };
  }, [room, localParticipant, isAstrologer]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (!input.trim() || !room || !localParticipant) return;

    const messageData = {
      type: "chat",
      message: input.trim(),
      sender: isAstrologer ? "Astrologer" : "User",
    };

    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(JSON.stringify(messageData));
      room.localParticipant.publishData(data, DataPacket_Kind.RELIABLE);
      setInput("");
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
        position: "absolute",
        right: "1rem",
        top: "1rem",
        width: "320px",
        height: "calc(100% - 2rem)",
        maxHeight: "500px",
        background: "rgba(0, 0, 0, 0.9)",
        backdropFilter: "blur(12px)",
        borderRadius: "0.75rem",
        border: "1px solid rgba(255, 255, 255, 0.2)",
        display: "flex",
        flexDirection: "column",
        zIndex: 1000,
        overflow: "hidden",
      }}
    >
      <div
        style={{
          padding: "1rem",
          borderBottom: "1px solid rgba(255, 255, 255, 0.1)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h3 style={{ color: "white", margin: 0, fontSize: "1rem", fontWeight: 600 }}>Chat</h3>
        <button
          onClick={() => {/* Close chat handled by parent */}}
          style={{
            background: "transparent",
            border: "none",
            color: "white",
            cursor: "pointer",
            padding: "0.25rem",
          }}
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
              color: "rgba(255, 255, 255, 0.5)",
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
                  color: "rgba(255, 255, 255, 0.6)",
                  marginBottom: "0.25rem",
                }}
              >
                {msg.sender}
              </div>
              <div
                style={{
                  background: msg.isUser
                    ? "rgba(59, 130, 246, 0.8)"
                    : "rgba(255, 255, 255, 0.2)",
                  color: "white",
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
      <div
        style={{
          padding: "1rem",
          borderTop: "1px solid rgba(255, 255, 255, 0.1)",
          display: "flex",
          gap: "0.5rem",
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
            background: "rgba(255, 255, 255, 0.1)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
            borderRadius: "0.5rem",
            color: "white",
            fontSize: "0.875rem",
            outline: "none",
          }}
        />
        <button
          onClick={handleSendMessage}
          disabled={!input.trim()}
          style={{
            padding: "0.75rem",
            background: input.trim() ? "rgba(59, 130, 246, 0.8)" : "rgba(255, 255, 255, 0.1)",
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

// Wrapper to use hooks inside LiveKitRoom
function CustomVideoGridWrapper({ room, onMuteToggle, onVideoToggle, isMuted, isVideoEnabled }) {
  return <CustomVideoGrid room={room} onMuteToggle={onMuteToggle} onVideoToggle={onVideoToggle} isMuted={isMuted} isVideoEnabled={isVideoEnabled} />;
}

// Chat Wrapper
function VideoCallChatWrapper({ room, showChat, setShowChat }) {
  const { localParticipant } = useLocalParticipant();
  if (!showChat || !room) return null;
  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <VideoCallChat room={room} localParticipant={localParticipant} />
      <button
        onClick={() => setShowChat(false)}
        style={{
          position: "absolute",
          top: "1rem",
          right: "1rem",
          background: "rgba(0, 0, 0, 0.7)",
          border: "none",
          color: "white",
          cursor: "pointer",
          padding: "0.5rem",
          borderRadius: "50%",
          zIndex: 1001,
        }}
      >
        <X style={{ width: "1rem", height: "1rem" }} />
      </button>
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
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to create session");
        }

        const { token: accessToken, wsUrl: serverUrl } = await response.json();
        setToken(accessToken);
        setWsUrl(serverUrl);
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

  // Call duration timer
  useEffect(() => {
    const timer = setInterval(() => setCallDuration((p) => p + 1), 1000);
    return () => clearInterval(timer);
  }, []);

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
      const micPub = localParticipant.getTrackPublication(Track.Source.Microphone);
      const videoPub = localParticipant.getTrackPublication(Track.Source.Camera);
      
      const micMuted = micPub?.isMuted ?? !localParticipant.isMicrophoneEnabled;
      const videoEnabled = (videoPub?.isSubscribed && localParticipant.isCameraEnabled) ?? localParticipant.isCameraEnabled;
      
      setIsMuted(micMuted);
      setIsVideoEnabled(videoEnabled);
      
      console.log(`State updated - Mic: ${micMuted ? 'muted' : 'unmuted'}, Video: ${videoEnabled ? 'enabled' : 'disabled'}`);
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
      // Get call details from localStorage or URL
      const callId = callIdRef.current ||
        localStorage.getItem("tgs:currentCallId") ||
        localStorage.getItem("tgs:callId") ||
        params.room;
      const durationMinutes = Math.max(1, Math.ceil(callDuration / 60)); // Convert seconds to minutes, minimum 1 minute

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

          const billingResult = await billingResponse.json();

          if (billingResult.success) {
            console.log(
              `✅ Billing finalized: ₹${billingResult.finalAmount} charged, ₹${billingResult.refundAmount} refunded`
            );
          } else {
            console.error("❌ Billing finalization failed:", billingResult.error);
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

  const handleToggleMute = async () => {
    if (!roomRef.current) {
      console.warn("Room not available");
      return;
    }
    
    try {
      const localParticipant = roomRef.current.localParticipant;
      if (!localParticipant) {
        console.warn("Local participant not available");
        return;
      }
      
      const micPublication = localParticipant.getTrackPublication(Track.Source.Microphone);
      const currentMuted = micPublication?.isMuted ?? !localParticipant.isMicrophoneEnabled;
      const newMutedState = !currentMuted;
      
      console.log(`Toggling microphone: ${currentMuted ? 'unmuting' : 'muting'}`);
      
      if (micPublication && micPublication.track) {
        if (newMutedState) {
          await micPublication.track.mute();
        } else {
          await micPublication.track.unmute();
        }
      } else {
        // If no track publication, enable/disable microphone
        await localParticipant.setMicrophoneEnabled(!newMutedState);
      }
      
      // Update state immediately
      setIsMuted(newMutedState);
      console.log(`✅ Microphone ${newMutedState ? 'muted' : 'unmuted'}`);
    } catch (error) {
      console.error("❌ Error toggling mute:", error);
    }
  };

  const handleToggleVideo = async () => {
    if (!roomRef.current) {
      console.warn("Room not available");
      return;
    }
    
    try {
      const localParticipant = roomRef.current.localParticipant;
      if (!localParticipant) {
        console.warn("Local participant not available");
        return;
      }
      
      const videoPub = localParticipant.getTrackPublication(Track.Source.Camera);
      const currentVideoEnabled = videoPub?.isSubscribed ?? localParticipant.isCameraEnabled;
      const newState = !currentVideoEnabled;
      
      console.log(`Toggling camera: ${currentVideoEnabled ? 'disabling' : 'enabling'}`);
      
      // Enable/disable camera - this should handle track publishing/unpublishing
      try {
        const success = await localParticipant.setCameraEnabled(newState);
        console.log(`setCameraEnabled result: ${success}`);
        
        // If disabling and there's an existing track, unpublish it
        if (!newState && videoPub && videoPub.track) {
          try {
            await localParticipant.unpublishTrack(videoPub.track);
            console.log("Camera track unpublished");
          } catch (unpubError) {
            console.warn("Error unpublishing track:", unpubError);
          }
        }
        
        // Update state after a brief delay to allow track to initialize/stop
        setTimeout(() => {
          const updatedVideoPub = localParticipant.getTrackPublication(Track.Source.Camera);
          const actuallyEnabled = (updatedVideoPub?.isSubscribed && localParticipant.isCameraEnabled) ?? localParticipant.isCameraEnabled;
          setIsVideoEnabled(actuallyEnabled);
          console.log(`✅ Camera state synced: ${actuallyEnabled ? 'enabled' : 'disabled'}`);
        }, 500);
        
        // Update state optimistically
        setIsVideoEnabled(newState);
        console.log(`✅ Camera ${newState ? 'enabled' : 'disabled'}`);
      } catch (setError) {
        console.error("Error in setCameraEnabled:", setError);
        // Still try to update state
        setIsVideoEnabled(newState);
      }
    } catch (error) {
      console.error("❌ Error toggling video:", error);
      // Still update state even if there's an error
      setIsVideoEnabled(!isVideoEnabled);
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
        background: "#1a1a1a",
        position: "relative",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Minimal Header - Zoom/Google Meet Style */}
      <header
        className="video-call-header"
        style={{
          background: "rgba(0,0,0,0.5)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          padding: "0.5rem 1rem",
          position: "relative",
          zIndex: 10,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <button
            onClick={handleForceExit}
            disabled={isDisconnecting}
            className="btn btn-ghost video-call-back-btn"
            style={{
              color: "#d1d5db",
              border: "none",
              background: "rgba(255,255,255,0.1)",
              cursor: isDisconnecting ? "not-allowed" : "pointer",
              opacity: isDisconnecting ? 0.6 : 1,
              padding: "0.5rem",
              minWidth: "44px",
              minHeight: "44px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "0.5rem",
            }}
          >
            <ArrowLeft style={{ width: "1.25rem", height: "1.25rem" }} />
          </button>
          <div>
            <p
              className="video-call-duration"
              style={{
                color: "white",
                fontSize: "0.875rem",
                margin: 0,
                fontWeight: 500,
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
              background: "rgba(239, 68, 68, 0.9)",
              borderRadius: "var(--radius-full)",
              flexShrink: 0,
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
          height: "calc(100vh - 140px)",
          position: "relative",
          minHeight: 0,
          overflow: "hidden",
          background: "#1a1a1a",
          width: "100%",
        }}
      >
        <LiveKitRoom
          serverUrl={wsUrl}
          token={token}
          onDisconnected={handleDisconnect}
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
          onConnected={async (room) => {
            setError("");
            console.log("Video call connected successfully");
            setIsConnected(true);

            // Store room reference - room might be undefined, so check first
            if (room) {
              setRoom(room);
              roomRef.current = room;
              isDisconnectingRef.current = false;

              // Explicitly enable camera and microphone after connection
              try {
                console.log("Requesting camera and microphone permissions...");
                const localParticipant = room.localParticipant;
                
                // Enable camera
                const cameraEnabled = await localParticipant.setCameraEnabled(true);
                console.log("Camera enabled:", cameraEnabled);
                
                // Enable microphone
                const micEnabled = await localParticipant.setMicrophoneEnabled(true);
                console.log("Microphone enabled:", micEnabled);
                
                if (!cameraEnabled || !micEnabled) {
                  console.warn("Some permissions were denied. Camera:", cameraEnabled, "Mic:", micEnabled);
                  setError("Please allow camera and microphone access to use video call");
                }
              } catch (permError) {
                console.error("Error requesting permissions:", permError);
                setError("Please allow camera and microphone access to use video call");
              }

              // Wait a bit for tracks to initialize before showing VideoConference
              setTimeout(() => {
                setIsRoomReady(true);
              }, 500);
            } else {
              // If room is not provided, we'll set up listeners in useEffect
              console.warn("Room not provided in onConnected callback");
              setIsRoomReady(true);
            }
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
            {isRoomReady ? (
              <>
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
                color: "white",
                fontSize: "1rem"
              }}>
                Initializing video...
              </div>
            )}
          </ErrorBoundary>
        </LiveKitRoom>
      </div>

      {/* Bottom Control Bar - Zoom/Google Meet Style */}
      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "rgba(0, 0, 0, 0.8)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          padding: "1rem",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000,
          borderTop: "1px solid rgba(255, 255, 255, 0.1)",
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
            onClick={handleToggleMute}
            className="control-btn"
            style={{
              width: "3rem",
              height: "3rem",
              borderRadius: "50%",
              border: "none",
              background: isMuted ? "#ef4444" : "rgba(255, 255, 255, 0.2)",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              if (!isMuted) e.currentTarget.style.background = "rgba(255, 255, 255, 0.3)";
            }}
            onMouseLeave={(e) => {
              if (!isMuted) e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
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
            onClick={handleToggleVideo}
            className="control-btn"
            style={{
              width: "3rem",
              height: "3rem",
              borderRadius: "50%",
              border: "none",
              background: isVideoEnabled ? "rgba(255, 255, 255, 0.2)" : "#ef4444",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              if (isVideoEnabled) e.currentTarget.style.background = "rgba(255, 255, 255, 0.3)";
            }}
            onMouseLeave={(e) => {
              if (isVideoEnabled) e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
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
            onClick={() => {
              setShowChat(!showChat);
              console.log("Chat toggled:", !showChat);
            }}
            className="control-btn"
            style={{
              width: "3rem",
              height: "3rem",
              borderRadius: "50%",
              border: "none",
              background: showChat ? "rgba(59, 130, 246, 0.8)" : "rgba(255, 255, 255, 0.2)",
              color: "white",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              if (!showChat) e.currentTarget.style.background = "rgba(255, 255, 255, 0.3)";
            }}
            onMouseLeave={(e) => {
              if (!showChat) e.currentTarget.style.background = "rgba(255, 255, 255, 0.2)";
            }}
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
