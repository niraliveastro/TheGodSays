"use client";

import { useState, useEffect } from "react";
import { useTranslation } from "@/hooks/useTranslation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Download,
  Share,
  RefreshCw,
  MapPin,
  Calendar,
  Moon,
  Clock,
} from "lucide-react";
import astrologyAPI from "@/lib/api";
import { PageLoading } from "@/components/LoadingStates";

export default function TithiTimingsPage() {
  const { t } = useTranslation();
  const [tithiData, setTithiData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  // Get user's location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            timezone: Math.round(position.coords.longitude / 15), // Approximate timezone
          });
        },
        (error) => {
          console.log("Geolocation error:", error);
          // Fallback to Delhi, India
          setUserLocation({
            latitude: 28.6139,
            longitude: 77.209,
            timezone: 5.5,
          });
        }
      );
    } else {
      // Fallback to Delhi, India
      setUserLocation({
        latitude: 28.6139,
        longitude: 77.209,
        timezone: 5.5,
      });
    }
  }, []);

  // Fetch tithi data when location is available
  useEffect(() => {
    if (userLocation) {
      fetchTithiData();
    }
  }, [userLocation]);

  const fetchTithiData = async () => {
    if (!userLocation) return;

    setIsLoading(true);
    setError(null);

    try {
      const now = new Date();
      const payload = {
        year: now.getFullYear(),
        month: now.getMonth() + 1,
        date: now.getDate(),
        hours: now.getHours(),
        minutes: now.getMinutes(),
        seconds: now.getSeconds(),
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
        // Use reliable browser timezone offset (hours). Example: IST => 5.5
        timezone: -now.getTimezoneOffset() / 60,
        config: {
          // Keep consistent with the rest of the app/api usage
          observation_point: "topocentric",
          ayanamsha: "lahiri",
        },
      };

      console.log("Fetching tithi data with payload (tithi-timings):", payload);

      // Use centralized API wrapper and the correct endpoint
      const data = await astrologyAPI.getSingleCalculation(
        "tithi-timings",
        payload
      );
      console.log("Tithi API response (wrapper):", data);

      const formattedData = formatTithiData(data);
      setTithiData(formattedData);
    } catch (error) {
      console.error("Error fetching tithi data:", error);
      // Graceful fallback on rate limiting
      if (String(error?.message || "").includes("429")) {
        console.log("Rate limit exceeded, using mock data");
        setTithiData({
          number: 8,
          name: "Ashtami",
          paksha: "krishna",
          left_precentage: 45.2,
          completes_at: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString(),
        });
        setError("API rate limit exceeded. Showing sample data.");
      } else {
        setError("Failed to fetch tithi data. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const formatTithiData = (data) => {
    try {
      console.log("Raw API response:", data);

      // The API response has nested JSON in the output field
      let parsed = JSON.parse(data.output);
      console.log("First parse result:", parsed);

      // The parsed result is a string, so we need to parse it again
      if (typeof parsed === "string") {
        parsed = JSON.parse(parsed);
        console.log("Second parse result:", parsed);
      }

      console.log("Final tithi data:", parsed);
      return parsed;
    } catch (error) {
      console.error("Error parsing tithi data:", error);
      console.log("Raw output that failed to parse:", data.output);
      return null;
    }
  };

  const formatDateTime = (dateTimeString) => {
    try {
      const date = new Date(dateTimeString);
      return date.toLocaleString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      });
    } catch (error) {
      return dateTimeString;
    }
  };

  const getPakshaColor = (paksha) => {
    return paksha === "krishna" ? "text-red-600" : "text-green-600";
  };

  const getPakshaBg = (paksha) => {
    return paksha === "krishna"
      ? "bg-red-50 border-red-200"
      : "bg-green-50 border-green-200";
  };

  const handleRefresh = () => {
    fetchTithiData();
  };

  const handleDownload = () => {
    if (!tithiData) return;

    const dataStr = JSON.stringify(tithiData, null, 2);
    const dataBlob = new Blob([dataStr], { type: "application/json" });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "tithi-timings-result.json";
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Tithi Timings Result",
          text: "Check out my current tithi timings",
          url: window.location.href,
        });
      } catch (error) {
        console.log("Error sharing:", error);
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Link copied to clipboard!");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center space-x-3 mb-4">
            <Moon className="w-8 h-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-blue-600">Tithi Timings</h1>
          </div>
          <p className="text-lg text-gray-600">
            Current tithi and its completion time
          </p>
        </div>

        {/* Current Time and Location Info */}
        <div className="mb-6">
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row justify-between items-center space-y-2 sm:space-y-0">
                <div className="flex items-center space-x-2">
                  <Calendar className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-gray-700">
                    {currentTime.toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-gray-700">
                    {currentTime.toLocaleTimeString("en-US", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                      hour12: true,
                    })}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-gray-700">
                    {userLocation
                      ? `${userLocation.latitude.toFixed(
                          4
                        )}, ${userLocation.longitude.toFixed(4)}`
                      : "Getting location..."}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={handleRefresh}
              disabled={isLoading}
              className="flex items-center space-x-2"
            >
              <RefreshCw
                className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
              />
              <span>Refresh</span>
            </Button>
          </div>
          <div className="flex space-x-2">
            <Button
              variant="outline"
              onClick={handleDownload}
              disabled={!tithiData}
              className="flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </Button>
            <Button
              variant="outline"
              onClick={handleShare}
              disabled={!tithiData}
              className="flex items-center space-x-2"
            >
              <Share className="w-4 h-4" />
              <span>Share</span>
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && <PageLoading type="panchang" message="Calculating current tithi timings..." />}

        {/* Error State */}
        {error && !tithiData && (
          <Card className="border-yellow-200 bg-yellow-50">
            <CardContent className="text-center py-8">
              <p className="text-yellow-800 mb-4">{error}</p>
              <Button onClick={handleRefresh} variant="outline">
                Try Again
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Rate Limit Warning */}
        {error && tithiData && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-yellow-800 text-sm">
              ⚠️ {error} This is sample data for demonstration.
            </p>
          </div>
        )}

        {/* Tithi Results */}
        {tithiData && !isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Current Tithi Info */}
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-blue-800">
                  <Moon className="w-5 h-5" />
                  <span>Current Tithi</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600 mb-2">
                    {tithiData.number || "N/A"}
                  </div>
                  <div className="text-xl font-semibold text-gray-800">
                    {tithiData.name || "Unknown Tithi"}
                  </div>
                </div>

                <div
                  className={`p-3 rounded-lg border ${getPakshaBg(
                    tithiData.paksha
                  )}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-700">Paksha:</span>
                    <span
                      className={`font-semibold capitalize ${getPakshaColor(
                        tithiData.paksha
                      )}`}
                    >
                      {tithiData.paksha || "Unknown"}
                    </span>
                  </div>
                </div>

                <div className="bg-white p-4 rounded-lg border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-gray-700">Progress:</span>
                    <span className="font-semibold text-gray-800">
                      {tithiData.left_precentage
                        ? `${tithiData.left_precentage.toFixed(1)}% remaining`
                        : "N/A"}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className="bg-blue-600 h-3 rounded-full transition-all duration-500"
                      style={{
                        width: `${
                          tithiData.left_precentage
                            ? 100 - tithiData.left_precentage
                            : 0
                        }%`,
                      }}
                    ></div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Completion Time */}
            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2 text-green-800">
                  <Clock className="w-5 h-5" />
                  <span>Completion Time</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600 mb-2">
                    {tithiData.completes_at
                      ? formatDateTime(tithiData.completes_at)
                      : "N/A"}
                  </div>
                  <p className="text-sm text-gray-600">
                    {tithiData.completes_at
                      ? "This tithi will complete at the above time"
                      : "Completion time not available"}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
