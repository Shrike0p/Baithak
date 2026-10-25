import { beforeEach, describe, expect, it, vi } from "vitest";

/** "I've paid" can be taken back — but only until the host confirms. */

const application = { findUnique: vi.fn(), update: vi.fn(async () => ({})) };
vi.mock("@/lib/current-user", () => ({ getCurrentUserId: () => "guest_b" }));
vi.mock("@/lib/notify", () => ({ notify: vi.fn() }));
vi.mock("@baithak/db", () => ({ prisma: { application } }));

const { DELETE } = await import("./route");
const undo = () =>
  DELETE({ headers: new Headers() } as never, { params: Promise.resolve({ id: "plan_1" }) } as never);

beforeEach(() => vi.clearAllMocks());

describe("DELETE /api/plans/:id/payment", () => {
  it("clears a mis-tapped claim", async () => {
    application.findUnique.mockResolvedValueOnce({ id: "app_1", status: "ACCEPTED", paidConfirmedAt: null });
    expect((await undo()).status).toBe(200);
    expect(application.update).toHaveBeenCalledWith({ where: { id: "app_1" }, data: { paidClaimedAt: null } });
  });

  it("won't undo once the host has confirmed it", async () => {
    application.findUnique.mockResolvedValueOnce({ id: "app_1", status: "ACCEPTED", paidConfirmedAt: new Date() });
    expect((await undo()).status).toBe(409);
    expect(application.update).not.toHaveBeenCalled();
  });
});
