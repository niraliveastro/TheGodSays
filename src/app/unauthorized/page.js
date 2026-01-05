"use client";

import { useRouter } from "next/navigation";
import { useTranslation } from "@/hooks/useTranslation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ShieldX, ArrowLeft, LayoutDashboard } from "lucide-react";

export default function Unauthorized() {
  const { t } = useTranslation();
  const router = useRouter();
  const { userProfile } = useAuth();
  
  // Check if user is an astrologer
  const isAstrologer = userProfile?.collection === 'astrologers' || 
    (typeof window !== 'undefined' && localStorage.getItem('tgs:role') === 'astrologer');

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <Card className="max-w-md w-full p-8 text-center">
        <div className="mb-6">
          <ShieldX className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Access Denied
          </h1>
          <p className="text-gray-600">
            {isAstrologer 
              ? "You don't have permission to access this page. If you're trying to access astrologer features, please use your astrologer dashboard."
              : "You don't have permission to access this page. This page is for astrologers only. Please contact support if you believe this is an error."}
          </p>
        </div>

        <div className="space-y-3">
          <Button onClick={() => router.back()} className="w-full">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>

          {isAstrologer ? (
            <Button
              variant="outline"
              onClick={() => router.push("/astrologer-dashboard")}
              className="w-full"
            >
              <LayoutDashboard className="w-4 h-4 mr-2" />
              Go to Dashboard
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => router.push("/")}
              className="w-full"
            >
              Go to Home
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
