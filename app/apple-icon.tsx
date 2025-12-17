import { ImageResponse } from 'next/og'

// Route segment config
export const runtime = 'edge'
export const size = {
  width: 180,
  height: 180,
}
export const contentType = 'image/png'

// Image generation
export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 64,
          background: 'linear-gradient(135deg, #1a1a1a 0%, #000000 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          fontWeight: '900',
          fontFamily: 'system-ui, sans-serif',
          borderRadius: '24px',
        }}
      >
        L48
      </div>
    ),
    {
      ...size,
    }
  )
}