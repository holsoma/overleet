import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ viewer: null as null | { id: string }, save: vi.fn(), merge: vi.fn(), vote: vi.fn(), db: {} }));
vi.mock("../lib/auth", () => ({ getViewer: async () => state.viewer }));
vi.mock("../lib/db", () => ({ getDb: () => state.db }));
vi.mock("../lib/progress", () => ({ saveProgress: state.save, importGuestProgress: state.merge, saveVote: state.vote }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
import { setProgress, mergeGuestProgress, setVote } from "../lib/actions";

describe("authenticated server actions", () => {
  beforeEach(() => { state.viewer = null; vi.clearAllMocks(); });
  it("rejects unauthenticated writes", async () => {
    expect((await setProgress("test", "completed")).ok).toBe(false);
    expect((await setVote("test", true)).ok).toBe(false);
    expect((await mergeGuestProgress([])).ok).toBe(false);
    expect(state.save).not.toHaveBeenCalled();
  });
  it("takes identity only from the session for every action", async () => {
    state.viewer = { id: "account-a" };
    state.save.mockResolvedValue({ status: "completed" });
    state.vote.mockResolvedValue({ voted: true, popularity: 1 });
    state.merge.mockResolvedValue({ acknowledged: [], progress: {} });
    await setProgress("test", "completed");
    await setVote("test", true);
    await mergeGuestProgress([]);
    expect(state.save).toHaveBeenCalledWith(state.db, "account-a", "test", "completed");
    expect(state.vote).toHaveBeenCalledWith(state.db, "account-a", "test", true);
    expect(state.merge).toHaveBeenCalledWith(state.db, "account-a", []);
  });
  it("does not expose database connection details on failure", async () => {
    state.viewer = { id: "account-a" };
    state.merge.mockRejectedValue(new Error("postgresql://private-connection-detail"));
    const result = await mergeGuestProgress([]);
    expect(result.ok).toBe(false);
    expect(JSON.stringify(result)).not.toContain("private-connection-detail");
  });
});
