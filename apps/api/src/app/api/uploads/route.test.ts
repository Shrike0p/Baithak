import { describe, expect, it, vi, beforeEach } from "vitest";

/**
 * The authorization matrix, and only that. Everything else about uploads is
 * either Supabase's problem or visible the moment you try it — but "can this
 * person write into that party's album" is invisible until it's a privacy
 * incident, so it's the part worth pinning down.
 */

const currentUser = vi.fn();
const planAttendee = { findFirst: vi.fn() };
const plan = { findUnique: vi.fn() };
const photo = { count: vi.fn() };

vi.mock("@/lib/current-user", () => ({ getCurrentUserId: () => currentUser() }));
vi.mock("@baithak/db", () => ({ prisma: { planAttendee, plan, photo } }));
vi.mock("@/lib/storage", () => ({
  signUpload: (objectKey: string) => ({ objectKey, uploadUrl: "https://x/put", publicUrl: "https://x/pub" }),
}));

const { POST } = await import("./route");

function post(body: unknown) {
  return POST(
    new Request("http://localhost/api/uploads", {
      method: "POST",
      body: JSON.stringify(body),
    }) as never,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  currentUser.mockResolvedValue("user_me");
  photo.count.mockResolvedValue(0);
});

describe("POST /api/uploads", () => {
  it("refuses anyone without a session", async () => {
    currentUser.mockResolvedValue(null);
    expect((await post({ kind: "avatar", contentType: "image/jpeg" })).status).toBe(401);
  });

  it("refuses file types that aren't images", async () => {
    const res = await post({ kind: "avatar", contentType: "application/x-sh" });
    expect(res.status).toBe(415);
  });

  it("refuses an unknown kind", async () => {
    expect((await post({ kind: "wat", contentType: "image/jpeg" })).status).toBe(400);
  });

  it("lets you upload your own avatar, under your own prefix", async () => {
    const res = await post({ kind: "avatar", contentType: "image/jpeg" });
    expect(res.status).toBe(200);
    expect((await res.json()).objectKey).toMatch(/^avatars\/user_me\//);
  });

  it("refuses a memory for a plan you were never accepted into", async () => {
    planAttendee.findFirst.mockResolvedValue(null);
    const res = await post({ kind: "memory", planId: "p1", contentType: "image/jpeg" });
    expect(res.status).toBe(403);
  });

  it("allows a memory for a plan you're confirmed in", async () => {
    planAttendee.findFirst.mockResolvedValue({ id: "a1" });
    const res = await post({ kind: "memory", planId: "p1", contentType: "image/jpeg" });
    expect(res.status).toBe(200);
    expect((await res.json()).objectKey).toMatch(/^memories\/p1\//);
  });

  it("refuses a memory once the album is full", async () => {
    planAttendee.findFirst.mockResolvedValue({ id: "a1" });
    photo.count.mockResolvedValueOnce(100);
    const res = await post({ kind: "memory", planId: "p1", contentType: "image/jpeg" });
    expect(res.status).toBe(409);
  });

  it("rate limits someone uploading too fast", async () => {
    planAttendee.findFirst.mockResolvedValue({ id: "a1" });
    // first count is the album size, second is this user's recent uploads
    photo.count.mockResolvedValueOnce(0).mockResolvedValueOnce(30);
    const res = await post({ kind: "memory", planId: "p1", contentType: "image/jpeg" });
    expect(res.status).toBe(429);
  });

  it("refuses a cover on someone else's plan", async () => {
    plan.findUnique.mockResolvedValue({ hostId: "someone_else" });
    const res = await post({ kind: "cover", planId: "p1", contentType: "image/jpeg" });
    expect(res.status).toBe(403);
  });

  it("allows the host to set their own plan's cover", async () => {
    plan.findUnique.mockResolvedValue({ hostId: "user_me" });
    const res = await post({ kind: "cover", planId: "p1", contentType: "image/jpeg" });
    expect(res.status).toBe(200);
    expect((await res.json()).objectKey).toMatch(/^covers\/p1\//);
  });
});
