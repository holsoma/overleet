"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { AppData, ProgressStatus } from "@/lib/contracts";
import { mergeGuestProgress, setProgress, setVote } from "@/lib/actions";
import { guestProgressKey, parseProgress, readStored, useGuestProgress, writeStored } from "./browser-storage";

type StudyState = {
  data: AppData; progress: Record<string, ProgressStatus>; votes: string[]; popularity: Record<string, number>;
  error: string | null; mergeFailed: boolean; merging: boolean; busy: string | null; clearError: () => void; retryMerge: () => void;
  saveProgress: (id: string, status: ProgressStatus) => Promise<boolean>;
  vote: (id: string, voted: boolean) => Promise<void>;
};
const StudyContext = createContext<StudyState | null>(null);

export function StudyProvider({ data, children }: { data: AppData; children: React.ReactNode }) {
  const guestProgress = useGuestProgress();
  const [accountProgress, setAccountProgress] = useState(data.progress);
  const [votes, setVotes] = useState(data.votes);
  const [popularity, setPopularity] = useState(() => Object.fromEntries(data.questions.map(q => [q.id, q.popularity])));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [merging, setMerging] = useState(false);
  const [mergeFailed, setMergeFailed] = useState(false);
  const [mergeAttempt, setMergeAttempt] = useState(0);
  const viewerId = data.viewer?.id;
  const knownIdsKey = data.questions.map(q => q.id).sort().join(",");

  useEffect(() => {
    if (!viewerId) return;
    let cancelled = false;
    const validIds = new Set(knownIdsKey.split(","));
    const snapshot = parseProgress(readStored(guestProgressKey));
    const records = Object.entries(snapshot).filter(([questionId]) => validIds.has(questionId)).map(([questionId, status]) => ({ questionId, status }));
    if (!records.length) return;
    async function merge() {
      setMerging(true);
      setMergeFailed(false);
      try {
        const result = await mergeGuestProgress(records);
        if (cancelled) return;
        if (!result.ok) { setError(result.error); setMergeFailed(true); return; }
        setAccountProgress(result.data.progress);
        const current = parseProgress(readStored(guestProgressKey));
        for (const id of result.data.acknowledged) if (current[id] === snapshot[id]) delete current[id];
        if (!writeStored(guestProgressKey, JSON.stringify(current))) setError("Your account progress was saved. Browser storage is unavailable, so guest records could not be cleared.");
      } catch { if (!cancelled) { setError("Guest progress could not be imported. Your browser copy is still available. Retry when the connection returns."); setMergeFailed(true); } }
      finally { if (!cancelled) setMerging(false); }
    }
    void merge();
    return () => { cancelled = true; };
  }, [viewerId, mergeAttempt, knownIdsKey]);

  const saveProgress = useCallback(async (id: string, status: ProgressStatus) => {
    setError(null); setMergeFailed(false);
    if (!data.viewer) {
      const saved = writeStored(guestProgressKey, JSON.stringify({ ...parseProgress(readStored(guestProgressKey)), [id]: status }));
      if (!saved) setError("Browser storage is unavailable. Enable local storage to save guest progress, then try again.");
      return saved;
    }
    setBusy(id);
    try {
      const result = await setProgress(id, status);
      if (!result.ok) { setError(result.error); return false; }
      setAccountProgress(current => ({ ...current, [id]: result.data.status }));
      return true;
    } catch { setError("Progress could not be saved. Check your connection and try again."); return false; }
    finally { setBusy(null); }
  }, [data.viewer]);

  const vote = useCallback(async (id: string, voted: boolean) => {
    if (!data.viewer) { setError("Sign in with GitHub to vote on a question."); return; }
    setError(null); setMergeFailed(false); setBusy(id);
    try {
      const result = await setVote(id, voted);
      if (!result.ok) { setError(result.error); return; }
      setVotes(current => result.data.voted ? [...new Set([...current, id])] : current.filter(item => item !== id));
      setPopularity(current => ({ ...current, [id]: result.data.popularity }));
    } catch { setError("Your vote could not be saved. Check your connection and try again."); }
    finally { setBusy(null); }
  }, [data.viewer]);

  return <StudyContext.Provider value={{ data, progress: data.viewer ? accountProgress : guestProgress, votes, popularity, error, mergeFailed, merging, busy, clearError: () => setError(null), retryMerge: () => { setError(null); setMergeAttempt(value => value + 1); }, saveProgress, vote }}>{children}</StudyContext.Provider>;
}
export function useStudy() {
  const value = useContext(StudyContext);
  if (!value) throw new Error("Study components require StudyProvider");
  return value;
}
