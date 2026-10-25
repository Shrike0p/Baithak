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

describe("POST /api/plans — areas", () => {
  const created = { id: "p1", attendees: [], host: {}, _count: { attendees: 1 } };

  it("accepts an area outside the suggested ones", async () => {
    plan.create.mockResolvedValueOnce(created);
    const res = await post(body({ neighborhood: "  Whitefield  " }));
    expect(res.status).not.toBe(400);
    expect(plan.create.mock.lastCall?.[0].data.neighborhood).toBe("Whitefield");
  });

  it("snaps a differently-typed suggested area to its canonical spelling", async () => {
    plan.create.mockResolvedValueOnce(created);
    await post(body({ neighborhood: "hsr   LAYOUT" }));
    expect(plan.create.mock.lastCall?.[0].data.neighborhood).toBe("HSR Layout");
  });

  it("still requires an area", async () => {
    plan.create.mockClear();
    const res = await post(body({ neighborhood: "   " }));
    expect(res.status).toBe(400);
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

describe("POST /api/plans — chip-in", () => {
  const created = { id: "p1", attendees: [], host: {}, _count: { attendees: 1 } };

  it("stores a chip-in and what it covers", async () => {
    plan.create.mockResolvedValueOnce(created);
    await post(body({ chipIn: 300, chipInNote: "  Food & the space ", upiId: "priya@okaxis" }));
    const data = plan.create.mock.lastCall?.[0].data;
    expect(data.chipIn).toBe(300);
    expect(data.chipInNote).toBe("Food & the space");
  });

  it("treats no chip-in as free", async () => {
    plan.create.mockResolvedValueOnce(created);
    await post(body({ chipInNote: "ignored without an amount" }));
    const data = plan.create.mock.lastCall?.[0].data;
    expect(data.chipIn).toBeNull();
    expect(data.chipInNote).toBeNull();
  });

  it("refuses an amount it can't use rather than making the plan free", async () => {
    for (const chipIn of [5000, 12.5, -100, "lots"]) {
      plan.create.mockClear();
      const res = await post(body({ chipIn }));
      expect(res.status).toBe(400);
      expect(plan.create).not.toHaveBeenCalled();
    }
  });
});

describe("POST /api/plans — UPI and phone", () => {
  const created = { id: "p1", attendees: [], host: {}, _count: { attendees: 1 } };

  it("stores a UPI ID with a chip-in, and the ask-for-phone switch", async () => {
    plan.create.mockResolvedValueOnce(created);
    await post(body({ chipIn: 300, upiId: " Priya@OKAXIS ", askPhone: true }));
    const data = plan.create.mock.lastCall?.[0].data;
    expect(data.upiId).toBe("priya@okaxis");
    expect(data.askPhone).toBe(true);
  });

  it("drops a UPI ID on a free plan — there's nothing to pay", async () => {
    plan.create.mockResolvedValueOnce(created);
    await post(body({ upiId: "priya@okaxis" }));
    expect(plan.create.mock.lastCall?.[0].data.upiId).toBeNull();
  });

  it("requires a UPI ID with a chip-in, and asks guests for a number", async () => {
    plan.create.mockClear();
    const res = await post(body({ chipIn: 300 }));
    expect(res.status).toBe(400);
    expect(plan.create).not.toHaveBeenCalled();

    plan.create.mockResolvedValueOnce(created);
    await post(body({ chipIn: 300, upiId: "priya@okaxis", askPhone: false }));
    expect(plan.create.mock.lastCall?.[0].data.askPhone).toBe(true);
  });

  it("refuses a malformed UPI ID instead of telling guests to pay nobody", async () => {
    plan.create.mockClear();
    const res = await post(body({ chipIn: 300, upiId: "priya" }));
    expect(res.status).toBe(400);
    expect(plan.create).not.toHaveBeenCalled();
  });
});
