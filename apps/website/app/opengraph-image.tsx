import { ImageResponse } from 'next/og';

// NOTE: Image metadata for Open Graph and Twitter Cards
export const alt = 'benchmrk - AI-Powered Fitness Tracking';
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = 'image/png';

// NOTE: Dynamic image generation for social media thumbnails
// HACK: Using system fonts instead of custom woff2 (ImageResponse only supports TTF/OTF)
export default async function Image() {
  return new ImageResponse(
    <div
      style={{
        height: '100%',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#1F1F1F',
        backgroundImage: 'linear-gradient(135deg, #1F1F1F 0%, #34D399 100%)',
      }}
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '80px',
        }}
      >
        <h1
          style={{
            fontSize: 120,
            fontWeight: 700,
            color: '#FFFFFF',
            marginBottom: 24,
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          benchmrk
        </h1>
        <p
          style={{
            fontSize: 40,
            color: '#34D399',
            textAlign: 'center',
            maxWidth: 900,
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          AI-Powered Fitness Tracking
        </p>
        <p
          style={{
            fontSize: 28,
            color: '#A0A0A0',
            textAlign: 'center',
            marginTop: 20,
            fontFamily: 'system-ui, -apple-system, sans-serif',
          }}
        >
          Better than paper tracking
        </p>
      </div>
    </div>,
    {
      ...size,
    }
  );
}
