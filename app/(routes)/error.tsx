"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <main className="error-page"><span className="wordmark">OVERLEET<span className="brand-dot">.</span></span><h1>The workspace could not load</h1><p>Please try again. Your saved progress and browser drafts have not been changed.</p><div className="inline-actions"><Button onClick={reset}>Try again</Button><Button asChild variant="secondary"><Link href="/">Return to question bank</Link></Button></div></main>;
}
