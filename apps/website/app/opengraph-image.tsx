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
        backgroundImage: 'linear-gradient(135deg, #1F1F1F 0%, #28E2A4 100%)',
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
        {/* NOTE: Same artwork as app/icon.svg */}
        <svg
          role="img"
          aria-label="benchmrk"
          width="180"
          height="180"
          viewBox="0 0 1024 1024"
          fill="none"
          style={{ marginBottom: 32 }}
        >
          <rect width="1024" height="1024" rx="260" fill="#28E2A4" />
          <path
            d="M480 79.013C480 72.6104 487.147 68.8019 492.462 72.3726L668.462 190.623C670.673 192.109 672 194.598 672 197.263V512.5V827.719C672 830.393 670.663 832.891 668.438 834.375L492.438 951.708C487.121 955.253 480 951.441 480 945.052V79.013Z"
            fill="black"
          />
          <path
            d="M704 460.31C704 454.521 709.959 450.648 715.249 453L891.249 531.222C894.138 532.506 896 535.371 896 538.532V945.052C896 951.441 888.879 955.253 883.562 951.708L707.562 834.375C705.337 832.891 704 830.393 704 827.719V460.31Z"
            fill="black"
          />
          <rect x="320" y="128" width="128" height="768" rx="16" fill="black" />
          <rect x="160" y="256" width="128" height="512" rx="16" fill="black" />
          <rect x="124" y="448" width="221" height="128" rx="24" fill="black" />
        </svg>
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
            color: '#FFFFFF',
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
            color: '#E5E5E5',
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
