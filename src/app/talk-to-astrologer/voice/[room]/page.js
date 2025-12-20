"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  LiveKitRoom, 
  AudioConference,
  useLocalParticipant
} from "@livekit/components-react";
import { Track, Room, DataPacket_Kind, RemoteParticipant } from "livekit-client";
import "@livekit/components-styles";
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

// Wrapper to access LiveKit hooks
function VoiceCallChatWrapper({ room }) {
  const { localParticipant } = useLocalParticipant();
  return <VoiceCallChat room={room} localParticipant={localParticipant} />;
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
    if (!room) return;

    const handleDataReceived = (payload, participant, kind, topic) => {
      if (kind === DataPacket_Kind.RELIABLE && topic === undefined) {
        try {
          const data = JSON.parse(new TextDecoder().decode(payload));
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
          console.error("Error parsing chat message:", error);
        }
      }
    };

    room.on("dataReceived", handleDataReceived);

    return () => {
      room.off("dataReceived", handleDataReceived);
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
  const roomRef = useRef(null);
  const callIdRef = useRef(null);

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

  const handleDisconnect = async () => {
    try {
      // Disconnect from LiveKit room first
      if (room) {
        await room.disconnect();
      }

      const callId = callIdRef.current || 
                    localStorage.getItem("tgs:currentCallId") || 
                    localStorage.getItem("tgs:callId");
      const durationMinutes = Math.max(1, Math.ceil(callDuration / 60));

      console.log(`Ending voice call ${callId} with duration ${durationMinutes} minutes`);

      // Update call status to completed
      await updateCallStatus("completed", durationMinutes);

      // Finalize billing
      if (callId && durationMinutes > 0) {
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

      // Clear stored call IDs
      localStorage.removeItem("tgs:currentCallId");
      localStorage.removeItem("tgs:callId");
    } catch (error) {
      console.error("Error finalizing voice call:", error);
    } finally {
      // Navigate away
      const role = localStorage.getItem("tgs:role");
      const path = role === "astrologer" ? "/astrologer-dashboard" : "/talk-to-astrologer";
      router.push(path);
    }
  };

  const handleLeave = async () => {
    try {
      // CRITICAL: Disconnect from LiveKit room first
      if (room) {
        await room.disconnect();
        setRoom(null);
      }

      const callId = callIdRef.current || 
                    localStorage.getItem("tgs:currentCallId") || 
                    localStorage.getItem("tgs:callId");
      
      if (callId) {
        // Update call status to completed - this will notify the other party
        await updateCallStatus("completed");
      }

      // Clear stored call IDs
      localStorage.removeItem("tgs:currentCallId");
      localStorage.removeItem("tgs:callId");
    } catch (error) {
      console.error("Error handling leave:", error);
    } finally {
      // Navigate away
      const role = localStorage.getItem("tgs:role");
      const path = role === "astrologer" ? "/astrologer-dashboard" : "/talk-to-astrologer";
      router.push(path);
    }
  };

  const handleToggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleBack = () => {
    const role = localStorage.getItem("tgs:role");
    const path = role === "astrologer" ? "/astrologer-dashboard" : "/talk-to-astrologer";
    router.push(path);
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
        style={{
          background: "rgba(255, 255, 255, 0.8)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          borderBottom: "1px solid rgba(212, 175, 55, 0.2)",
          padding: "1rem 1.5rem",
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
            gap: "1rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <button
              onClick={handleBack}
              className="btn btn-ghost"
              style={{
                color: "#374151",
                border: "1px solid rgba(212, 175, 55, 0.3)",
                padding: "0.5rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                background: "white",
              }}
            >
              <ArrowLeft style={{ width: "1rem", height: "1rem" }} />
              <span>Back</span>
            </button>
            <div>
              <p style={{ color: "#374151", fontSize: "0.875rem", margin: 0, fontWeight: 600 }}>
                Duration: {formatDuration(callDuration)}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
            <button
              onClick={handleToggleMute}
              className="btn btn-ghost"
              style={{
                color: isMuted ? "#dc2626" : "#374151",
                border: `1px solid ${isMuted ? "rgba(220, 38, 38, 0.3)" : "rgba(212, 175, 55, 0.3)"}`,
                background: isMuted ? "rgba(239, 68, 68, 0.1)" : "white",
                padding: "0.5rem 1rem",
              }}
            >
              {isMuted ? (
                <MicOff style={{ width: "1.25rem", height: "1.25rem" }} />
              ) : (
                <Mic style={{ width: "1.25rem", height: "1.25rem" }} />
              )}
            </button>
            <button
              onClick={handleDisconnect}
              className="btn"
              style={{
                background: "linear-gradient(135deg, #dc2626, #991b1b)",
                color: "white",
                border: "none",
                boxShadow: "0 4px 12px rgba(220, 38, 38, 0.3)",
                padding: "0.5rem 1rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <PhoneOff style={{ width: "1rem", height: "1rem" }} />
              <span>End Call</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div
        style={{
          flex: 1,
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          padding: "2rem 1.5rem",
          position: "relative",
          zIndex: 1,
        }}
      >
        <div
          className="card"
          style={{
            width: "100%",
            maxWidth: "40rem",
            background: "white",
            borderRadius: "1rem",
            boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
            display: "flex",
            flexDirection: "column",
            minHeight: "32rem",
            padding: "2rem",
            border: "1px solid rgba(212, 175, 55, 0.2)",
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
              onConnected={(room) => {
                setIsConnected(true);
                setError("");
                setRoom(room);
                roomRef.current = room;
              }}
              connectOptions={{
                autoSubscribe: true,
              }}
              audio={true}
              video={false}
              style={{ width: "100%", height: "100%" }}
            >
              <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
                {/* Audio Conference */}
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: "1.5rem" }}>
                  <AudioConference />
                </div>

                {/* Controls - must be inside LiveKitRoom context */}
                <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "1.5rem", marginTop: "1.5rem" }}>
                  <div style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem" }}>
                    <VoiceCallControls
                      onDisconnect={handleDisconnect}
                      onToggleMute={handleToggleMute}
                      isMuted={isMuted}
                    />
                    <button
                      onClick={() => {}}
                      className="btn"
                      style={{
                        flex: 1,
                        background: "white",
                        color: "#6b7280",
                        border: "2px solid #e5e7eb",
                        padding: "0.875rem 1.25rem",
                        fontSize: "0.95rem",
                        fontWeight: 600,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "0.5rem",
                        cursor: "default",
                      }}
                    >
                      <MessageSquare style={{ width: "1.125rem", height: "1.125rem" }} />
                      <span>Chat</span>
                    </button>
                  </div>
                </div>

                {/* Chat Component */}
                <VoiceCallChatWrapper room={roomRef.current} />
              </div>
            </LiveKitRoom>
          </div>

          {/* Status Bar */}
          <div style={{ borderTop: "1px solid #e5e7eb", paddingTop: "1.5rem" }}>
            <div
              style={{
                background: "linear-gradient(135deg, #fef3c7, #fde68a)",
                borderRadius: "0.5rem",
                padding: "0.75rem 1rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                border: "1px solid rgba(212, 175, 55, 0.2)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <Volume2 style={{ width: "1rem", height: "1rem", color: "#d4af37" }} />
                <span style={{ fontSize: "0.875rem", color: "#92400e", fontWeight: 500 }}>
                  Voice Call Active
                </span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <div
                  style={{
                    width: "0.5rem",
                    height: "0.5rem",
                    borderRadius: "50%",
                    background: isMuted ? "#ef4444" : "#22c55e",
                  }}
                ></div>
                <span style={{ fontSize: "0.875rem", color: "#92400e", fontWeight: 500 }}>
                  {isMuted ? "Muted" : "Unmuted"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile responsive adjustments */}
      <style jsx>{`
        @media (max-width: 768px) {
          header > div {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          header > div > div:last-child {
            width: 100% !important;
            justify-content: space-between !important;
            margin-top: 0.5rem !important;
          }
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  );
}
