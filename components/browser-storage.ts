"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import type { ProgressStatus } from "@/lib/contracts";

const eventName = "overleet-storage";
const subscribeToHydration = () => () => {};
const clientHydrationSnapshot = () => true;
const serverHydrationSnapshot = () => false;

export function useHydrated() {
  return useSyncExternalStore(subscribeToHydration, clientHydrationSnapshot, serverHydrationSnapshot);
}

export const guestProgressKey = "overleet:v1:guest:progress";
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(eventName, callback);
  return () => { window.removeEventListener("storage", callback); window.removeEventListener(eventName, callback); };
}
const serverSnapshot = () => null;
export function readStored(key: string): string | null {
  try { return window.localStorage.getItem(key); } catch { return null; }
}
export function writeStored(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value);
    window.dispatchEvent(new Event(eventName));
    return true;
  } catch { return false; }
}
export function parseProgress(raw: string | null): Record<string, ProgressStatus> {
  try {
    const parsed: unknown = JSON.parse(raw ?? "{}");
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter(([id, status]) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) && ["unseen", "completed", "review_later"].includes(String(status))));
  } catch { return {}; }
}
export function useStoredString(key: string) {
  const snapshot = useCallback(() => readStored(key), [key]);
  const value = useSyncExternalStore(subscribe, snapshot, serverSnapshot);
  const setValue = useCallback((next: string) => writeStored(key, next), [key]);
  return [value, setValue] as const;
}
export function useGuestProgress() {
  const [raw] = useStoredString(guestProgressKey);
  return useMemo(() => parseProgress(raw), [raw]);
}
export function workspaceKey(viewerId: string | undefined, questionId: string) {
  return `overleet:v1:${viewerId ? `user:${viewerId}` : "guest"}:question:${questionId}`;
}
