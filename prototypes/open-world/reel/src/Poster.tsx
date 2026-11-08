import { useLayoutEffect, useRef } from 'react'
import * as THREE from 'three'
import { AbsoluteFill, useVideoConfig } from 'remotion'
import { City3D } from './three-city'

/** Loading-screen art: the 3D city at golden hour, no text. */
export function Poster() {
  const { width, height } = useVideoConfig()
  const canvas = useRef<HTMLCanvasElement>(null)
  useLayoutEffect(() => {
    const city = new City3D(THREE, canvas.current!, { dpr: 1, width, height, preserve: true })
    city.render({ t: 4, night: 0.1, pan: 0.04 })
    return () => city.dispose()
  }, [width, height])
  return (
    <AbsoluteFill style={{ background: '#0A0C10' }}>
      <canvas ref={canvas} width={width} height={height} style={{ width: '100%', height: '100%' }} />
    </AbsoluteFill>
  )
}
