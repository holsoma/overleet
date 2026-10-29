import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { colours, easeOut, Frame, Reveal } from "./theme";

const Check = ({ children, delay }: { children: string; delay: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 22, marginTop: 28, opacity: interpolate(frame, [delay * fps, (delay + 0.2) * fps], [0.25, 1], easeOut) }}>
      <div style={{ width: 42, height: 42, border: `2px solid ${colours.lime}`, display: "flex", justifyContent: "center", alignItems: "center", flexShrink: 0 }}>
        <svg width="28" height="28" viewBox="0 0 30 30" fill="none" aria-hidden="true"><path d="M4 15L12 23L26 7" stroke={colours.lime} strokeWidth="3" strokeDasharray="38" strokeDashoffset={interpolate(frame, [delay * fps, (delay + 0.35) * fps], [38, 0], easeOut)} /></svg>
      </div>
      <span style={{ fontSize: 43 }}>{children}</span>
    </div>
  );
};

export const PracticeScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const answer = "A simpler model may reduce variance, but increase bias.";
  const characters = Math.floor(interpolate(frame, [0.55 * fps, 1.65 * fps], [0, answer.length], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  return (
    <Frame chapter={2}>
      <div style={{ position: "absolute", left: 138, top: 216, fontSize: 136, fontWeight: 650, lineHeight: 1.12, letterSpacing: -7 }}><Reveal>Explain. Then check.</Reveal></div>
      <div style={{ position: "absolute", left: 144, top: 428, width: 750, borderTop: `1px solid ${colours.rule}`, paddingTop: 32 }}>
        <div style={{ color: colours.muted, fontSize: 31 }}>YOUR ANSWER</div>
        <div style={{ fontSize: 58, fontWeight: 500, letterSpacing: -1.5, marginTop: 26, lineHeight: 1.28, minHeight: 230 }}>{answer.slice(0, characters)}<span style={{ display: "inline-block", marginLeft: 5, width: 4, height: 53, backgroundColor: colours.lime, opacity: frame < 1.8 * fps ? 1 : 0, verticalAlign: "middle" }} /></div>
        <div style={{ marginTop: 32, color: colours.lime, fontSize: 38, opacity: interpolate(frame, [1.65 * fps, 1.95 * fps], [0, 1], easeOut) }}>Reveal the explanation →</div>
      </div>
      <div style={{ position: "absolute", left: 1036, top: 428, width: 740, borderTop: `1px solid ${colours.lime}`, paddingTop: 32, opacity: interpolate(frame, [1.7 * fps, 2.0 * fps], [0, 1], easeOut), translate: interpolate(frame, [1.7 * fps, 2.15 * fps], ["30px 0px", "0px 0px"], easeOut) }}>
        <div style={{ color: colours.lime, fontSize: 31 }}>CHECK YOUR REASONING</div>
        <Check delay={2.0}>Identify the trade-off</Check>
        <Check delay={2.35}>State your assumptions</Check>
        <Check delay={2.7}>Use validation data</Check>
      </div>
    </Frame>
  );
};
