import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return <main className="error-page"><span className="eyebrow">QUESTION NOT FOUND</span><h1>This question is not in the bank</h1><p>Check the link, or choose another question to practise.</p><Button asChild><Link href="/">Return to question bank</Link></Button></main>;
}
