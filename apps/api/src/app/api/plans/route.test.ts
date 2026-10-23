import { describe, expect, it, vi } from "vitest";

/** The mix target is a split of the room, not a second guest list. */

const currentUser = vi.fn(() => "host_a");
const plan = { create: vi.fn(), findMany: vi.fn() };

vi.mock("@/lib/current-user", () => ({ getCurrentUserId: () => currentUser() }));
vi.mock("@baithak/db", () => ({ prisma: { plan, block: { findMany: async () => [] } } }));
vi.mock("@/lib/blocks", () => ({ hiddenUserIds: async () => [] }));
vi.mock("@/lib/storage", () => ({ publicUrl: (k: string) => `https://x/${k}` }));

const { POST } = await import("./route");

function body(overrides: Record<string, unknown> = {}) {
  return {
    title: "Saturday House Party",
    neighborhood: "HSR Layout",
    exactAddress: "221B, 4th Cross",
    startsAt: new Date(Date.now() + 86_400_000).toISOString(),
    capacity: 12,
    category: "HOUSE_PARTY",
    ...overrides,
  };
}

const post = (b: unknown) =>
  POST({ json: async () => b, headers: new Headers() } as never);

describe("POST /api/plans — launch areas", () => {
  it("refuses a neighbourhood we aren't open in", async () => {
    const res = await post(body({ neighborhood: "Whitefield" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("Koramangala");
    expect(plan.create).not.toHaveBeenCalled();
  });
});

describe("POST /api/plans — crowd mix", () => {
  it("rejects a mix that adds up to more than the room", async () => {
    const res = await post(body({ crowd: { targetWomen: 12, targetMen: 12 } }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("24");
    expect(plan.create).not.toHaveBeenCalled();
  });

  it("accepts a mix that fits exactly", async () => {
    plan.create.mockResolvedValueOnce({ id: "p1", attendees: [], host: {}, _count: { attendees: 1 } });
    const res = await post(body({ crowd: { targetWomen: 6, targetMen: 6 } }));
    expect(res.status).not.toBe(400);
  });
});
