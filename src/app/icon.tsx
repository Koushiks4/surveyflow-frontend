import { ImageResponse } from 'next/og';

export const size = { width: 32, height: 32 };
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: '#6366F1',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 20 20"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M10 2L4 6.5v7L10 18l6-4.5v-7L10 2z"
            stroke="white"
            strokeWidth="1.2"
            strokeLinejoin="round"
            fill="none"
          />
          <path
            d="M10 7.5v5M7.5 9l2.5 1.25L12.5 9"
            stroke="rgba(255,255,255,0.7)"
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="10" cy="7.5" r="1.5" fill="white" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
