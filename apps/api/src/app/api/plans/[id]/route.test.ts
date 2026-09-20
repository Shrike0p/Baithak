import { describe, expect, it, vi, beforeEach } from "vitest";

/** The lifecycle moves a host can make, and the guards on each. */

const currentUser = vi.fn();
const plan = { findUnique: vi.fn(), update: vi.fn(), delete: vi.fn() };

vi.mock("@/lib/current-user", () => ({ getCurrentUserId: () => currentUser() }));
vi.mock("@baithak/db", () => ({ prisma: { plan } }));
vi.mock("@/lib/storage", () => ({
  deleteObject: vi.fn(),
  keyFromUrl: () => null,
  publicUrl: (k: string) => `https://x/${k}`,
}));
vi.mock("@/lib/composition", () => ({ composeCrew: () => ({}), groupHealth: () => [] }));

// Telling people is a side effect of the lifecycle move, not part of the rule
// being tested — and notify() is fire-and-forget by design.
const notify = vi.fn();
vi.mock("@/lib/notify", () => ({
  notify: (n: unknown) => notify(n),
  attendeesOf: async () => ["guest_a", "guest_b"],
}));

const { PATCH, DELETE } = await import("./route");

const ctx = { params: Promise.resolve({ id: "p1" }) } as never;
const req = (body: unknown, method = "PATCH") =>
  new Request("http://localhost/api/plans/p1", { method, body: JSON.stringify(body) }) as never;

const HOUR = 60 * 60 * 1000;

beforeEach(() => {
  vi.clearAllMocks();
  currentUser.mockResolvedValue("user_me");
  plan.update.mockImplementation(({ data }: { data: object }) => ({ id: "p1", ...data }));
  plan.delete.mockResolvedValue({});
});

describe("wrapping up", () => {
  it("refuses a party that hasn't started", async () => {
    plan.findUnique.mockResolvedValue({
      hostId: "user_me", imageUrl: null, status: "OPEN", startsAt: new Date(Date.now() + HOUR),
    });
    const res = await PATCH(req({ status: "COMPLETED" }), ctx);
    expect(res.status).toBe(409);
  });

  it("allows it once the party has started", async () => {
    plan.findUnique.mockResolvedValue({
      hostId: "user_me", imageUrl: null, status: "OPEN", startsAt: new Date(Date.now() - HOUR),
    });
    const res = await PATCH(req({ status: "COMPLETED" }), ctx);
    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe("COMPLETED");
  });

  it("tells everyone who was there", async () => {
    plan.findUnique.mockResolvedValue({
      hostId: "user_me", imageUrl: null, status: "OPEN",
      startsAt: new Date(Date.now() - HOUR), title: "Last Saturday",
    });
    await PATCH(req({ status: "COMPLETED" }), ctx);
    expect(notify).toHaveBeenCalledWith([
      expect.objectContaining({ userId: "guest_a", kind: "PLAN_WRAPPED" }),
      expect.objectContaining({ userId: "guest_b", kind: "PLAN_WRAPPED" }),
    ]);
  });

  it("refuses to resurrect a cancelled party", async () => {
    plan.findUnique.mockResolvedValue({
      hostId: "user_me", imageUrl: null, status: "CANCELLED", startsAt: new Date(Date.now() - HOUR),
    });
    expect((await PATCH(req({ status: "COMPLETED" }), ctx)).status).toBe(409);
  });

  it("refuses anyone who isn't the host", async () => {
    plan.findUnique.mockResolvedValue({
      hostId: "someone_else", imageUrl: null, status: "OPEN", startsAt: new Date(Date.now() - HOUR),
    });
    expect((await PATCH(req({ status: "COMPLETED" }), ctx)).status).toBe(403);
  });
});

describe("cancelling", () => {
  it("works on a plan that hasn't happened", async () => {
    plan.findUnique.mockResolvedValue({
      hostId: "user_me", imageUrl: null, status: "OPEN", startsAt: new Date(Date.now() + HOUR),
    });
    const res = await PATCH(req({ status: "CANCELLED" }), ctx);
    expect((await res.json()).status).toBe("CANCELLED");
  });

  it("warns the guests, so nobody turns up to a dark house", async () => {
    plan.findUnique.mockResolvedValue({
      hostId: "user_me", imageUrl: null, status: "OPEN",
      startsAt: new Date(Date.now() + HOUR), title: "Saturday",
    });
    await PATCH(req({ status: "CANCELLED" }), ctx);
    expect(notify).toHaveBeenCalledWith([
      expect.objectContaining({ userId: "guest_a", kind: "PLAN_CANCELLED" }),
      expect.objectContaining({ userId: "guest_b", kind: "PLAN_CANCELLED" }),
    ]);
  });

  it("refuses to cancel a party that already happened", async () => {
    plan.findUnique.mockResolvedValue({
      hostId: "user_me", imageUrl: null, status: "COMPLETED", startsAt: new Date(Date.now() - HOUR),
    });
    expect((await PATCH(req({ status: "CANCELLED" }), ctx)).status).toBe(409);
  });
});

describe("deleting", () => {
  it("refuses once a guest has been accepted", async () => {
    plan.findUnique.mockResolvedValue({
      hostId: "user_me", imageUrl: null, _count: { attendees: 2 },
    });
    const res = await DELETE(req({}, "DELETE"), ctx);
    expect(res.status).toBe(409);
    expect(plan.delete).not.toHaveBeenCalled();
  });

  it("allows it while nobody else is committed", async () => {
    plan.findUnique.mockResolvedValue({
      hostId: "user_me", imageUrl: null, _count: { attendees: 0 },
    });
    expect((await DELETE(req({}, "DELETE"), ctx)).status).toBe(200);
    expect(plan.delete).toHaveBeenCalled();
  });

  it("refuses someone else's plan", async () => {
    plan.findUnique.mockResolvedValue({
      hostId: "someone_else", imageUrl: null, _count: { attendees: 0 },
    });
    expect((await DELETE(req({}, "DELETE"), ctx)).status).toBe(403);
  });
});
