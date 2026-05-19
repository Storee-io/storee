import { ImageResponse } from 'next/og';

export const runtime = 'edge';
export const alt = 'Storee – AI-Powered Store Builder';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#0f172a',
          position: 'relative',
          overflow: 'hidden',
          fontFamily: 'system-ui, -apple-system, sans-serif',
        }}
      >
        {/* Emerald glow — top right */}
        <div
          style={{
            position: 'absolute',
            top: -120,
            right: -120,
            width: 560,
            height: 560,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(16,185,129,0.22) 0%, transparent 70%)',
          }}
        />
        {/* Teal glow — bottom left */}
        <div
          style={{
            position: 'absolute',
            bottom: -120,
            left: -80,
            width: 480,
            height: 480,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(20,184,166,0.18) 0%, transparent 70%)',
          }}
        />
        {/* Center glow */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 700,
            height: 700,
            borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 60%)',
          }}
        />

        {/* AI badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'linear-gradient(90deg, #10b981, #14b8a6)',
            borderRadius: 100,
            padding: '10px 24px',
            marginBottom: 36,
          }}
        >
          <span style={{ color: 'white', fontSize: 18, fontWeight: 700, letterSpacing: 0.5 }}>
            ✦ AI-Powered Store Builder
          </span>
        </div>

        {/* Logo + wordmark */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            marginBottom: 28,
          }}
        >
          <div
            style={{
              width: 72,
              height: 72,
              borderRadius: 18,
              background: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 8px 32px rgba(16,185,129,0.4)',
            }}
          >
            <span style={{ color: 'white', fontSize: 36, fontWeight: 900 }}>S</span>
          </div>
          <span
            style={{
              color: 'white',
              fontSize: 80,
              fontWeight: 800,
              letterSpacing: -3,
              lineHeight: 1,
            }}
          >
            Storee
          </span>
        </div>

        {/* Tagline */}
        <p
          style={{
            color: '#94a3b8',
            fontSize: 26,
            textAlign: 'center',
            maxWidth: 640,
            lineHeight: 1.5,
            margin: 0,
          }}
        >
          Describe your business. Get a complete,
          <br />
          ready-to-publish store in seconds.
        </p>

        {/* Bottom strip */}
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            height: 4,
            background: 'linear-gradient(90deg, #10b981, #14b8a6, #06b6d4)',
          }}
        />
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
