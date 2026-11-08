import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { AbsoluteFill, continueRender, delayRender, interpolate, spring, useCurrentFrame, useVideoConfig, Easing } from 'remotion'
import '@fontsource/big-shoulders-display/700.css'
import '@fontsource/big-shoulders-display/900.css'
import '@fontsource/barlow/500.css'
import '@fontsource/martian-mono/400.css'
import '@fontsource/martian-mono/500.css'
import { City3D } from './three-city'

const INK = '#0a0d12', PAPER = '#f3ecdc', SODIUM = '#ffb547', SIGNAL = '#45e3c6', EMBER = '#ff5a2c'
const DISPLAY = '"Big Shoulders Display", Impact, sans-serif'
const MONO = '"Martian Mono", monospace'

// Deterministic noise per frame, so every render of the reel is identical.
const noise = (frame: number, i: number) => {
  const x = Math.sin(frame * 12.9898 + i * 78.233) * 43758.5453
  return x - Math.floor(x)
}
const decode = (text: string, p: number, frame: number) => {
  const keep = Math.floor(text.length * p)
  return text.slice(0, keep) + text.slice(keep).replace(/[0-9A-Z]/g, (c, i) =>
    /[0-9]/.test(c) ? String(Math.floor(noise(frame, i) * 10)) : String.fromCharCode(65 + Math.floor(noise(frame, i) * 26)))
}

function Scene() {
  const frame = useCurrentFrame()
  const { width, height, fps } = useVideoConfig()
  const canvas = useRef<HTMLCanvasElement>(null)
  const city = useRef<City3D | null>(null)
  // Build the scene and draw this frame synchronously, so Remotion captures a finished frame.
  useLayoutEffect(() => {
    if (!city.current) city.current = new City3D(THREE, canvas.current!, { dpr: 1, width, height, preserve: true })
    city.current.render({
      t: frame / fps,
      night: interpolate(frame, [0, 240], [0.04, 0.42]),
      pan: interpolate(frame, [0, 240], [0, 0.2], { easing: Easing.inOut(Easing.cubic) }),
    })
  }, [frame, fps, width, height])
  useEffect(() => () => { city.current?.dispose(); city.current = null }, [])

  return <canvas ref={canvas} width={width} height={height} style={{ width: '100%', height: '100%' }} />
}

