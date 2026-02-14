"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PredictionsPage from "@/app/new-predictions/page";
import { PageLoading } from "@/components/LoadingStates";

const PREDICTIONS_PAGE_CACHE_KEY = "tgs:predictions_page_cache";

export default function PredictionResultPage() {
  const router = useRouter();
  const [cache, setCache] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (typeof sessionStorage === "undefined") {
      router.replace("/kundli-prediction");
      return;
    }
    try {
      const raw = sessionStorage.getItem(PREDICTIONS_PAGE_CACHE_KEY);
      if (!raw) {
        router.replace("/kundli-prediction");
        return;
      }
      const parsed = JSON.parse(raw);
      if (parsed?.result) {
        setCache(parsed);
      } else {
        router.replace("/kundli-prediction");
      }
    } catch {
      router.replace("/kundli-prediction");
    } finally {
      setLoading(false);
    }
  }, [router]);

  if (loading || !cache) {
    return (
      <PageLoading
        type="predictions"
        message="Loading your predictions..."
      />
    );
  }

  return <PredictionsPage initialCache={cache} showOnlyResult />;
}
