import "@fontsource-variable/noto-sans-tc";
import { useEffect, useState } from "react";
import { continueRender, delayRender } from "remotion";
import { ALL_TEXT } from "../copy";

// The font is split into many small files by Unicode range. Load every range the
// video uses before the first frame is captured, so no frame falls back to
// another font.
export const FontLoader: React.FC = () => {
  const [handle] = useState(() => delayRender("Loading Noto Sans TC"));
  useEffect(() => {
    const weights = [400, 500, 700, 900];
    Promise.all(weights.map((w) => document.fonts.load(`${w} 48px "Noto Sans TC Variable"`, ALL_TEXT)))
      .then(() => document.fonts.ready)
      .then(() => continueRender(handle))
      .catch((err) => {
        console.error(err);
        continueRender(handle);
      });
  }, [handle]);
  return null;
};
