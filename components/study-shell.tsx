"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signIn, signOut } from "next-auth/react";
import { ArrowUpRight, BookOpen, ChartNoAxesColumnIncreasing, CheckCheck, ChevronRight, Github, ListFilter, LogOut, X } from "lucide-react";
import { useState } from "react";
import type { AppData } from "@/lib/contracts";
import { Button } from "./ui/button";
import { StudyProvider, useStudy } from "./study-provider";

export function StudyShell({ data, children }: { data: AppData; children: React.ReactNode }) {
  return <StudyProvider data={data} key={data.viewer?.id ?? "guest"}><ShellContents>{children}</ShellContents></StudyProvider>;
}
function ShellContents({ children }: { children: React.ReactNode }) {
  const { data, progress, error, mergeFailed, merging, clearError, retryMerge } = useStudy();
  const path = usePathname();
  const [authNotice, setAuthNotice] = useState<string | null>(null);
  const [authBusy, setAuthBusy] = useState(false);
  const activeQuestions = data.questions.filter(q => q.active);
  const completed = activeQuestions.filter(q => progress[q.id] === "completed").length;
  async function authenticate() {
    if (!data.authConfigured) { setAuthNotice("GitHub sign-in is not configured. Add GITHUB_ID, GITHUB_SECRET and NEXTAUTH_SECRET to your local environment as described in the README, then restart the app. You can practise as a guest now."); return; }
    setAuthBusy(true);
    try { await signIn("github", { callbackUrl: window.location.pathname + window.location.search }); }
    catch { setAuthNotice("GitHub sign-in could not start. Check your connection and try again."); setAuthBusy(false); }
  }
  return <div className="app-shell">
    <a className="skip-link" href="#main">Skip to content</a>
    <aside className="sidebar" aria-label="Main navigation">
      <Link className="wordmark" href="/" aria-label="OVERLEET home"><span className="brand-symbol" aria-hidden="true">o/</span>OVERLEET<span className="brand-dot">.</span></Link>
      <div className="sidebar-section-label">YOUR WORKSPACE</div>
      <nav className="navigation">
        <Link href="/" className={path !== "/progress" ? "nav-link active" : "nav-link"} aria-current={path !== "/progress" ? "page" : undefined}><BookOpen size={18} aria-hidden="true" />Question bank<span className="nav-count">{activeQuestions.length}</span></Link>
        <Link href="/progress" className={path === "/progress" ? "nav-link active" : "nav-link"} aria-current={path === "/progress" ? "page" : undefined}><ChartNoAxesColumnIncreasing size={18} aria-hidden="true" />Your progress</Link>
      </nav>
      <div className="sidebar-progress"><span className="sidebar-section-label">KEEP THINKING</span><p><strong>{completed}</strong><span> / {activeQuestions.length} completed</span></p><progress max={Math.max(activeQuestions.length, 1)} value={completed} aria-label={`${completed} of ${activeQuestions.length} questions completed`} /><p className="small muted">One clear explanation at a time.</p></div>
      <div className="sidebar-footer"><span className="footer-mark"><CheckCheck size={15} aria-hidden="true" />Original answers. Cited sources.</span><span className="small muted">Built for deliberate practice.</span></div>
    </aside>
    <div className="main-column">
      <header className="topbar"><div className="breadcrumb"><span>Workspace</span><ChevronRight size={13} aria-hidden="true" /><span>{path === "/progress" ? "Your progress" : path.startsWith("/questions/") ? "Practice" : "Question bank"}</span></div>
        <div className="account-controls">{data.viewer ? <><span className="account-name">{data.viewer.name || "Your account"}</span><Button variant="ghost" size="sm" onClick={() => void signOut({ callbackUrl: "/" })}><LogOut size={15} aria-hidden="true" />Sign out</Button></> : <><span className="guest-label">Guest workspace</span><Button variant="secondary" size="sm" onClick={() => void authenticate()} disabled={authBusy}><Github size={15} aria-hidden="true" />{authBusy ? "Connecting…" : "Sign in"}</Button></>}</div>
      </header>
      <main id="main" className="main-content">
        {authNotice && <div role="status" className="notice"><Github size={18} aria-hidden="true" /><p>{authNotice}</p><Button variant="ghost" size="icon" aria-label="Dismiss sign-in information" onClick={() => setAuthNotice(null)}><X size={16} /></Button></div>}
        {!data.databaseAvailable && <div className="notice quiet-notice"><ListFilter size={17} aria-hidden="true" /><p>The question bank is available. Account progress and votes need a database connection. Guest progress stays in this browser.</p></div>}
        {merging && <p role="status" className="inline-status">Importing guest progress. Existing account progress takes priority.</p>}
        {error && <div role="alert" className="notice error-notice"><p>{error}</p>{mergeFailed && <Button variant="secondary" size="sm" onClick={retryMerge}>Retry guest import</Button>}<Button variant="ghost" size="icon" aria-label="Dismiss error" onClick={clearError}><X size={16} /></Button></div>}
        {children}
      </main>
      <footer className="page-footer"><span>Reason first. Check your understanding.</span><Link href="/progress">Your practice history <ArrowUpRight size={13} aria-hidden="true" /></Link></footer>
    </div>
  </div>;
}
