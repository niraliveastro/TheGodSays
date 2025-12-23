"use client";

/**
 * Astrologer Dashboard Module
 *
 * This module provides the main dashboard interface for astrologers in a consultation platform.
 * It handles real-time call management, status updates, notifications, and call history.
 * The dashboard supports both video and voice calls, with fallback polling for connection issues.
 *
 * Key Features:
 * - Real-time Firebase listeners for astrologer status and incoming calls.
 * - Notification permissions and browser notifications for incoming calls.
 * - Queue management for waiting clients.
 * - Call actions: accept, reject, join, end calls.
 * - Enhanced UI with hover effects, gradients, and responsive design.
 * - Fallback polling and reconnection logic for robust connectivity.
 * - User name resolution from multiple Firestore collections.
 *
 * Dependencies:
 * - React (useState, useEffect)
 * - Next.js (useRouter)
 * - Firebase Firestore (doc, updateDoc, onSnapshot, collection, query, where)
 * - Lucide React icons
 * - Custom components: CallNotification, VoiceCallNotification, AuthGuard
 * - AuthContext: Provides getUserId and userProfile
 *
 * Styling: Inline styles for layout, colors, and animations. Assumes global CSS variables (e.g., --color-gray-900) and classes (e.g., btn, card).
 *
 * @module AstrologerDashboard
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslation } from "@/hooks/useTranslation";
import {
  Phone,
  PhoneOff,
  Video,
  Settings,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";
import {
  doc,
  getDoc,
  updateDoc,
  onSnapshot,
  collection,
  query,
  where,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import CallNotification from "@/components/CallNotification";
import VoiceCallNotification from "@/components/VoiceCallNotification";
import AuthGuard from "@/components/AuthGuard";
import { useAuth } from "@/contexts/AuthContext";

/**
 * AstrologerDashboardContent Component
 *
 * The core content component for the astrologer dashboard.
 * Manages state for status, calls, queue, and handles real-time updates.
 * Renders the UI for status control, call queue, and recent calls history.
 *
 * @returns {JSX.Element} The dashboard content UI.
 */
