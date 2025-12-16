'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import './not-found.css';

export default function NotFound() {
  const router = useRouter();

  useEffect(() => {
    // Optional: Log 404 errors for analytics
    if (typeof window !== 'undefined') {
      console.warn('404 - Page not found:', window.location.pathname);
    }
  }, []);

  return (
    <div className="not-found-page">
      <div className="not-found-content">
        <h1 className="not-found-title">404</h1>
        <h2 className="not-found-subtitle">Page Not Found</h2>
        <p className="not-found-text">
          The page you are looking for does not exist.
        </p>
        <button
          onClick={() => router.push('/')}
          className="not-found-button"
        >
          Go Home
        </button>
      </div>
    </div>
  );
}
