import { Composition } from 'remotion'
import { Intro } from './Intro'
import { Poster } from './Poster'

export const Root = () => (
  <>
    <Composition id="Intro" component={Intro} durationInFrames={240} fps={30} width={1280} height={720} />
    <Composition id="IntroHD" component={Intro} durationInFrames={240} fps={30} width={1920} height={1080} />
    <Composition id="Poster" component={Poster} durationInFrames={1} fps={30} width={1920} height={1080} />
  </>
)
