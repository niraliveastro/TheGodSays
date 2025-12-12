'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function NotFound() {
  const router = useRouter();

  useEffect(() => {
    // Optional: Log 404 errors for analytics
    if (typeof window !== 'undefined') {
      console.warn('404 - Page not found:', window.location.pathname);
    }
  }, []);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '2rem',
      textAlign: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      color: 'white'
    }}>
      <h1 style={{ fontSize: '6rem', margin: '0', fontWeight: 'bold' }}>404</h1>
      <h2 style={{ fontSize: '2rem', margin: '1rem 0' }}>Page Not Found</h2>
      <p style={{ fontSize: '1.2rem', marginBottom: '2rem', opacity: 0.9 }}>
        The page you are looking for does not exist.
      </p>
      <button
        onClick={() => router.push('/')}
        style={{
          padding: '12px 24px',
          fontSize: '1rem',
          backgroundColor: 'white',
          color: '#667eea',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          fontWeight: 'bold',
          transition: 'transform 0.2s',
        }}
        onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
        onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        Go Home
      </button>
    </div>
  );
}
