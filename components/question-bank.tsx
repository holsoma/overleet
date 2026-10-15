"use client";

import Link from "next/link";
import { useRef } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowDownWideNarrow, ArrowRight, ArrowUpRight, Check, Search, Sun, X } from "lucide-react";
import { categories, categoryLabels, difficulties, statuses, statusLabels } from "@/lib/question-schema";
import { questionFiltersSchema } from "@/lib/contracts";
import { Button } from "./ui/button";
import { useStudy } from "./study-provider";
import { Difficulty, Status } from "./question-labels";

export function QuestionBank() {
  const { data, progress, popularity } = useStudy();
  const params = useSearchParams();
  const parsed = questionFiltersSchema.safeParse(Object.fromEntries(params.entries()));
  const filters = parsed.success ? parsed.data : questionFiltersSchema.parse({});
  const resultsRef = useRef<HTMLDivElement>(null);
  const active = data.questions.filter(q => q.active);
  const daily = data.questions.find(q => q.id === data.dailyQuestionId);
  const completed = active.filter(q => progress[q.id] === "completed").length;
  const companies = [...new Set(active.flatMap(q => q.companyTags))].sort();
  const sources = [...new Set(active.flatMap(q => q.sources.map(source => source.name)))].sort();
  const difficultyOrder = { easy: 0, medium: 1, hard: 2 };
  const questions = active.filter(q => (!filters.q || q.title.toLowerCase().includes(filters.q.toLowerCase())) && (!filters.category || q.category === filters.category) && (!filters.difficulty || q.difficulty === filters.difficulty) && (!filters.company || q.companyTags.includes(filters.company)) && (!filters.source || q.sources.some(s => s.name === filters.source)) && (!filters.status || (progress[q.id] ?? "unseen") === filters.status))
    .sort((a, b) => (filters.sort === "difficulty" ? difficultyOrder[a.difficulty] - difficultyOrder[b.difficulty] : filters.sort === "title" ? a.title.localeCompare(b.title, "en") : (popularity[b.id] ?? 0) - (popularity[a.id] ?? 0)) || a.id.localeCompare(b.id, "en"));
  const hasFilters = [filters.q, filters.category, filters.difficulty, filters.company, filters.source, filters.status].some(Boolean);
  const pageSize = 25;
  const pageCount = Math.max(1, Math.ceil(questions.length / pageSize));
  const currentPage = Math.min(filters.page, pageCount);
  const startIndex = (currentPage - 1) * pageSize;
  const visibleQuestions = questions.slice(startIndex, startIndex + pageSize);
  function updateFilter(key: string, value: string) {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value); else next.delete(key);
    next.delete("page");
    window.history.replaceState(null, "", next.size ? `/?${next}` : "/");
  }
  function clearFilters() { window.history.replaceState(null, "", "/"); }
  function changePage(page: number) {
    const next = new URLSearchParams(params.toString());
    if (page > 1) next.set("page", String(page)); else next.delete("page");
    window.history.pushState(null, "", next.size ? `/?${next}` : "/");
    requestAnimationFrame(() => {
      resultsRef.current?.focus({ preventScroll: true });
      resultsRef.current?.scrollIntoView({ block: "start", behavior: "instant" });
    });
  }
  return <>
    <div className="page-heading"><div><span className="eyebrow">THEORY INTO PRACTICE</span><h1>Question bank<span className="heading-dot">.</span></h1><p>Go beyond the right answer. Explain why it works.</p></div><div className="completion-summary"><span className="completion-icon"><Check size={18} aria-hidden="true" /></span><strong>{completed}<span> / {active.length}</span></strong><span className="small muted">completed</span></div></div>
    {daily && <section className="daily-strip" aria-labelledby="daily-title"><div className="daily-icon"><Sun size={21} aria-hidden="true" /></div><div className="daily-label"><span className="eyebrow">A LITTLE EVERY DAY</span><h2 id="daily-title">Daily question</h2><span className="small muted">Resets at 00:00 UTC</span></div><div className="daily-question"><Link href={`/questions/${daily.id}`}>{daily.title}</Link><div className="inline-meta"><span>{categoryLabels[daily.category]}</span><span aria-hidden="true">·</span><Difficulty value={daily.difficulty} /></div></div><Button asChild size="sm"><Link href={`/questions/${daily.id}`}>Give it a go<ArrowRight size={15} aria-hidden="true" /></Link></Button></section>}
    <section className="bank-section" aria-labelledby="all-questions-title">
      <div className="section-toolbar"><h2 id="all-questions-title">All questions <span className="count-label">{active.length}</span></h2><label className="search-field"><Search size={17} aria-hidden="true" /><span className="sr-only">Search questions</span><input type="search" placeholder="Search questions…" value={filters.q ?? ""} maxLength={200} onChange={event => updateFilter("q", event.target.value)} /></label></div>
      <div className="filters" aria-label="Question filters">
        <label>Topic<select value={filters.category ?? ""} onChange={e => updateFilter("category", e.target.value)}><option value="">All topics</option>{categories.map(category => <option key={category} value={category}>{categoryLabels[category]}</option>)}</select></label>
        <label>Difficulty<select value={filters.difficulty ?? ""} onChange={e => updateFilter("difficulty", e.target.value)}><option value="">Any difficulty</option>{difficulties.map(d => <option key={d} value={d}>{d[0].toUpperCase() + d.slice(1)}</option>)}</select></label>
        <label>Status<select value={filters.status ?? ""} onChange={e => updateFilter("status", e.target.value)}><option value="">All statuses</option>{statuses.map(status => <option key={status} value={status}>{statusLabels[status]}</option>)}</select></label>
        <label>Source<select value={filters.source ?? ""} onChange={e => updateFilter("source", e.target.value)}><option value="">All sources</option>{sources.map(source => <option key={source}>{source}</option>)}</select></label>
        <label>Company<select value={filters.company ?? ""} onChange={e => updateFilter("company", e.target.value)}><option value="">All companies</option>{companies.map(company => <option key={company}>{company}</option>)}</select></label>
        <label className="sort-control"><span><ArrowDownWideNarrow size={13} aria-hidden="true" />Sort by</span><select value={filters.sort} onChange={e => updateFilter("sort", e.target.value)}><option value="popularity">Most voted</option><option value="difficulty">Difficulty</option><option value="title">Title</option></select></label>
      </div>
      <div className="results-line"><p aria-live="polite" id="question-results-count">{questions.length > pageSize ? `Showing ${startIndex + 1} to ${startIndex + visibleQuestions.length} of ${questions.length} questions${hasFilters ? " matching your filters" : ""}` : `${questions.length} ${questions.length === 1 ? "question" : "questions"}${hasFilters ? " match your filters" : " to think through"}`}</p>{hasFilters && <Button variant="ghost" size="sm" onClick={clearFilters}><X size={13} aria-hidden="true" />Clear filters</Button>}</div>
      {questions.length ? <div className="table-scroll" ref={resultsRef} tabIndex={-1} role="region" aria-label="Question results" aria-describedby="question-results-count"><table className="question-table"><caption className="sr-only">Interview practice questions</caption><thead><tr><th scope="col" className="number-cell">#</th><th scope="col">Question</th><th scope="col">Difficulty</th><th scope="col">Status</th><th scope="col" className="votes-cell">Votes</th></tr></thead><tbody>{visibleQuestions.map((q, index) => <tr key={q.id}><td className="number-cell">{String(startIndex + index + 1).padStart(2, "0")}</td><td><Link className="question-link" href={`/questions/${q.id}`} data-question-link>{q.title}<ArrowUpRight size={14} aria-hidden="true" /></Link><div className="row-meta"><span>{categoryLabels[q.category]}</span><span aria-hidden="true">·</span><span>{q.sources[0]?.name}</span>{q.companyTags.map(company => <span key={company} className="company-tag">{company}</span>)}</div></td><td><Difficulty value={q.difficulty} /></td><td><Status value={progress[q.id] ?? "unseen"} /></td><td className="votes-cell">{popularity[q.id] ?? 0}</td></tr>)}</tbody></table></div> : <div className="empty-state"><Search size={27} aria-hidden="true" /><h3>No questions match these filters</h3><p>Try another topic or remove a filter to see more questions.</p><Button variant="secondary" onClick={clearFilters}>Clear filters</Button></div>}
      {pageCount > 1 && <nav className="question-pagination" aria-label="Question pages"><span>Page {currentPage} of {pageCount}</span><div><Button variant="secondary" size="sm" disabled={currentPage === 1} onClick={() => changePage(currentPage - 1)}>Previous</Button><Button variant="secondary" size="sm" disabled={currentPage === pageCount} onClick={() => changePage(currentPage + 1)}>Next</Button></div></nav>}
      <p className="table-footnote">Curated practice, with original answers and cited references. Company labels appear only where a source supports them.</p>
    </section>
  </>;
}
