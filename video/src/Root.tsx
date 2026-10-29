import { Composition, Folder } from "remotion";
import { ClosingScene } from "./ClosingScene";
import { OverleetPromo } from "./Composition";
import { OpeningScene } from "./OpeningScene";
import { PracticeScene } from "./PracticeScene";
import { QuestionScene } from "./QuestionScene";

export const RemotionRoot = () => (
  <>
    <Composition id="OverleetPromo" component={OverleetPromo} durationInFrames={450} fps={30} width={1920} height={1080} />
    <Folder name="Scenes">
      <Composition id="Opening" component={OpeningScene} durationInFrames={90} fps={30} width={1920} height={1080} />
      <Composition id="ChooseQuestion" component={QuestionScene} durationInFrames={120} fps={30} width={1920} height={1080} />
      <Composition id="ExplainAndCheck" component={PracticeScene} durationInFrames={120} fps={30} width={1920} height={1080} />
      <Composition id="StartPractising" component={ClosingScene} durationInFrames={120} fps={30} width={1920} height={1080} />
    </Folder>
  </>
);
