import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Arrow, colours, easeOut, Frame, mono, Reveal } from "./theme";

export const ClosingScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <Frame chapter={3}>
      <div style={{ position: "absolute", left: 132, top: 242, fontFamily: mono, fontSize: 210, fontWeight: 700, lineHeight: 1.1, letterSpacing: -12 }}><Reveal>OVERLEET<span style={{ color: colours.lime }}>.</span></Reveal></div>
      <div style={{ position: "absolute", left: 144, top: 514, fontSize: 69, lineHeight: 1.25, letterSpacing: -2, opacity: interpolate(frame, [0.2 * fps, 0.6 * fps], [0, 1], easeOut) }}>Practise for your next interview.</div>
      <div style={{ position: "absolute", left: 144, top: 642, fontSize: 38, color: colours.muted, opacity: interpolate(frame, [0.4 * fps, 0.8 * fps], [0, 1], easeOut) }}>Sourced explanations. Guest study. Self-check rubrics.</div>
      <div style={{ position: "absolute", left: 144, right: 144, top: 782, borderTop: `1px solid ${colours.rule}`, paddingTop: 33, display: "flex", alignItems: "center", justifyContent: "space-between", opacity: interpolate(frame, [0.55 * fps, 1.0 * fps], [0, 1], easeOut) }}>
        <div style={{ fontFamily: mono, fontSize: 63, color: colours.lime, letterSpacing: -2 }}>overleet.vercel.app</div>
        <Arrow size={72} />
      </div>
    </Frame>
  );
};
