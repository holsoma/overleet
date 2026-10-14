"use client";

import Link from "next/link";
import { ArrowRight, BookOpen, Check, RotateCcw } from "lucide-react";
import { categories, categoryLabels } from "@/lib/question-schema";
import { useStudy } from "./study-provider";
import { Button } from "./ui/button";
import { Difficulty } from "./question-labels";

export function ProgressDashboard() {
  const { data, progress } = useStudy();
  const questions = data.questions.filter(q => q.active);
  const completed = questions.filter(q => progress[q.id] === "completed");
  const review = questions.filter(q => progress[q.id] === "review_later");
  const unseen = questions.length - completed.length - review.length;
  return <>
    <div className="page-heading"><div><span className="eyebrow">MAKE THE REASONING STICK</span><h1>Your progress<span className="heading-dot">.</span></h1><p>{data.viewer ? "Your completion status is saved to your account." : "Your progress is saved in this browser. Sign in to use it across devices."}</p></div></div>
    <dl className="progress-overview"><div><dt><Check size={17} aria-hidden="true" />Completed</dt><dd>{completed.length}<span> / {questions.length}</span></dd><Link href="/?status=completed">View completed<ArrowRight size={13} aria-hidden="true" /></Link></div><div><dt><RotateCcw size={17} aria-hidden="true" />Needs review</dt><dd>{review.length}</dd><Link href="/?status=review_later">Open review list<ArrowRight size={13} aria-hidden="true" /></Link></div><div><dt><BookOpen size={17} aria-hidden="true" />Still to explore</dt><dd>{unseen}</dd><Link href="/?status=unseen">Find a question<ArrowRight size={13} aria-hidden="true" /></Link></div></dl>
    <section className="topic-progress" aria-labelledby="topic-progress-heading"><div className="section-toolbar"><h2 id="topic-progress-heading">A little progress in every topic</h2><span className="small muted">Completed / available</span></div>{categories.map(category => { const topic = questions.filter(q => q.category === category); const count = topic.filter(q => progress[q.id] === "completed").length; return <div className="topic-row" key={category}><Link href={`/?category=${category}`}>{categoryLabels[category]}</Link><progress value={count} max={Math.max(topic.length, 1)} aria-label={`${categoryLabels[category]}: ${count} of ${topic.length} completed`} /><span>{count}<span className="muted"> / {topic.length}</span></span><ArrowRight size={15} aria-hidden="true" /></div>; })}</section>
    <section className="review-section" aria-labelledby="review-heading"><div className="section-toolbar"><h2 id="review-heading">Come back to these <span className="count-label">{review.length}</span></h2></div>{review.length ? <ul className="review-list">{review.map(q => <li key={q.id}><div><Link href={`/questions/${q.id}`}>{q.title}</Link><span className="small muted">{categoryLabels[q.category]}</span></div><Difficulty value={q.difficulty} /><Link href={`/questions/${q.id}`} className="review-link" aria-label={`Practise ${q.title}`}><ArrowRight size={17} aria-hidden="true" /></Link></li>)}</ul> : <div className="empty-state compact"><RotateCcw size={25} aria-hidden="true" /><h3>Your review list is clear</h3><p>Choose “Review later” on a question when you want to revisit its reasoning.</p><Button asChild variant="secondary"><Link href="/">Explore the question bank</Link></Button></div>}</section>
    <p className="table-footnote">Counts include active questions. Retired questions keep their saved progress and original links.</p>
  </>;
}
