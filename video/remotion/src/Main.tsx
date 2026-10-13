import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { FontLoader } from "./components/FontLoader";
import { Subtitles } from "./components/Subtitles";
import { SCENE_COMPONENTS } from "./scenes";
import { SCENES } from "./timeline";
import { C, f } from "./theme";

// The whole video: scenes back to back, subtitles on top.
export const Main: React.FC = () => (
  <AbsoluteFill style={{ background: C.bg }}>
    <FontLoader />
    {SCENES.map((s) => {
      const Scene = SCENE_COMPONENTS[s.id];
      return (
        <Sequence key={s.id} name={s.id} from={f(s.start)} durationInFrames={f(s.len)}>
          <Scene />
        </Sequence>
      );
    })}
    <Subtitles />
  </AbsoluteFill>
);
