"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, ArrowUp, ArrowUpRight, Check, ChevronDown, ChevronUp, Eye, FileText, RotateCcw } from "lucide-react";
import { categoryLabels } from "@/lib/question-schema";
import { useStudy } from "./study-provider";
import { useStoredString, workspaceKey } from "./browser-storage";
import { QuestionMarkdown } from "./markdown";
import { Difficulty, Status } from "./question-labels";
import { Button } from "./ui/button";

function parseWorkspace(raw: string | null): { answer: string; checks: number[] } {
  try {
    const value: unknown = JSON.parse(raw ?? "{}");
    if (!value || typeof value !== "object") return { answer: "", checks: [] };
    const data = value as { answer?: unknown; checks?: unknown };
    return { answer: typeof data.answer === "string" ? data.answer.slice(0, 50000) : "", checks: Array.isArray(data.checks) ? data.checks.filter((n): n is number => Number.isInteger(n) && n >= 0 && n < 4) : [] };
  } catch { return { answer: "", checks: [] }; }
}

export function QuestionWorkspace({ questionId }: { questionId: string }) {
  const { data, progress, votes, popularity, saveProgress, vote, busy, merging } = useStudy();
  const question = data.questions.find(q => q.id === questionId)!;
  const [raw, writeWorkspace] = useStoredString(workspaceKey(data.viewer?.id, questionId));
  const workspace = useMemo(() => parseWorkspace(raw), [raw]);
  const [temporaryDraft, setTemporaryDraft] = useState<string | null>(null);
  const [temporaryChecks, setTemporaryChecks] = useState<number[] | null>(null);
  const [storageError, setStorageError] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [sourcesOpen, setSourcesOpen] = useState(true);
  const [feedback, setFeedback] = useState("");
  const answer = temporaryDraft ?? workspace.answer;
  const checks = temporaryChecks ?? workspace.checks;
  const status = progress[questionId] ?? "unseen";
  const voted = votes.includes(questionId);
  const disabled = busy === questionId || merging;
  const remaining = data.questions.filter(q => q.active && q.id !== questionId && progress[q.id] !== "completed").sort((a, b) => a.id.localeCompare(b.id));
  function saveDraft(nextAnswer: string, nextChecks: number[]) {
    const saved = writeWorkspace(JSON.stringify({ answer: nextAnswer, checks: nextChecks }));
    setStorageError(!saved);
    setTemporaryDraft(saved ? null : nextAnswer);
    setTemporaryChecks(saved ? null : nextChecks);
  }
  async function changeStatus(next: "unseen" | "completed" | "review_later") {
    setFeedback("");
    if (await saveProgress(questionId, next)) setFeedback(next === "completed" ? "Marked as completed." : next === "review_later" ? "Added to your review list." : "Reset to unseen. Your draft is unchanged.");
  }
  return <>
    <Link href="/" className="back-link"><ArrowLeft size={15} aria-hidden="true" />Back to question bank</Link>
    <div className="workspace-heading"><div className="inline-meta"><span>{categoryLabels[question.category]}</span><span aria-hidden="true">/</span><Difficulty value={question.difficulty} />{!question.active && <span className="retired-label">Retired question</span>}</div><h1>{question.title}</h1><div className="workspace-meta"><Status value={status} /><Button variant="ghost" size="sm" aria-label={`${voted ? "Remove vote" : "Vote for this question"}, ${popularity[questionId] ?? 0} votes`} aria-pressed={voted} disabled={disabled} onClick={() => void vote(questionId, !voted)}><ArrowUp size={15} aria-hidden="true" />{popularity[questionId] ?? 0}<span>{voted ? "Voted" : "votes"}</span></Button>{!data.viewer && <span className="small muted">Sign in to vote</span>}</div></div>
    <div className="practice-columns">
      <section className="question-pane" aria-labelledby="prompt-heading"><div className="pane-heading"><span className="step-number">01</span><h2 id="prompt-heading">The question</h2></div><QuestionMarkdown>{question.questionMarkdown}</QuestionMarkdown><div className="thinking-note"><FileText size={17} aria-hidden="true" /><p>Start with your assumptions. Explain the reasoning, then consider where it might fail.</p></div>
        <div className="sources-section"><button className="disclosure-button" aria-expanded={sourcesOpen} aria-controls="question-sources" onClick={() => setSourcesOpen(!sourcesOpen)}><span>Sources &amp; attribution <span className="count-label">{question.sources.length}</span></span>{sourcesOpen ? <ChevronUp size={17} aria-hidden="true" /> : <ChevronDown size={17} aria-hidden="true" />}</button><div id="question-sources" hidden={!sourcesOpen}><ul className="source-list">{question.sources.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.name}<ArrowUpRight size={13} aria-hidden="true" /></a><p>{source.reuse}</p><span className="small muted">Accessed {source.accessedAt}</span></li>)}</ul></div></div>
      </section>
      <section className="response-pane" aria-labelledby="response-heading"><div className="pane-heading"><span className="step-number">02</span><h2 id="response-heading">Think it through</h2><span className="small muted draft-state">{storageError ? "Not saved" : "Saved in this browser"}</span></div><label htmlFor="practice-answer" className="sr-only">Your answer</label><textarea id="practice-answer" className="answer-editor" placeholder="Write your explanation here. What would you say in an interview?" value={answer} maxLength={50000} onChange={e => saveDraft(e.target.value, checks)} aria-describedby="draft-note" /><div className="editor-footer"><p id="draft-note">Your draft stays in this browser{data.viewer ? ", under your account" : ""}.</p><span>{answer.trim() ? answer.trim().split(/\s+/).length : 0} words</span></div>{storageError && <p role="alert" className="field-error">Browser storage is unavailable. Your answer is kept on this page only. Copy it before leaving.</p>}
        <div className="reveal-control"><p>{revealed ? "Compare the reasoning, not just the conclusion." : "Ready to compare your reasoning?"}</p><Button variant={revealed ? "secondary" : "default"} onClick={() => setRevealed(!revealed)} aria-expanded={revealed} aria-controls="model-answer"><Eye size={16} aria-hidden="true" />{revealed ? "Hide model answer" : "Reveal model answer"}</Button></div>
      </section>
    </div>
    <section id="model-answer" hidden={!revealed} className="model-answer" aria-labelledby="model-answer-heading">
      {revealed && <><div className="pane-heading"><span className="step-number">03</span><h2 id="model-answer-heading">Check your understanding</h2></div><div className="answer-columns"><div><div className="short-answer"><span className="eyebrow">THE SHORT ANSWER</span><QuestionMarkdown>{question.tldrAnswer}</QuestionMarkdown></div><h3 className="reasoning-title">The reasoning</h3><QuestionMarkdown>{question.detailedAnswerMarkdown}</QuestionMarkdown></div><aside className="rubric" aria-labelledby="rubric-heading"><h3 id="rubric-heading">Did you cover these points?</h3><p className="small muted">Use these checkpoints to assess your own explanation.</p><div className="checklist">{question.keyTakeaways.map((takeaway, index) => <label className="checklist-item" key={takeaway}><input type="checkbox" checked={checks.includes(index)} onChange={e => saveDraft(answer, e.target.checked ? [...checks, index] : checks.filter(n => n !== index))} /><QuestionMarkdown inline>{takeaway}</QuestionMarkdown></label>)}</div><span className="small muted">{checks.filter(n => n < question.keyTakeaways.length).length} of {question.keyTakeaways.length} checked. Saved in this browser.</span></aside></div></>}
    </section>
    <section className="progress-actions" aria-label="Record your progress"><div><h2>Where are you with this one?</h2><p>{data.viewer ? "Status is saved to your account." : "Status is saved in this browser. Sign in to carry it across devices."}</p></div><div className="progress-buttons"><Button variant={status === "completed" ? "default" : "secondary"} disabled={disabled} aria-pressed={status === "completed"} onClick={() => void changeStatus("completed")}><Check size={16} aria-hidden="true" />{status === "completed" ? "Completed" : "Mark completed"}</Button><Button variant="secondary" disabled={disabled} aria-pressed={status === "review_later"} onClick={() => void changeStatus("review_later")}><RotateCcw size={15} aria-hidden="true" />Review later</Button><Button variant="ghost" size="sm" disabled={disabled || status === "unseen"} onClick={() => void changeStatus("unseen")}>Reset to unseen</Button></div></section>
    <div className="workspace-bottom"><p role="status" className="save-feedback">{disabled ? "Saving…" : feedback}</p>{remaining[0] && <Link href={`/questions/${remaining[0].id}`}>Try another question<ArrowRight size={15} aria-hidden="true" /></Link>}</div>
  </>;
}
