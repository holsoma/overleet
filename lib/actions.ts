"use server";

import { revalidatePath } from "next/cache";
import { ZodError } from "zod";
import { getViewer } from "./auth";
import { getDb } from "./db";
import { saveProgress, importGuestProgress, saveVote } from "./progress";
import type { ActionResult, ProgressStatus } from "./contracts";

async function authenticated<T>(work: (userId: string) => Promise<T>): Promise<ActionResult<T>> {
  try {
    const viewer = await getViewer();
    if (!viewer) return { ok: false, error: "Sign in to save account progress or vote." };
    const data = await work(viewer.id);
    revalidatePath("/", "layout");
    return { ok: true, data };
  } catch (error) {
    if (error instanceof ZodError) return { ok: false, error: "The submitted values are invalid. Refresh and try again." };
    return { ok: false, error: "Could not save the change. Check the database connection and try again." };
  }
}

export async function setProgress(questionId: string, status: ProgressStatus): Promise<ActionResult<{ status: ProgressStatus }>> {
  return authenticated(userId => saveProgress(getDb(), userId, questionId, status));
}
export async function mergeGuestProgress(records: { questionId: string; status: ProgressStatus }[]): Promise<ActionResult<{ acknowledged: string[]; progress: Record<string, ProgressStatus> }>> {
  return authenticated(userId => importGuestProgress(getDb(), userId, records));
}
export async function setVote(questionId: string, voted: boolean): Promise<ActionResult<{ voted: boolean; popularity: number }>> {
  return authenticated(userId => saveVote(getDb(), userId, questionId, voted));
}
