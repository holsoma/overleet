import { getAppData } from "@/lib/queries";
import { StudyShell } from "@/components/study-shell";
import { QuestionBank } from "@/components/question-bank";

export const dynamic = "force-dynamic";
export default async function HomePage() {
  const data = await getAppData();
  return <StudyShell data={data}><QuestionBank /></StudyShell>;
}
