import { notFound } from "next/navigation";
import { getAppData } from "@/lib/queries";
import { StudyShell } from "@/components/study-shell";
import { QuestionWorkspace } from "@/components/question-workspace";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getAppData();
  return { title: data.questions.find(q => q.id === id)?.title ?? "Question not found" };
}
export default async function QuestionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getAppData();
  if (!data.questions.some(q => q.id === id)) notFound();
  return <StudyShell data={data}><QuestionWorkspace key={id} questionId={id} /></StudyShell>;
}