function AstrologerDashboardContent() {
  // State management for dashboard data and UI
  const [status, setStatus] = useState("offline"); // Current astrologer availability status: 'online', 'busy', 'offline'
  const [calls, setCalls] = useState([]); // Array of recent calls (all statuses)
  const [queue, setQueue] = useState([]); // Array of queued calls (waiting clients)
  const [loading, setLoading] = useState(true); // Initial loading state for data fetch
  const [incomingCall, setIncomingCall] = useState(null); // Current pending incoming call
  const [userNames, setUserNames] = useState({}); // Cache of user names by userId for display
  const [connectionStatus, setConnectionStatus] = useState("connecting"); // Realtime connection health: 'connecting', 'connected', 'disconnected'
  const [notificationPermission, setNotificationPermission] =
    useState("default"); // Browser notification permission status

  // Auth and routing hooks
  const { getUserId, userProfile } = useAuth(); // Auth context for user ID and profile
  const astrologerId = getUserId(); // Current astrologer's unique ID
  const router = useRouter(); // Next.js router for navigation

  /**
   * Effect: Request browser notification permission on mount.
   * Ensures notifications for incoming calls if granted.
   */
  useEffect(() => {
    if ("Notification" in window) {
      if (Notification.permission === "default") {
        Notification.requestPermission().then((permission) => {
          setNotificationPermission(permission);
        });
      } else {
        setNotificationPermission(Notification.permission);
      }
    }
  }, []); // Empty dependency array: runs once on mount

  /**
   * Effect: Set up real-time listeners and polling fallback.
   * Listens for astrologer status and calls changes via Firestore.
   * Includes connection monitoring, health checks, and visibility-based polling.
   * Cleans up listeners and intervals on unmount.
   */
  useEffect(() => {
    if (!astrologerId) return; // Guard: no ID, no listeners

    let unsubAstrologer, unsubCalls, pollInterval; // Cleanup references
    let isConnected = true; // Local flag for connection health

    // Enhanced real-time listener with connection monitoring
    const setupRealtimeListeners = () => {
      try {
        setConnectionStatus("connecting");
        // Listen for astrologer status updates
        unsubAstrologer = onSnapshot(
          doc(db, "astrologers", astrologerId),
          (doc) => {
            const data = doc.data();
            if (data) setStatus(data.status || "offline");
            isConnected = true;
            setConnectionStatus("connected");
          },
          (error) => {
            console.warn("Astrologer listener error:", error);
            isConnected = false;
            setConnectionStatus("disconnected");
          }
        );

        // Query and listen for calls assigned to this astrologer
        const q = query(
          collection(db, "calls"),
          where("astrologerId", "==", astrologerId)
        );
        unsubCalls = onSnapshot(
          q,
          async (snapshot) => {
            const callsList = [];
            const queueList = [];
            let newIncomingCall = null;

            for (const doc of snapshot.docs) {
              let call = { id: doc.id, ...doc.data() };

              // CRITICAL: Skip cancelled and rejected calls entirely
              if (call.status === "cancelled" || call.status === "rejected") {
                // If this was the current incoming call, clear it immediately
                if (incomingCall && incomingCall.id === doc.id) {
                  setIncomingCall(null);
                  
                  // Show notification that call was cancelled/rejected
                  if (notificationPermission === "granted") {
                    try {
                      new Notification(
                        call.status === "cancelled" ? "Call Cancelled" : "Call Declined",
                        {
                          body: `${userNames[call.userId] || "User"} ${call.status === "cancelled" ? "cancelled" : "declined"} the call`,
                          icon: "/favicon.ico",
                          tag: `call-${call.status}`,
                        }
                      );
                    } catch (e) {
                      console.log("Browser notification failed:", e);
                    }
                  }
                }
                continue; // Skip this call entirely
              }

              // For completed calls, fetch billing info if missing
              if (
                call.status === "completed" &&
                (!call.durationMinutes || !call.finalAmount)
              ) {
                try {
                  const billingDoc = await db
                    .collection("call_billing")
                    .doc(doc.id)
                    .get();
                  if (billingDoc.exists) {
                    const billingData = billingDoc.data();
                    call.durationMinutes =
                      call.durationMinutes || billingData.durationMinutes;
                    call.finalAmount =
                      call.finalAmount || billingData.finalAmount;
                  }
                } catch (error) {
                  console.warn(
                    "Error fetching billing data for call:",
                    doc.id,
                    error
                  );
                }
              }

              if (call.status === "pending") newIncomingCall = call;
              if (call.status === "queued") queueList.push(call);
              callsList.push(call);
            }

            // Check for recently cancelled calls and show notification
            const recentlyCancelled = callsList.find(
              call => call.status === "cancelled" && 
              call.cancelledAt && 
              new Date() - new Date(call.cancelledAt) < 5000 // Within last 5 seconds
            );
            
            if (recentlyCancelled && !incomingCall) {
              // Show notification that user declined the call
              if (notificationPermission === "granted") {
                try {
                  new Notification("Call Declined", {
                    body: `${userNames[recentlyCancelled.userId] || "User"} declined the call`,
                    icon: "/favicon.ico",
                    tag: "call-declined",
                  });
                } catch (e) {
                  console.log("Browser notification failed:", e);
                }
              }
            }

            // Sort calls by timestamp (most recent first)
            // Helper function to get timestamp value for sorting
            const getCallTimestamp = (call) => {
              // Try different timestamp fields in order of preference
              const timestamps = [
                call.completedAt,
                call.acceptedAt,
                call.createdAt,
                call.updatedAt,
              ];

              for (const ts of timestamps) {
                if (!ts) continue;
                
                // Handle Firestore Timestamp
                if (ts.seconds) {
                  return ts.seconds * 1000 + (ts.nanoseconds || 0) / 1000000;
                }
                
                // Handle ISO string or Date
                const date = new Date(ts);
                if (!isNaN(date.getTime())) {
                  return date.getTime();
                }
              }
              
              // Fallback to 0 if no valid timestamp found
              return 0;
            };

            // Sort calls by timestamp in descending order (newest first)
            callsList.sort((a, b) => {
              const timestampA = getCallTimestamp(a);
              const timestampB = getCallTimestamp(b);
              return timestampB - timestampA; // Descending order
            });

            setCalls(callsList);
            setQueue(queueList);
            if (newIncomingCall) setIncomingCall(newIncomingCall);
            setLoading(false);
            isConnected = true;
            setConnectionStatus("connected");
          },
          (error) => {
            console.warn("Calls listener error:", error);
            isConnected = false;
            setConnectionStatus("disconnected");
          }
        );
      } catch (error) {
        console.error("Error setting up listeners:", error);
        isConnected = false;
        setConnectionStatus("disconnected");
      }
    };

    // Polling fallback for when real-time connection fails
    const pollForUpdates = async () => {
      try {
        const response = await fetch(`/api/calls?astrologerId=${astrologerId}`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.calls) {
            const callsList = data.calls;
            const queueList = callsList.filter(
              (call) => call.status === "queued"
            );
            const newIncomingCall = callsList.find(
              (call) => call.status === "pending"
            );

            // Sort calls by timestamp (most recent first)
            // Helper function to get timestamp value for sorting
            const getCallTimestamp = (call) => {
              // Try different timestamp fields in order of preference
              const timestamps = [
                call.completedAt,
                call.acceptedAt,
                call.createdAt,
                call.updatedAt,
              ];

              for (const ts of timestamps) {
                if (!ts) continue;
                
                // Handle Firestore Timestamp
                if (ts.seconds) {
                  return ts.seconds * 1000 + (ts.nanoseconds || 0) / 1000000;
                }
                
                // Handle ISO string or Date
                const date = new Date(ts);
                if (!isNaN(date.getTime())) {
                  return date.getTime();
                }
              }
              
              // Fallback to 0 if no valid timestamp found
              return 0;
            };

            // Sort calls by timestamp in descending order (newest first)
            callsList.sort((a, b) => {
              const timestampA = getCallTimestamp(a);
              const timestampB = getCallTimestamp(b);
              return timestampB - timestampA; // Descending order
            });

            setCalls(callsList);
            setQueue(queueList);
            if (
              newIncomingCall &&
              (!incomingCall || incomingCall.id !== newIncomingCall.id)
            ) {
              setIncomingCall(newIncomingCall);

              // Enhanced notifications for voice calls
              if (newIncomingCall.callType === "voice") {
                // Play notification sound
                try {
                  const audio = new Audio("/notification.mp3");
                  audio
                    .play()
                    .catch((e) => console.log("Audio play failed:", e));
                } catch (e) {
                  console.log("Audio notification failed:", e);
                }

                // Show browser notification
                if (notificationPermission === "granted") {
                  try {
                    new Notification("Incoming Voice Call", {
                      body: `Voice call from ${
                        userNames[newIncomingCall.userId] || "User"
                      }`,
                      icon: "/favicon.ico",
                      tag: "voice-call",
                      requireInteraction: true,
                    });
                  } catch (e) {
                    console.log("Browser notification failed:", e);
                  }
                }
              }
            }
            setLoading(false);
          }
        }
      } catch (error) {
        console.warn("Polling error:", error);
      }
    };

    // Start with real-time listeners
    setupRealtimeListeners();

    // Set up polling as backup (optimized for production)
    pollInterval = setInterval(() => {
      if (!isConnected) {
        console.log("Real-time connection lost, using polling fallback");
        pollForUpdates();
      }
      // Only poll occasionally when connected to reduce server load
    }, 5000);

    // Connection health check every 10 seconds
    const healthCheck = setInterval(() => {
      if (!isConnected) {
        console.log("Attempting to reconnect real-time listeners");
        if (unsubAstrologer) unsubAstrologer();
        if (unsubCalls) unsubCalls();
        setupRealtimeListeners();
      }
    }, 10000);

    // Handle browser visibility changes for better background polling
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // When tab is hidden, poll more frequently but reasonably
        if (pollInterval) clearInterval(pollInterval);
        pollInterval = setInterval(() => {
          if (!isConnected) {
            pollForUpdates();
          }
        }, 3000); // Poll every 3 seconds when hidden
      } else {
        // When tab is visible, restore normal polling
        if (pollInterval) clearInterval(pollInterval);
        pollInterval = setInterval(() => {
          if (!isConnected) {
            console.log("Real-time connection lost, using polling fallback");
            pollForUpdates();
          }
        }, 5000);
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    // Cleanup: Unsubscribe listeners and clear intervals
    return () => {
      if (unsubAstrologer) unsubAstrologer();
      if (unsubCalls) unsubCalls();
      if (pollInterval) clearInterval(pollInterval);
      if (healthCheck) clearInterval(healthCheck);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [astrologerId]); // Dependencies: re-run if astrologerId changes

  /**
   * Effect: Fetch and cache user names for calls.
   * Resolves names from Firestore and updates display cache.
   * Runs when calls array changes.
   */
  useEffect(() => {
    if (calls.length === 0) return;

    const fetchUserNames = async () => {
      console.log("🔄 Fetching user names for calls:", calls.length);
      const newUserNames = { ...userNames };
      let hasNewNames = false;

      for (const call of calls) {
        if (call.userId && !newUserNames[call.userId]) {
          console.log(`  Fetching name for call ${call.id}, userId: ${call.userId}`);
          try {
            const name = await getUserName(call.userId);
            newUserNames[call.userId] = name;
            hasNewNames = true;
            console.log(`  ✅ Cached name for ${call.userId}: ${name}`);
          } catch (error) {
            console.warn("❌ Error fetching user name for:", call.userId, error);
            newUserNames[call.userId] = `User ${call.userId.substring(0, 8)}`;
            hasNewNames = true;
          }
        } else if (call.userId && newUserNames[call.userId]) {
          console.log(`  ⏭️ Name already cached for ${call.userId}: ${newUserNames[call.userId]}`);
        }
      }

      if (hasNewNames) {
        console.log("✅ Updating userNames state:", newUserNames);
        setUserNames(newUserNames);
      } else {
        console.log("⏭️ No new names to update");
      }
    };

    if (calls.length > 0) {
      fetchUserNames();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calls]); // Re-run when calls change - userNames intentionally excluded to avoid loops

  /**
   * Update astrologer status in Firestore.
   * @param {string} newStatus - New status: 'online', 'busy', 'offline'
   */
  const updateStatus = async (newStatus) => {
    if (!astrologerId) return;
    try {
      await updateDoc(doc(db, "astrologers", astrologerId), {
        status: newStatus,
      });
      setStatus(newStatus);
    } catch (error) {
      console.error("Error updating status:", error);
    }
  };

  /**
   * Handle call actions: accept, reject, complete, etc.
   * Updates call status in Firestore and navigates to call room if accepted.
   * Manages astrologer status transitions (e.g., to 'busy' on accept).
   * @param {string} callId - ID of the call to act on
   * @param {string} action - Action: 'active', 'completed', 'rejected'
   */
  const handleCallAction = async (callId, action) => {
    try {
      const callRef = doc(db, "calls", callId);
      
      // CRITICAL: Check current call status before accepting
      if (action === "active") {
        const callSnapshot = await getDoc(callRef);
        if (!callSnapshot.exists) {
          alert("Call not found. It may have been cancelled.");
          setIncomingCall(null);
          return;
        }
        
        const currentCallData = callSnapshot.data();
        
        // Prevent accepting cancelled or rejected calls
        if (currentCallData.status === "cancelled") {
          alert("This call was cancelled by the user and cannot be accepted.");
          setIncomingCall(null);
          return;
        }
        
        if (currentCallData.status === "rejected") {
          alert("This call was already rejected and cannot be accepted.");
          setIncomingCall(null);
          return;
        }
        
        if (currentCallData.status === "completed") {
          alert("This call was already completed.");
          setIncomingCall(null);
          return;
        }
        
        // Only accept if status is "pending"
        if (currentCallData.status !== "pending") {
          alert("This call is no longer available.");
          setIncomingCall(null);
          return;
        }
      }
      
      const updateData = { status: action };
      if (action === "active") {
        updateData.roomName = `astro-${astrologerId}-${Date.now()}`;
        updateData.acceptedAt = new Date().toISOString();
      }
      await updateDoc(callRef, updateData);

      if (action === "active") {
        await updateStatus("busy");
        setIncomingCall(null);

        // Get fresh call data after update to ensure we have the latest roomName
        const updatedCallSnapshot = await getDoc(callRef);
        const updatedCallData = updatedCallSnapshot.exists ? updatedCallSnapshot.data() : null;
        
        const call = updatedCallData 
          ? { id: callId, ...updatedCallData }
          : calls.find((c) => c.id === callId) || incomingCall;
        if (!call) {
          console.error("[Call Accept] Call not found:", callId);
          alert("Call not found. Please refresh and try again.");
          await updateStatus("online");
          return;
        }

        // Get the actual user ID from the call
        const actualUserId = call.userId;
        if (!actualUserId) {
          console.error("[Call Accept] User ID missing from call:", call);
          alert("Call data is incomplete. Please refresh and try again.");
          await updateStatus("online");
          return;
        }

        // Use roomName from updated call data or fallback to updateData
        const roomName = call.roomName || updateData.roomName;
        if (!roomName) {
          console.error("[Call Accept] Room name missing after update");
          alert("Failed to create call room. Please try again.");
          await updateStatus("online");
          return;
        }

        const route =
          call.callType === "voice"
            ? `/talk-to-astrologer/voice/${roomName}`
            : `/talk-to-astrologer/room/${roomName}`;

        localStorage.setItem("tgs:role", "astrologer");
        localStorage.setItem("tgs:astrologerId", astrologerId);
        localStorage.setItem("tgs:userId", astrologerId);
        localStorage.setItem("tgs:callId", callId);

        console.log("[Call Accept] Creating LiveKit session:", {
          astrologerId,
          userId: actualUserId,
          roomName: roomName,
          callType: call.callType,
          callId: callId,
        });

        const sessionResponse = await fetch("/api/livekit/create-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            astrologerId,
            userId: actualUserId, // FIXED: Use actual user ID from call
            callId: callId,
            roomName: roomName,
            callType: call.callType || "video",
            role: "astrologer",
            displayName: userProfile?.name || "Astrologer",
          }),
        });

        if (sessionResponse.ok) {
          const sessionData = await sessionResponse.json();
          console.log("[Call Accept] Session created successfully:", sessionData);
          router.push(route);
        } else {
          const error = await sessionResponse.json().catch(() => ({ error: "Unknown error" }));
          console.error("[Call Accept] Session creation failed:", error);
          alert(`Failed to join call: ${error.error || "Try again."}`);
          await updateStatus("online");
        }
      } else if (action === "completed" || action === "rejected") {
        await updateStatus("online");
      }
    } catch (error) {
      console.error("Call action error:", error);
    }
  };

  /**
   * Get color for astrologer status indicator.
   * @returns {string} Hex color code based on status
   */
  const getStatusColor = () => {
    switch (status) {
      case "online":
        return "#10b981"; // Green
      case "busy":
        return "#f59e0b"; // Amber
      case "offline":
        return "#6b7280"; // Gray
      default:
        return "#6b7280";
    }
  };

  /**
   * Get color for call status badge.
   * @param {string} callStatus - Call status: 'pending', 'active', etc.
   * @returns {string} Hex color code based on status
   */
  const getCallStatusColor = (callStatus) => {
    switch (callStatus) {
      case "pending":
        return "#f59e0b"; // Amber
      case "active":
        return "#10b981"; // Green
      case "completed":
        return "#3b82f6"; // Blue
      case "rejected":
        return "#ef4444"; // Red
      case "cancelled":
        return "#f97316"; // Orange
      default:
        return "#6b7280"; // Gray
    }
  };

  // Helper to safely parse Firebase Timestamp to Date
  const safeParseDate = (timestamp) => {
    if (!timestamp) return null;

    // Handle Firestore Timestamp
    if (timestamp.seconds) {
      const ms =
        timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000;
      const date = new Date(ms);
      return isNaN(date.getTime()) ? null : date;
    }

    // Handle ISO string or Date object
    const date = new Date(timestamp);
    return isNaN(date.getTime()) ? null : date;
  };

  // Helper to format date safely
  const formatDate = (timestamp, fallback = "N/A") => {
    const date = safeParseDate(timestamp);
    return date ? date.toLocaleString() : fallback;
  };

  // Helper to format time only
  const formatTime = (timestamp, fallback = "Unknown time") => {
    const date = safeParseDate(timestamp);
    return date ? date.toLocaleTimeString() : fallback;
  };

  /**
   * Fetch user name from Firestore by userId.
   * Tries multiple collection names as fallback.
   * @param {string} userId - User ID to resolve name for
   * @returns {Promise<string>} Resolved user name or fallback
   */
  const getUserName = async (userId) => {
    if (!userId) {
      console.warn("getUserName called with empty userId");
      return "Anonymous User";
    }

    console.log(`🔍 Fetching name for userId: ${userId}`);

    try {
      // Try multiple collection names using Firestore client SDK
      const collectionNames = ["users", "user", "user_profiles", "profiles"];

      for (const collectionName of collectionNames) {
        try {
          console.log(`  Checking collection: ${collectionName}`);
          const userDoc = await getDoc(doc(db, collectionName, userId));
          if (userDoc.exists()) {
            const userData = userDoc.data();
            console.log(`  ✅ Found user in ${collectionName}:`, userData);
            
            // Try multiple name fields
            const userName =
              userData.name ||
              userData.displayName ||
              userData.fullName ||
              userData.firstName ||
              userData.username ||
              (userData.email ? userData.email.split("@")[0] : null);
            
            if (userName) {
              // If email, extract username part
              const finalName = userName.includes("@") ? userName.split("@")[0] : userName;
              console.log(`  ✅ Resolved name: ${finalName}`);
              return finalName;
            } else {
              console.warn(`  ⚠️ User found in ${collectionName} but no name field exists. Data:`, Object.keys(userData));
            }
          } else {
            console.log(`  ❌ User not found in ${collectionName}`);
          }
        } catch (collectionError) {
          // Continue to next collection
          console.warn(`  ⚠️ Error checking ${collectionName}:`, collectionError.message);
        }
      }

      // Fallback to partial userId
      console.warn(`  ❌ Could not find name for userId ${userId}, using fallback`);
      return `User ${userId.substring(0, 8)}`;
    } catch (error) {
      console.error("❌ Error fetching user name:", error);
      return `User ${userId.substring(0, 8)}`;
    }
  };

  // Render loading spinner
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  // Main render: Dashboard UI
  return (
    <>
      {/* Incoming Call Notification - Enhanced with better props for styling */}
      {incomingCall &&
        (incomingCall.callType === "voice" ? (
          <VoiceCallNotification
            call={incomingCall}
            userName={userNames[incomingCall.userId]}
            onAccept={() => handleCallAction(incomingCall.id, "active")}
            onReject={() => handleCallAction(incomingCall.id, "rejected")}
            onClose={() => setIncomingCall(null)}
            // Suggested props for improved style (pass to your component)
            theme="golden" // Custom theme for astrologer app
            showAvatar={true} // Show user avatar if available
            animation="slide-down" // Entrance animation
            buttonSize="lg" // Larger buttons for better UX
            background="linear-gradient(135deg, #fdfbf7 0%, #f8f5f0 100%)" // Match dashboard
          />
        ) : (
          <CallNotification
            call={incomingCall}
            userName={userNames[incomingCall.userId]}
            onAccept={() => handleCallAction(incomingCall.id, "active")}
            onReject={() => handleCallAction(incomingCall.id, "rejected")}
            onClose={() => setIncomingCall(null)}
            // Suggested props for improved style
            theme="golden"
            showAvatar={true}
            animation="slide-down"
            buttonSize="lg"
            background="linear-gradient(135deg, #fdfbf7 0%, #f8f5f0 100%)"
          />
        ))}

      {/* Main Dashboard Container */}
      <div
        className="min-h-screen"
        style={{
          background: "linear-gradient(135deg, #fdfbf7 0%, #f8f5f0 100%)",
          padding: "2rem 0",
        }}
      >
        <div className="container">
          {/* Header */}
          <header
            style={{
              marginBottom: "2rem",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div
                style={{ display: "flex", alignItems: "center", gap: "1rem" }}
              >
                <h1
                  style={{
                    fontSize: "2.25rem",
                    fontWeight: 500,
                    color: "var(--color-gray-900)",
                    margin: 0,
                  }}
                >
                  Welcome, {userProfile?.name || "Astrologer"}
                </h1>
                {(incomingCall || queue.length > 0) && (
                  <div
                    style={{
                      padding: "0.5rem 1rem",
                      background: "linear-gradient(135deg, #ef4444, #dc2626)",
                      color: "white",
                      borderRadius: "20px",
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      animation: "pulse 2s infinite",
                      boxShadow: "0 2px 4px rgba(239, 68, 68, 0.3)",
                    }}
                  >
                    {incomingCall
                      ? "Incoming Call!"
                      : `${queue.length} Waiting`}
                  </div>
                )}
              </div>
              <p
                style={{
                  color: "var(--color-gray-600)",
                  fontSize: "1rem",
                  margin: "0.5rem 0 0",
                }}
              >
                Manage your availability and handle client calls
              </p>
            </div>
            <button
              onClick={() => router.push("/astrologer-dashboard/pricing")}
              className="btn btn-secondary"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.75rem 1.5rem",
              }}
            >
              <Settings style={{ width: "1rem", height: "1rem" }} />
              Pricing Settings
            </button>
          </header>

          {/* Status Card - Enhanced with subtle shadow and hover */}
          <div
            className="card"
            style={{
              marginBottom: "2rem",
              boxShadow:
                "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
              borderRadius: "12px",
              padding: "1.5rem",
              background: "white",
              transition: "box-shadow 0.2s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.boxShadow =
                "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.boxShadow =
                "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)";
            }}
          >
            <h2
              style={{
                fontSize: "1.5rem",
                fontWeight: 600,
                marginBottom: "1rem",
              }}
            >
              Your Status
            </h2>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "1rem" }}
              >
                <div
                  style={{
                    width: "1rem",
                    height: "1rem",
                    borderRadius: "50%",
                    backgroundColor: getStatusColor(status),
                    boxShadow:
                      "0 0 0 2px white, 0 0 0 4px rgba(16, 185, 129, 0.2)", // Glow effect
                  }}
                ></div>
                <span
                  style={{
                    textTransform: "capitalize",
                    fontWeight: 500,
                    fontSize: "1.125rem",
                  }}
                >
                  {status}
                </span>
              </div>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                {["online", "busy", "offline"].map((s) => (
                  <button
                    key={s}
                    onClick={() => updateStatus(s)}
                    className={`btn ${
                      status === s ? "btn-primary" : "btn-ghost"
                    }`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                      padding: "0.5rem 1rem",
                      fontSize: "0.875rem",
                      borderRadius: "8px",
                      transition: "all 0.2s ease",
                      background: status === s ? "#10b981" : "white",
                      color: status === s ? "white" : "#6b7280",
                      border:
                        status === s
                          ? "1px solid #10b981"
                          : "1px solid #d1d5db",
                    }}
                    onMouseEnter={(e) => {
                      if (status !== s) {
                        e.currentTarget.style.background = "#f3f4f6";
                        e.currentTarget.style.transform = "translateY(-1px)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (status !== s) {
                        e.currentTarget.style.background = "white";
                        e.currentTarget.style.transform = "translateY(0)";
                      }
                    }}
                  >
                    <div
                      style={{
                        width: "0.75rem",
                        height: "0.75rem",
                        borderRadius: "50%",
                        backgroundColor:
                          s === "online"
                            ? "#10b981"
                            : s === "busy"
                            ? "#f59e0b"
                            : "#6b7280",
                      }}
                    ></div>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Queue - Enhanced with better visuals */}
          {queue.length > 0 && (
            <div
              className="card"
              style={{
                marginBottom: "2rem",
                boxShadow:
                  "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                borderRadius: "12px",
                padding: "1.5rem",
                background: "white",
              }}
            >
              <h2
                style={{
                  fontSize: "1.5rem",
                  fontWeight: 600,
                  marginBottom: "1rem",
                }}
              >
                Waiting Queue ({queue.length})
              </h2>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.75rem",
                }}
              >
                {queue.map((call, i) => (
                  <div
                    key={call.id}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "1rem",
                      background:
                        "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)",
                      border: "1px solid #93c5fd",
                      borderRadius: "12px",
                      boxShadow: "0 2px 4px rgba(59, 130, 246, 0.1)",
                      transition: "transform 0.2s ease, box-shadow 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform = "translateY(-2px)";
                      e.currentTarget.style.boxShadow =
                        "0 4px 8px rgba(59, 130, 246, 0.15)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow =
                        "0 2px 4px rgba(59, 130, 246, 0.1)";
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.75rem",
                      }}
                    >
                      <div
                        style={{
                          width: "2.5rem",
                          height: "2.5rem",
                          background:
                            "linear-gradient(135deg, #3b82f6, #1d4ed8)",
                          color: "white",
                          borderRadius: "50%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 700,
                          fontSize: "1rem",
                          boxShadow: "0 2px 4px rgba(59, 130, 246, 0.2)",
                        }}
                      >
                        {i + 1}
                      </div>
                      <div>
                        <p
                          style={{
                            fontWeight: 600,
                            color: "#1e293b",
                            margin: 0,
                          }}
                        >
                          {call.callType === "voice"
                            ? "Voice Call"
                            : "Video Call"}{" "}
                          from{" "}
                          {userNames[call.userId] ||
                            `User ${call.userId?.substring(0, 8) || "Unknown"}`}
                        </p>
                        <p
                          style={{
                            fontSize: "0.875rem",
                            color: "#64748b",
                            margin: "0.25rem 0 0",
                          }}
                        >
                          Waiting since {formatTime(call.createdAt)}
                        </p>
                      </div>
                    </div>
                    <span
                      style={{
                        padding: "0.375rem 0.875rem",
                        background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
                        color: "white",
                        borderRadius: "9999px",
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        boxShadow: "0 1px 2px rgba(59, 130, 246, 0.25)",
                      }}
                    >
                      Queued
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Calls - Enhanced with better card styles */}
          <div
            className="card"
            style={{
              boxShadow:
                "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
              borderRadius: "12px",
              padding: "1.5rem",
              background: "white",
            }}
          >
            <h2
              style={{
                fontSize: "1.5rem",
                fontWeight: 600,
                marginBottom: "1rem",
              }}
            >
              Recent Calls
            </h2>

            {calls.length === 0 ? (
              <div style={{ textAlign: "center", padding: "3rem 0" }}>
                <Phone
                  style={{
                    width: "3rem",
                    height: "3rem",
                    color: "var(--color-gray-400)",
                    margin: "0 auto 1rem",
                  }}
                />
                <p
                  style={{
                    color: "var(--color-gray-500)",
                    marginBottom: "0.5rem",
                  }}
                >
                  No calls yet
                </p>
                <p
                  style={{
                    fontSize: "0.875rem",
                    color: "var(--color-gray-400)",
                  }}
                >
                  Calls will appear here when clients request consultations
                </p>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                }}
              >
                {calls.map((call) => (
                  <div
                    key={call.id}
                    style={{
                      border: "1px solid #e5e7eb",
                      borderRadius: "12px",
                      padding: "1.25rem",
                      background: "white",
                      transition: "all 0.2s ease",
                      boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow =
                        "0 4px 12px rgba(0, 0, 0, 0.1)";
                      e.currentTarget.style.borderColor =
                        getCallStatusColor(call.status) + "20";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow =
                        "0 1px 3px rgba(0, 0, 0, 0.05)";
                      e.currentTarget.style.borderColor = "#e5e7eb";
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "1rem",
                        }}
                      >
                        <div
                          style={{
                            width: "0.875rem",
                            height: "0.875rem",
                            borderRadius: "50%",
                            backgroundColor: getCallStatusColor(call.status),
                            boxShadow: `0 0 0 2px white, 0 0 0 4px ${getCallStatusColor(
                              call.status
                            )}20`,
                          }}
                        ></div>
                        <div>
                          <p
                            style={{
                              fontWeight: 600,
                              color: "#1e293b",
                              margin: 0,
                            }}
                          >
                            {call.callType === "voice"
                              ? "Voice Call"
                              : "Video Call"}{" "}
                            from{" "}
                            {userNames[call.userId] ||
                              `User ${
                                call.userId?.substring(0, 8) || "Unknown"
                              }`}
                          </p>
                          <p
                            style={{
                              fontSize: "0.875rem",
                              color: "#64748b",
                              margin: "0.25rem 0 0",
                              fontFamily: "Courier New, monospace",
                            }}
                          >
                            {formatDate(call.createdAt)}
                          </p>
                          {call.status === "completed" &&
                            (call.durationMinutes || call.finalAmount) && (
                              <p
                                style={{
                                  fontSize: "0.75rem",
                                  color: "#059669",
                                  margin: "0.25rem 0 0",
                                  fontWeight: 600,
                                }}
                              >
                                {call.durationMinutes
                                  ? `Duration: ${call.durationMinutes} min`
                                  : "Duration: N/A"}
                                {call.finalAmount
                                  ? ` • Earned: ₹${call.finalAmount}`
                                  : ""}
                              </p>
                            )}
                        </div>
                      </div>

                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.75rem",
                        }}
                      >
                        {call.status === "pending" && (
                          <>
                            <button
                              onClick={() =>
                                handleCallAction(call.id, "active")
                              }
                              className="btn btn-primary"
                              style={{
                                padding: "0.75rem 1.25rem",
                                fontSize: "0.875rem",
                                display: "flex",
                                alignItems: "center",
                                gap: "0.375rem",
                                borderRadius: "8px",
                                background:
                                  "linear-gradient(135deg, #10b981, #059669)",
                                border: "none",
                                color: "white",
                                boxShadow: "0 2px 4px rgba(16, 185, 129, 0.2)",
                                transition: "all 0.2s ease",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform =
                                  "translateY(-1px)";
                                e.currentTarget.style.boxShadow =
                                  "0 4px 8px rgba(16, 185, 129, 0.3)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform =
                                  "translateY(0)";
                                e.currentTarget.style.boxShadow =
                                  "0 2px 4px rgba(16, 185, 129, 0.2)";
                              }}
                            >
                              <CheckCircle
                                style={{ width: "1rem", height: "1rem" }}
                              />
                              Accept
                            </button>
                            <button
                              onClick={() =>
                                handleCallAction(call.id, "rejected")
                              }
                              className="btn btn-ghost"
                              style={{
                                padding: "0.75rem 1.25rem",
                                fontSize: "0.875rem",
                                display: "flex",
                                alignItems: "center",
                                gap: "0.375rem",
                                borderRadius: "8px",
                                background: "white",
                                border: "1px solid #fca5a5",
                                color: "#dc2626",
                                transition: "all 0.2s ease",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = "#fee2e2";
                                e.currentTarget.style.transform =
                                  "translateY(-1px)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = "white";
                                e.currentTarget.style.transform =
                                  "translateY(0)";
                              }}
                            >
                              <XCircle
                                style={{ width: "1rem", height: "1rem" }}
                              />
                              Reject
                            </button>
                          </>
                        )}

                        {call.status === "active" && (
                          <>
                            <button
                              onClick={async () => {
                                if (!call.roomName) {
                                  alert("Room not ready.");
                                  return;
                                }

                                const actualUserId = call.userId;
                                if (!actualUserId) {
                                  alert("Call data is incomplete. Please refresh.");
                                  return;
                                }

                                localStorage.setItem("tgs:role", "astrologer");
                                localStorage.setItem(
                                  "tgs:astrologerId",
                                  astrologerId
                                );
                                localStorage.setItem(
                                  "tgs:userId",
                                  astrologerId
                                );
                                localStorage.setItem("tgs:callId", call.id);

                                console.log("[Call Join] Creating LiveKit session:", {
                                  astrologerId,
                                  userId: actualUserId,
                                  roomName: call.roomName,
                                  callType: call.callType,
                                });

                                const res = await fetch(
                                  "/api/livekit/create-session",
                                  {
                                    method: "POST",
                                    headers: {
                                      "Content-Type": "application/json",
                                    },
                                    body: JSON.stringify({
                                      astrologerId,
                                      userId: actualUserId, // FIXED: Use actual user ID from call
                                      callId: call.id,
                                      roomName: call.roomName,
                                      callType: call.callType || "video",
                                      role: "astrologer",
                                      displayName:
                                        userProfile?.name || "Astrologer",
                                    }),
                                  }
                                );

                                if (res.ok) {
                                  const sessionData = await res.json();
                                  console.log("[Call Join] Session created successfully:", sessionData);
                                  router.push(
                                    call.callType === "voice"
                                      ? `/talk-to-astrologer/voice/${call.roomName}`
                                      : `/talk-to-astrologer/room/${call.roomName}`
                                  );
                                } else {
                                  const error = await res.json().catch(() => ({ error: "Unknown error" }));
                                  console.error("[Call Join] Session creation failed:", error);
                                  alert(`Failed to join call: ${error.error || "Try again."}`);
                                }
                              }}
                              className="btn btn-primary"
                              style={{
                                padding: "0.75rem 1.25rem",
                                fontSize: "0.875rem",
                                display: "flex",
                                alignItems: "center",
                                gap: "0.375rem",
                                borderRadius: "8px",
                                background:
                                  "linear-gradient(135deg, #3b82f6, #2563eb)",
                                border: "none",
                                color: "white",
                                boxShadow: "0 2px 4px rgba(59, 130, 246, 0.2)",
                                transition: "all 0.2s ease",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.transform =
                                  "translateY(-1px)";
                                e.currentTarget.style.boxShadow =
                                  "0 4px 8px rgba(59, 130, 246, 0.3)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.transform =
                                  "translateY(0)";
                                e.currentTarget.style.boxShadow =
                                  "0 2px 4px rgba(59, 130, 246, 0.2)";
                              }}
                            >
                              {call.callType === "voice" ? (
                                <Phone
                                  style={{ width: "1rem", height: "1rem" }}
                                />
                              ) : (
                                <Video
                                  style={{ width: "1rem", height: "1rem" }}
                                />
                              )}
                              Join{" "}
                              {call.callType === "voice" ? "Voice" : "Video"}
                            </button>
                            <button
                              onClick={() =>
                                handleCallAction(call.id, "completed")
                              }
                              className="btn btn-ghost"
                              style={{
                                padding: "0.75rem 1.25rem",
                                fontSize: "0.875rem",
                                display: "flex",
                                alignItems: "center",
                                gap: "0.375rem",
                                borderRadius: "8px",
                                background: "white",
                                border: "1px solid #fca5a5",
                                color: "#dc2626",
                                transition: "all 0.2s ease",
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.background = "#fee2e2";
                                e.currentTarget.style.transform =
                                  "translateY(-1px)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.background = "white";
                                e.currentTarget.style.transform =
                                  "translateY(0)";
                              }}
                            >
                              <PhoneOff
                                style={{ width: "1rem", height: "1rem" }}
                              />
                              End
                            </button>
                          </>
                        )}

                        <span
                          style={{
                            padding: "0.375rem 0.75rem",
                            borderRadius: "9999px",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            backgroundColor:
                              getCallStatusColor(call.status) + "10",
                            color: getCallStatusColor(call.status),
                            border: `1px solid ${getCallStatusColor(
                              call.status
                            )}30`,
                            textTransform: "capitalize",
                          }}
                        >
                          {call.status}
                        </span>
                      </div>
                    </div>

                    {call.roomName && (
                      <div
                        style={{
                          marginTop: "0.75rem",
                          fontSize: "0.875rem",
                          color: "#9ca3af",
                          padding: "0.5rem",
                          background: "#f9fafb",
                          borderRadius: "6px",
                          borderLeft: `3px solid ${getCallStatusColor(
                            call.status
                          )}`,
                        }}
                      >
                        Room:{" "}
                        <code
                          style={{ fontFamily: "monospace", color: "#6b7280" }}
                        >
                          {call.roomName}
                        </code>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

/**
 * AstrologerDashboard Wrapper Component
 *
 * Simple wrapper that applies authentication guard.
 * Ensures only authenticated astrologers can access the dashboard.
 *
 * @returns {JSX.Element} Auth-guarded dashboard content.
 */
export default function AstrologerDashboard() {
  return (
    <AuthGuard requireAuth={true} allowedRoles={["astrologer"]}>
      <AstrologerDashboardContent />
    </AuthGuard>
  );
}
