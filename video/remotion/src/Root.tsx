import React from "react";
import { Composition } from "remotion";
import { FontLoader } from "./components/FontLoader";
import { Main } from "./Main";
import { SCENE_COMPONENTS } from "./scenes";
import { SCENES, TOTAL_LEN } from "./timeline";
import { f, FPS, H, W } from "./theme";

const SceneOnly: React.FC<{ id: string }> = ({ id }) => {
  const Scene = SCENE_COMPONENTS[id];
  return (
    <>
      <FontLoader />
      <Scene />
    </>
  );
};

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Main" component={Main} durationInFrames={f(TOTAL_LEN)} fps={FPS} width={W} height={H} />
    {/* Each scene alone, for quick previews in the Studio (no subtitles). */}
    {SCENES.map((s) => (
      <Composition key={s.id} id={s.id} component={SceneOnly} defaultProps={{ id: s.id }} durationInFrames={f(s.len)} fps={FPS} width={W} height={H} />
    ))}
  </>
);
