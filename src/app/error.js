'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Error({ error, reset }) {
  const router = useRouter();

  useEffect(() => {
    // Log the error for debugging
    console.error('Application error:', error);
  }, [error]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      padding: '2rem',
      textAlign: 'center',
      background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
      color: 'white'
    }}>
      <h1 style={{ fontSize: '4rem', margin: '0', fontWeight: 'bold' }}>⚠️</h1>
      <h2 style={{ fontSize: '2rem', margin: '1rem 0' }}>Something went wrong!</h2>
      <p style={{ fontSize: '1.2rem', marginBottom: '2rem', opacity: 0.9 }}>
        {error?.message || 'An unexpected error occurred'}
      </p>
      <div style={{ display: 'flex', gap: '1rem' }}>
        <button
          onClick={reset}
          style={{
            padding: '12px 24px',
            fontSize: '1rem',
            backgroundColor: 'white',
            color: '#f5576c',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 'bold',
            transition: 'transform 0.2s',
          }}
          onMouseOver={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseOut={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          Try Again
        </button>
        <button
          onClick={() => router.push('/')}
          style={{
            padding: '12px 24px',
            fontSize: '1rem',
            backgroundColor: 'transparent',
            color: 'white',
            border: '2px solid white',
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
    </div>
  );
}
