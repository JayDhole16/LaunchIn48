import { ImageResponse } from 'next/og'
import { readFile } from 'fs/promises'
import { join } from 'path'

// Route segment config
export const runtime = 'edge'
export const size = {
  width: 32,
  height: 32,
}
export const contentType = 'image/png'

// Image generation using your actual logo
export default async function Icon() {
  // If you want to use your actual logo file instead of the L48 text,
  // uncomment this approach and comment out the current icon.tsx
  
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'white',
          borderRadius: '4px',
        }}
      >
        <img
          src="/images/logo.png"
          width="28"
          height="28"
          style={{
            borderRadius: '2px',
          }}
        />
      </div>
    ),
    {
      ...size,
    }
  )
}