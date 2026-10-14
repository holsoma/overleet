import { getAppData } from "@/lib/queries";
import { StudyShell } from "@/components/study-shell";
import { ProgressDashboard } from "@/components/progress-dashboard";

export const dynamic = "force-dynamic";
export const metadata = { title: "Your progress" };
export default async function ProgressPage() {
  const data = await getAppData();
  return <StudyShell data={data}><ProgressDashboard /></StudyShell>;
}
