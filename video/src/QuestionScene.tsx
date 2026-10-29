import { interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Arrow, colours, easeOut, Frame, mono, Reveal } from "./theme";

const QuestionRow = ({ number, title, topic, delay, selected = false }: { number: string; title: string; topic: string; delay: number; selected?: boolean }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const selectedOpacity = selected ? interpolate(frame, [1.4 * fps, 1.7 * fps], [0, 1], easeOut) : 0;
  return (
    <div style={{ position: "relative", display: "flex", alignItems: "center", height: 150, borderTop: `1px solid ${colours.rule}`, opacity: interpolate(frame, [delay * fps, (delay + 0.4) * fps], [0, 1], easeOut), translate: interpolate(frame, [delay * fps, (delay + 0.55) * fps], ["0px 28px", "0px 0px"], easeOut) }}>
      <div style={{ position: "absolute", inset: 0, backgroundColor: colours.lime, opacity: selectedOpacity }} />
      <div style={{ position: "relative", display: "flex", alignItems: "center", width: "100%", padding: "0 34px", color: selected && frame >= 1.5 * fps ? colours.background : colours.text }}>
        <span style={{ width: 95, fontFamily: mono, fontSize: 30, opacity: 0.65 }}>{number}</span>
        <span style={{ flex: 1, fontSize: 51, fontWeight: 500, letterSpacing: -1.4 }}>{title}</span>
        <span style={{ width: 300, fontSize: 32, opacity: 0.8 }}>{topic}</span>
        <div style={{ opacity: selectedOpacity }}><Arrow size={46} colour={colours.background} /></div>
      </div>
    </div>
  );
};

export const QuestionScene = () => (
  <Frame chapter={1}>
    <div style={{ position: "absolute", left: 138, top: 216, fontSize: 140, fontWeight: 650, lineHeight: 1.12, letterSpacing: -7 }}>
      <Reveal>Choose a question.</Reveal>
    </div>
    <div style={{ position: "absolute", left: 144, right: 144, top: 426, borderBottom: `1px solid ${colours.rule}` }}>
      <QuestionRow number="01" title="Bias or variance?" topic="ML Theory" delay={0.2} selected />
      <QuestionRow number="02" title="What does a p-value tell you?" topic="Statistics" delay={0.3} />
      <QuestionRow number="03" title="When should a test stop?" topic="A/B Testing" delay={0.4} />
    </div>
    <div style={{ position: "absolute", left: 178, top: 911, fontSize: 30, color: colours.muted }}>Browse by topic and difficulty.</div>
  </Frame>
);
