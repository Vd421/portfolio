import { Composition } from 'remotion'
import { Intro } from './Intro'

export const Root = () => (
  <>
    <Composition id="Intro" component={Intro} durationInFrames={180} fps={30} width={1280} height={720} />
    <Composition id="IntroTall" component={Intro} durationInFrames={180} fps={30} width={720} height={1280} />
  </>
)