export function Intro() {
  const frame = useCurrentFrame()
  const { fps, width } = useVideoConfig()
  const [fonts] = useState(() => delayRender('fonts'))
  useEffect(() => { document.fonts.ready.then(() => continueRender(fonts)) }, [fonts])

  const s = width / 1920 // scale everything from a 1080p design
  const fadeIn = interpolate(frame, [0, 36], [1, 0], { extrapolateRight: 'clamp' })
  const bars = interpolate(frame, [6, 30], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.inOut(Easing.exp) })

  // Location card: frames 30–100
  const locIn = spring({ frame: frame - 30, fps, config: { damping: 200 } })
  const locOut = interpolate(frame, [92, 102], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const coordP = interpolate(frame, [38, 72], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  // Name slam: from frame 104
  const first = 'VAIBHAV', last = 'DHIR'
  const shake = frame >= 112 && frame < 122 ? (noise(frame, 1) - 0.5) * 14 * s : 0
  const flash = interpolate(frame, [110, 113, 124], [0, 0.35, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })
  const roleIn = interpolate(frame, [126, 140], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  // Missions strip: from frame 170
  const missions = ['Replay', 'CareerPilot AI', 'Soccer Player Tracker', 'Crop and Weed Detector', 'AI Blind Stick', 'Fire Fighter Bot']
  const press = interpolate(frame, [214, 224], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })

  return (
    <AbsoluteFill style={{ background: INK, color: PAPER, fontFamily: '"Barlow", sans-serif' }}>
      <Scene />
      {/* Readability shade on the left third */}
      <AbsoluteFill style={{ background: 'linear-gradient(90deg, rgba(10,13,18,0.82) 0%, rgba(10,13,18,0.45) 45%, rgba(10,13,18,0) 75%), linear-gradient(0deg, rgba(10,13,18,0.7) 0%, rgba(10,13,18,0) 45%)' }} />

      {/* Location */}
      {frame < 104 && (
        <div style={{ position: 'absolute', left: 120 * s, top: 250 * s, opacity: locIn * locOut, transform: `translateX(${(1 - locIn) * -40 * s}px)` }}>
          <div style={{ fontFamily: MONO, fontSize: 18 * s, letterSpacing: '0.12em', color: '#9d968a' }}>LOCATION</div>
          <div style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 84 * s, letterSpacing: '0.04em', lineHeight: 1 }}>DELHI, INDIA</div>
          <div style={{ fontFamily: MONO, fontSize: 24 * s, color: SODIUM, letterSpacing: '0.08em', marginTop: 8 * s }}>{decode('28.61°N  77.21°E', coordP, frame)}</div>
        </div>
      )}

      {/* Name */}
      {frame >= 104 && (
        <div style={{ position: 'absolute', left: 110 * s, bottom: 290 * s, transform: `translate(${shake}px, ${shake * 0.5}px)` }}>
          <div style={{ fontFamily: DISPLAY, fontWeight: 900, fontSize: 250 * s, lineHeight: 0.86, display: 'flex', gap: 40 * s }}>
            {[first, last].map((word, wi) => (
              <span key={word} style={{ display: 'flex', color: wi ? SODIUM : PAPER }}>
                {word.split('').map((ch, i) => {
                  const k = wi * first.length + i
                  const p = spring({ frame: frame - 104 - k * 1.2, fps, config: { damping: 14, stiffness: 160, mass: 0.6 } })
                  return <span key={i} style={{ display: 'inline-block', opacity: Math.min(1, p * 1.4), transform: `translateY(${(1 - p) * 120 * s}px) rotate(${(1 - p) * 8}deg)` }}>{ch}</span>
                })}
              </span>
            ))}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 22 * s, letterSpacing: '0.16em', marginTop: 22 * s, opacity: roleIn, textShadow: '0 2px 6px rgba(0,0,0,0.95)', transform: `translateY(${(1 - roleIn) * 12 * s}px)` }}>
            FORWARD DEPLOYED ENGINEER  /  SOLUTIONS ENGINEER  /  FULL STACK AI DEVELOPER
          </div>
        </div>
      )}

      {/* Missions strip */}
      {frame >= 168 && (
        <div style={{ position: 'absolute', left: 120 * s, right: 120 * s, bottom: 170 * s, display: 'flex', gap: 14 * s, flexWrap: 'wrap' }}>
          {missions.map((m, i) => {
            const p = spring({ frame: frame - 168 - i * 4, fps, config: { damping: 200 } })
            return (
              <div key={m} style={{ opacity: p, transform: `translateY(${(1 - p) * 20 * s}px)`, fontFamily: MONO, fontSize: 17 * s, letterSpacing: '0.08em',
                padding: `${8 * s}px ${14 * s}px`, border: `1px solid ${i === 0 ? SODIUM : 'rgba(243,236,220,0.42)'}`, color: i === 0 ? SODIUM : PAPER, background: 'rgba(10,13,18,0.7)' }}>
                {i === 0 ? 'MAIN MISSION · ' : 'MISSION · '}{m.toUpperCase()}
              </div>
            )
          })}
        </div>
      )}

      {/* Letterbox */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 130 * s, background: '#000', transform: `translateY(${(bars - 1) * 100}%)` }} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 130 * s, background: '#000', transform: `translateY(${(1 - bars) * 100}%)` }}>
        <div style={{ position: 'absolute', right: 120 * s, top: 42 * s, display: 'flex', alignItems: 'center', gap: 18 * s, opacity: press }}>
          <span style={{ fontFamily: MONO, fontSize: 16 * s, border: '1px solid rgba(243,236,220,0.42)', padding: `${4 * s}px ${9 * s}px` }}>ENTER</span>
          <span style={{ fontFamily: DISPLAY, fontWeight: 700, fontSize: 38 * s, letterSpacing: '0.08em' }}>START</span>
        </div>
        <div style={{ position: 'absolute', left: 120 * s, top: 50 * s, fontFamily: MONO, fontSize: 16 * s, color: '#c4bcab' }}>
          <span style={{ color: SODIUM }}>TIP</span>  Every project in this world is a mission. Replay is the main one.
        </div>
      </div>

      <AbsoluteFill style={{ background: '#fff', opacity: flash }} />
      <AbsoluteFill style={{ background: '#000', opacity: fadeIn }} />
      <div style={{ display: 'none' }}>{SIGNAL}{EMBER}</div>
    </AbsoluteFill>
  )
}
