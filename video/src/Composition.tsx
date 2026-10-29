import { Series, useVideoConfig } from "remotion";
import { ClosingScene } from "./ClosingScene";
import { OpeningScene } from "./OpeningScene";
import { PracticeScene } from "./PracticeScene";
import { QuestionScene } from "./QuestionScene";

export const OverleetPromo = () => {
  const { fps } = useVideoConfig();
  return (
    <Series>
      <Series.Sequence name="Think it through" durationInFrames={3 * fps} premountFor={fps}><OpeningScene /></Series.Sequence>
      <Series.Sequence name="Choose a question" durationInFrames={4 * fps} premountFor={fps}><QuestionScene /></Series.Sequence>
      <Series.Sequence name="Explain, then check" durationInFrames={4 * fps} premountFor={fps}><PracticeScene /></Series.Sequence>
      <Series.Sequence name="Start practising" durationInFrames={4 * fps} premountFor={fps}><ClosingScene /></Series.Sequence>
    </Series>
  );
};
