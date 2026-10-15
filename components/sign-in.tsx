"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { Github } from "lucide-react";
import { useStudy } from "./study-provider";
import { Button } from "./ui/button";

export function SignIn() {
  const { data } = useStudy();
  const params = useSearchParams();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const callback = params.get("callbackUrl");
  const callbackUrl = callback?.startsWith("/") && !callback.startsWith("//") ? callback : "/";
  async function connect() {
    setBusy(true); setFailed(false);
    try { await signIn("github", { callbackUrl }); }
    catch { setFailed(true); setBusy(false); }
  }
  return <section className="sign-in-section"><span className="eyebrow">YOUR PRACTICE, ACROSS DEVICES</span><h1>Sign in with GitHub</h1><p>Save completion status to your account and vote on useful questions. Your written answers and self-checks stay in this browser.</p>{data.authConfigured ? <>{(params.has("error") || failed) && <p className="notice error-notice" role="alert">GitHub sign-in did not complete. Try again, or continue practising as a guest.</p>}<Button onClick={() => void connect()} disabled={busy}><Github size={16} aria-hidden="true" />{busy ? "Connecting…" : "Continue with GitHub"}</Button></> : <div className="notice"><p>GitHub sign-in is not configured for this installation. You can practise as a guest.</p></div>}<p className="sign-in-merge-note">When you sign in, guest statuses are imported where your account has no saved status. Existing account progress takes priority.</p><Link href="/" className="back-link">Continue as a guest</Link></section>;
}
