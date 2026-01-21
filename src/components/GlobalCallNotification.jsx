"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
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

/**
 * GlobalCallNotification Component
 * 
 * This component listens for incoming calls for astrologers and displays
 * a notification overlay on ANY page they're on (dashboard, profile, etc.)
 * 
 * It uses a high z-index (9999) to ensure it appears above all content.
 */
export default function GlobalCallNotification() {
  const { getUserId, userProfile } = useAuth();
  const astrologerId = getUserId();
  const router = useRouter();
  const pathname = usePathname();
  const [incomingCall, setIncomingCall] = useState(null);
  const isProcessingRef = useRef(false); // Prevent duplicate accept/reject actions
  const [userNames, setUserNames] = useState({});

  // Check if user is an astrologer
  const isAstrologer =
    userProfile?.collection === "astrologers" ||
    (typeof window !== "undefined" &&
      localStorage.getItem("tgs:role") === "astrologer");

  // Don't show on call pages (to avoid conflicts)
  const isCallPage =
    pathname?.includes("/talk-to-astrologer/room/") ||
    pathname?.includes("/talk-to-astrologer/voice/");

  useEffect(() => {
    // Only listen if user is astrologer and not on a call page
    if (!isAstrologer || !astrologerId || isCallPage) {
      setIncomingCall(null);
      return;
    }

    let unsubCalls;

    try {
      // Query and listen for calls assigned to this astrologer
      const q = query(
        collection(db, "calls"),
        where("astrologerId", "==", astrologerId)
      );

      unsubCalls = onSnapshot(
        q,
        async (snapshot) => {
          let newIncomingCall = null;

          for (const docSnapshot of snapshot.docs) {
            const call = { id: docSnapshot.id, ...docSnapshot.data() };

            // Skip cancelled and rejected calls
            if (call.status === "cancelled" || call.status === "rejected") {
              if (incomingCall && incomingCall.id === call.id) {
                setIncomingCall(null);
              }
              continue;
            }

            // Only show pending calls
            if (call.status === "pending") {
              newIncomingCall = call;
              break; // Take the first pending call
            }
          }

          // Update incoming call state
          if (newIncomingCall) {
            setIncomingCall(newIncomingCall);
          } else if (incomingCall) {
            // Clear if no longer pending
            setIncomingCall(null);
          }
        },
        (error) => {
          console.warn("Global call listener error:", error);
        }
      );
    } catch (error) {
      console.error("Error setting up global call listener:", error);
    }

    return () => {
      if (unsubCalls) {
        unsubCalls();
      }
    };
  }, [isAstrologer, astrologerId, isCallPage, incomingCall?.id]);

  // Fetch user names for display - AGGRESSIVE VERSION
  useEffect(() => {
    if (!incomingCall?.userId) return;

    console.log(`GlobalCallNotification: Fetching name for userId: ${incomingCall.userId}`);

    const fetchUserName = async () => {
      try {
        // Try 'users' collection first (most common)
        console.log(`  Checking users collection for ${incomingCall.userId}`);
        const userDoc = await getDoc(doc(db, "users", incomingCall.userId));
        
        if (userDoc.exists()) {
          const userData = userDoc.data();
          console.log(`  ✅ Found user in users collection:`, userData);
          
          const userName =
            userData.name ||
            userData.displayName ||
            userData.fullName ||
            userData.firstName ||
            userData.username ||
            (userData.email ? userData.email.split("@")[0] : null);
          
          if (userName) {
            const cleanName = userName.includes("@") ? userName.split("@")[0] : userName;
            console.log(`✅ GlobalCallNotification: Setting name to: ${cleanName}`);
            setUserNames((prev) => ({
              ...prev,
              [incomingCall.userId]: cleanName,
            }));
            return;
          } else {
            console.warn(`  ⚠️ User found but no name field. Available fields:`, Object.keys(userData));
          }
        } else {
          console.log(`  ❌ User not found in users collection`);
        }
      } catch (error) {
        console.error("❌ GlobalCallNotification: Error fetching user name:", error);
      }
    };

    fetchUserName();
  }, [incomingCall?.userId]); // Fetch every time userId changes

  const handleCallAction = async (callId, action) => {
    try {
      // CRITICAL: Prevent duplicate actions
      if (isProcessingRef.current) {
        console.log("⚠️ Call action already in progress, ignoring duplicate");
        return;
      }
      
      isProcessingRef.current = true;
      
      // Clear incoming call immediately to prevent duplicate notifications
      setIncomingCall(null);
      
      const callRef = doc(db, "calls", callId);

      // Check current call status before accepting
      if (action === "active") {
        const callSnapshot = await getDoc(callRef);
        if (!callSnapshot.exists) {
          alert("Call not found. It may have been cancelled.");
          isProcessingRef.current = false;
          return;
        }

        const currentCallData = callSnapshot.data();

        // Prevent accepting if already accepted, cancelled, or rejected
        if (currentCallData.status === "active" || 
            currentCallData.status === "completed") {
          console.log("⚠️ Call already accepted/completed, ignoring duplicate accept");
          isProcessingRef.current = false;
          return;
        }
        
        if (currentCallData.status === "cancelled" ||
            currentCallData.status === "rejected") {
          alert("This call was cancelled/rejected and cannot be accepted.");
          isProcessingRef.current = false;
          return;
        }

        // Only accept if status is "pending"
        if (currentCallData.status !== "pending") {
          alert("This call is no longer available.");
          isProcessingRef.current = false;
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
        setIncomingCall(null);

        // Get fresh call data after update
        const updatedCallSnapshot = await getDoc(callRef);
        const updatedCallData = updatedCallSnapshot.exists
          ? updatedCallSnapshot.data()
          : null;

        const call = updatedCallData
          ? { id: callId, ...updatedCallData }
          : incomingCall;

        if (!call) {
          console.error("[Call Accept] Call not found:", callId);
          alert("Call not found. Please refresh and try again.");
          return;
        }

        const actualUserId = call.userId;
        if (!actualUserId) {
          console.error("[Call Accept] User ID missing from call:", call);
          alert("Call data is incomplete. Please refresh and try again.");
          return;
        }

        const roomName = call.roomName || updateData.roomName;
        if (!roomName) {
          console.error("[Call Accept] Room name missing after update");
          alert("Failed to create call room. Please try again.");
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
            userId: actualUserId,
            callId: callId,
            roomName: roomName,
            callType: call.callType || "video",
            role: "astrologer",
            displayName: userProfile?.name || "Astrologer",
          }),
        });

        if (sessionResponse.ok) {
          const contentType = sessionResponse.headers.get("content-type");
          if (contentType && contentType.includes("application/json")) {
            try {
              const sessionData = await sessionResponse.json();
              console.log("[Call Accept] Session created successfully:", sessionData);
              router.push(route);
            } catch (jsonError) {
              console.error("Error parsing session response as JSON:", jsonError);
              alert("Failed to parse server response. Please try again.");
            }
          } else {
            console.error("Session API returned non-JSON response");
            alert("Invalid response from server. Please try again.");
          }
        } else {
          const contentType = sessionResponse.headers.get("content-type");
          let error = { error: "Unknown error" };
          if (contentType && contentType.includes("application/json")) {
            try {
              error = await sessionResponse.json();
            } catch (e) {
              console.warn("Error parsing error response as JSON:", e);
            }
          }
          console.error("[Call Accept] Session creation failed:", error);
          alert(`Failed to join call: ${error.error || "Try again."}`);
        }
      } else if (action === "rejected") {
        setIncomingCall(null);
      }
    } catch (error) {
      console.error("Call action error:", error);
    } finally {
      // Always reset processing flag
      isProcessingRef.current = false;
    }
  };

  // Don't render if no incoming call or not astrologer or on call page
  if (!incomingCall || !isAstrologer || isCallPage) {
    return null;
  }

  // Render notification overlay with very high z-index to appear above everything
  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999, // Very high z-index to overlay everything
        pointerEvents: "auto",
      }}
    >
      {incomingCall.callType === "voice" ? (
        <VoiceCallNotification
          call={incomingCall}
          userName={userNames[incomingCall.userId] || null}
          onAccept={() => handleCallAction(incomingCall.id, "active")}
          onReject={() => handleCallAction(incomingCall.id, "rejected")}
          onClose={() => setIncomingCall(null)}
        />
      ) : (
        <CallNotification
          call={incomingCall}
          userName={userNames[incomingCall.userId] || null}
          onAccept={() => handleCallAction(incomingCall.id, "active")}
          onReject={() => handleCallAction(incomingCall.id, "rejected")}
          onClose={() => setIncomingCall(null)}
        />
      )}
    </div>
  );
}

