import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { colours, easeOut, Frame, Reveal } from "./theme";

export const OpeningScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <Frame chapter={0}>
      <div style={{ position: "absolute", left: 136, top: 253, fontSize: 214, lineHeight: 1.02, fontWeight: 650, letterSpacing: -13 }}>
        <Reveal>Think it</Reveal>
        <Reveal delay={0.12}><span style={{ color: colours.lime }}>through.</span></Reveal>
      </div>
      <div style={{ position: "absolute", right: 152, top: 294, height: 405, width: 8, backgroundColor: colours.rule }}>
        <div style={{ width: 8, backgroundColor: colours.lime, height: interpolate(frame, [0.4 * fps, 1.5 * fps], [0, 405], easeOut) }} />
      </div>
      <div style={{ position: "absolute", left: 144, top: 794, fontSize: 52, color: colours.muted, opacity: interpolate(frame, [0.45 * fps, 0.9 * fps], [0, 1], easeOut) }}>
        Data Science interview practice.
      </div>
    </Frame>
  );
};
