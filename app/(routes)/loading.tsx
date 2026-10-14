export default function Loading() {
  return <main className="loading-page" aria-busy="true" aria-label="Loading question workspace"><div className="wordmark">OVERLEET<span className="brand-dot">.</span></div><p role="status">Opening your workspace…</p><div className="skeleton skeleton-title" /><div className="skeleton skeleton-strip" />{Array.from({ length: 6 }, (_, index) => <div className="skeleton skeleton-row" key={index} />)}</main>;
}
