// Loaded after first paint: GSAP with its scroll plugins, and Lenis.
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { CustomEase } from 'gsap/CustomEase'
import Lenis from 'lenis'
import { ease, gsapEase } from './motion-config'

gsap.registerPlugin(ScrollTrigger, SplitText, CustomEase)
// The config's cubic-beziers, available to GSAP by name.
CustomEase.create(gsapEase.out, ease.out.join(','))
CustomEase.create(gsapEase.underline, ease.underline.join(','))
CustomEase.create(gsapEase.inOut, ease.inOut.join(','))

export { gsap, ScrollTrigger, SplitText, Lenis }
