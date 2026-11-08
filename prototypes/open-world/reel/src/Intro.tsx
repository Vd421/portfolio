import { useEffect, useState } from 'react'
import { AbsoluteFill, continueRender, delayRender, Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion'
import '@fontsource/anton/400.css'
import '@fontsource/inter/400.css'
import '@fontsource/jetbrains-mono/400.css'
import '@fontsource/jetbrains-mono/500.css'
// Same art as the site, so the reel hands off to the page without a seam.
import { BackdropArt, NEAR } from '../../src/backdrop-art'
import { CarPoster } from '../../src/car-poster'
import { colors } from '../../src/motion-config'

const DISPLAY = '"Anton", Impact, sans-serif'
const MONO = '"JetBrains Mono", monospace'
const BODY = '"Inter", system-ui, sans-serif'

const clamp = { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' } as const
// Deterministic noise per frame, so every render is identical.
const noise = (frame: number, i: number) => { const x = Math.sin(frame * 12.9898 + i * 78.233) * 43758.5453; return x - Math.floor(x) }
const decode = (text: string, p: number, frame: number) => {
  const keep = Math.floor(text.length * p)
  return text.slice(0, keep) + text.slice(keep).replace(/[0-9A-Z]/g, (c, i) =>
    /[0-9]/.test(c) ? String(Math.floor(noise(frame, i) * 10)) : String.fromCharCode(65 + Math.floor(noise(frame, i) * 26)))
}

/**
 * Six-second intro, 30 fps. Black → sunset poster with a slow push-in; location card decodes;
 * the hypercar rolls in and parks; the city's windows switch on left to right; the name lands
 * letter by letter with the underline; it ends on the same composition as the site hero.
 */
export function Intro() {
  const frame = useCurrentFrame()
  const { fps, width, height, durationInFrames: D } = useVideoConfig()
  const [fonts] = useState(() => delayRender('fonts'))
  useEffect(() => { document.fonts.ready.then(() => continueRender(fonts)) }, [fonts])

  const tall = height > width
  const s = Math.min(width, height) / 1080 // design unit: 1080 px short side
  // Safe left margin: the site plays this with object-fit: cover, which crops the sides on 16:10 and phones.
  const left = (tall ? 190 : 170) * s

  const fadeIn = interpolate(frame, [0, 24], [1, 0], clamp)
  const bars = interpolate(frame, [4, 26, D - 26, D - 6], [0, 1, 1, 0], { ...clamp, easing: Easing.inOut(Easing.cubic) })
  const push = interpolate(frame, [0, D], [1.14, 1], { easing: Easing.out(Easing.cubic) })
  const sunY = interpolate(frame, [0, D], [-70, 10], { easing: Easing.inOut(Easing.sin) })
  const tiltX = interpolate(frame, [0, D], [-26, 0], { easing: Easing.out(Easing.cubic) })
  const lit = (i: number) => interpolate(frame, [70 + (i / NEAR.length) * 50, 78 + (i / NEAR.length) * 50], [0, 0.85], clamp)

  // Location card
  const locIn = spring({ frame: frame - 22, fps, config: { damping: 200 } })
  const locOut = interpolate(frame, [80, 92], [1, 0], clamp)
  const coordP = interpolate(frame, [30, 66], [0, 1], clamp)

  // Car: rolls in from the left and parks right of centre (wide) or low centre (tall)
  const carIn = interpolate(frame, [30, 108], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) })
  const carW = (tall ? 0.95 : 0.46) * width
  const carEndX = tall ? (width - carW) / 2 : width * 0.5
  const carX = interpolate(carIn, [0, 1], [-carW * 1.1, carEndX])
  const streak = interpolate(frame, [30, 70, 108], [0.9, 0.6, 0], clamp)
  const bob = Math.sin(frame / 3) * (1 - carIn) * 2 * s

  // Name
  const words = ['VAIBHAV', 'DHIR']
  const underline = interpolate(frame, [134, 152], [0, 1], { ...clamp, easing: Easing.bezier(0.2, 0.8, 0.2, 1) })
  const roleIn = interpolate(frame, [146, 160], [0, 1], clamp)
  const nameSize = (tall ? 190 : 210) * s

  return (
    <AbsoluteFill style={{ background: colors.base, color: colors.hud, fontFamily: BODY }}>
      <AbsoluteFill style={{ transform: `scale(${push})`, transformOrigin: '70% 70%' }}>
        <style>{'svg.reel-bd { display: block; width: 100%; height: 100%; }'}</style>
        <BackdropArt className="reel-bd" frame={{ sunY, tilt: tiltX, lit }} />
      </AbsoluteFill>
      <AbsoluteFill style={{ background: 'linear-gradient(0deg, rgba(10,12,16,0.75) 0%, rgba(10,12,16,0) 40%)' }} />

      {/* Car */}
      <div style={{ position: 'absolute', left: carX, top: tall ? height * 0.58 : height * 0.56, width: carW, transform: `translateY(${bob}px)` }}>
        {[0, 1, 2].map((i) => (
          <div key={i} style={{ position: 'absolute', right: '88%', top: `${48 + i * 12}%`, width: `${60 - i * 15}%`, height: 3 * s,
            background: i === 1 ? colors.pink : colors.hud, opacity: streak * (1 - i * 0.25) }} />
        ))}
        <CarPoster className="" style={{ display: 'block', width: '100%', height: 'auto' }} />
      </div>

      {/* Location card */}
      {frame < 94 && (
        <div style={{ position: 'absolute', left, top: (tall ? 300 : 230) * s, opacity: locIn * locOut, transform: `translateX(${(1 - locIn) * -40 * s}px)` }}>
          <div style={{ fontFamily: MONO, fontSize: 20 * s, letterSpacing: '0.08em', color: colors.hud2 }}>LOCATION</div>
          <div style={{ fontFamily: DISPLAY, fontSize: 96 * s, lineHeight: 1, textTransform: 'uppercase' }}>Delhi, India</div>
          <div style={{ fontFamily: MONO, fontSize: 26 * s, color: colors.dusk, letterSpacing: '0.08em', marginTop: 10 * s }}>{decode('28.61°N  77.21°E', coordP, frame)}</div>
        </div>
      )}

      {/* Name */}
      {frame >= 108 && (
        <div style={{ position: 'absolute', left, top: (tall ? 250 : 210) * s }}>
          <div style={{ fontFamily: DISPLAY, fontSize: nameSize, lineHeight: 0.95, letterSpacing: '-0.01em', display: 'flex', flexDirection: tall ? 'column' : 'row', gap: tall ? 0 : 36 * s }}>
            {words.map((word, wi) => (
              <span key={word} style={{ display: 'flex' }}>
                {word.split('').map((ch, i) => {
                  const k = wi * words[0].length + i
                  const p = spring({ frame: frame - 108 - k * 1.6, fps, config: { damping: 16, stiffness: 170, mass: 0.6 } })
                  return <span key={i} style={{ display: 'inline-block', opacity: Math.min(1, p * 1.4), transform: `translateY(${(1 - p) * 90 * s}px)` }}>{ch}</span>
                })}
              </span>
            ))}
          </div>
          <div style={{ height: nameSize * 0.12, marginTop: 14 * s, background: `linear-gradient(90deg, ${colors.dusk}, ${colors.pink})`, transform: `scaleX(${underline})`, transformOrigin: 'left' }} />
          <div style={{ fontFamily: MONO, fontSize: 24 * s, letterSpacing: '0.08em', marginTop: 26 * s, opacity: roleIn, transform: `translateY(${(1 - roleIn) * 12 * s}px)` }}>
            FORWARD DEPLOYED ENGINEER
          </div>
        </div>
      )}

      {/* Letterbox */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 0, height: 96 * s, background: '#000', transform: `translateY(${(bars - 1) * 100}%)` }} />
      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 96 * s, background: '#000', transform: `translateY(${(1 - bars) * 100}%)` }} />

      <AbsoluteFill style={{ background: '#000', opacity: fadeIn }} />
    </AbsoluteFill>
  )
}
