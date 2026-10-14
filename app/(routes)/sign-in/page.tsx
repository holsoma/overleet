import { getAppData } from "@/lib/queries";
import { StudyShell } from "@/components/study-shell";
import { SignIn } from "@/components/sign-in";

export const dynamic = "force-dynamic";
export const metadata = { title: "Sign in" };
export default async function SignInPage() {
  const data = await getAppData();
  return <StudyShell data={data}><SignIn /></StudyShell>;
}
