import { ImageResponse } from 'next/og'

// Route segment config
export const runtime = 'edge'
export const size = {
  width: 32,
  height: 32,
}
export const contentType = 'image/png'

// Image generation
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 20,
          background: 'linear-gradient(135deg, #1a1a1a 0%, #000000 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          fontWeight: '900',
          fontFamily: 'system-ui, sans-serif',
          borderRadius: '4px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
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
