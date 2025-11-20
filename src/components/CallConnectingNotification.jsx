"use client";

import React from "react";
import { Phone, Video, XCircle, X } from "lucide-react";

// Simplified Modal component
function Modal({ open, onClose, children }) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export default function CallConnectingNotification({
  isOpen = true,
  type = "video",
  onTimeout = () => {},
  onCancel = () => {},
  status = "connecting",
}) {
  const [timeoutCounter, setTimeoutCounter] = React.useState(60);
  const [isClosing, setIsClosing] = React.useState(false);
  const [message, setMessage] = React.useState({ title: "", body: "" });

  // Handle visibility states and animations
  React.useEffect(() => {
    if (!isOpen) {
      setTimeoutCounter(60);
      setIsClosing(false);
      return;
    }

    // Update messages based on status
    switch (status) {
      case "rejected":
        setMessage({
          title: "Call Rejected",
          body: "The astrologer has declined your call request",
        });
        setIsClosing(true);
        break;

      case "cancelled":
        setMessage({
          title: "Call Cancelled",
          body: "Your call request has been cancelled",
        });
        setIsClosing(true);
        break;

      case "connecting":
      default:
        setMessage({
          title: "Connecting to Astrologer",
          body: `Please wait while we establish your ${type} call`,
        });
        setIsClosing(false);
    }

    // Handle timeout counter only for connecting
    if (status === "connecting") {
      const timer = setInterval(() => {
        setTimeoutCounter((prev) => {
          if (prev <= 1) {
            onTimeout?.();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [isOpen, status, type, onTimeout]);

  const handleCancel = () => {
    onCancel?.();
  };

  return (
    <Modal
      open={isOpen}
      onClose={status === "connecting" ? handleCancel : undefined}
    >
      <div
        className={`w-[340px] p-6 relative transition-all duration-500 ${
          isClosing ? "opacity-0 scale-95" : "opacity-100 scale-100"
        }`}
      >
        {/* Close/Cancel Button - Only show during connecting */}
        {status === "connecting" && (
          <button
            onClick={handleCancel}
            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors z-10"
            aria-label="Cancel call"
          >
            <X className="w-5 h-5" />
          </button>
        )}

        <div className="flex flex-col items-center justify-center space-y-6">
          {/* Icon and Spinner */}
          <div className="relative">
            {status === "rejected" || status === "cancelled" ? (
              <div className="w-16 h-16 flex items-center justify-center">
                <XCircle className={`w-16 h-16 ${status === "rejected" ? "text-red-500" : "text-orange-500"}`} />
              </div>
            ) : (
              <>
                <div className="absolute inset-0 flex items-center justify-center z-10">
                  {type === "video" ? (
                    <Video className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                  ) : (
                    <Phone className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                  )}
                </div>
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 border-4 border-indigo-200 rounded-full animate-pulse dark:border-indigo-800"></div>
                  <div className="absolute inset-0 border-4 border-indigo-600 rounded-full animate-spin border-t-transparent dark:border-indigo-400"></div>
                </div>
              </>
            )}
          </div>

          {/* Message */}
          <div className="text-center">
            <h3
              className={`text-xl font-semibold ${
                status === "rejected"
                  ? "text-red-600 dark:text-red-500"
                  : status === "cancelled"
                  ? "text-orange-600 dark:text-orange-500"
                  : "text-gray-900 dark:text-gray-100"
              }`}
            >
              {message.title}
            </h3>
            <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
              {message.body}
            </p>
            {status === "connecting" && (
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
                Timeout in {timeoutCounter}s
              </p>
            )}
          </div>

          {/* Loading Bar */}
          {status === "connecting" && (
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
              <div
                className="bg-indigo-600 dark:bg-indigo-500 h-1.5 rounded-full transition-all duration-1000"
                style={{ width: `${(timeoutCounter / 60) * 100}%` }}
              />
            </div>
          )}

          {/* Cancel Button - Only show during connecting */}
          {status === "connecting" && (
            <button
              onClick={handleCancel}
              className="w-full mt-2 px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              Cancel Call
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
