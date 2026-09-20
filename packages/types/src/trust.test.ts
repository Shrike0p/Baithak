import { describe, expect, it } from "vitest";
import { trustScore } from "./trust";

/**
 * The number under every star in the product. Worth pinning down, because a
 * host is using it to decide who comes to their house.
 */
describe("trustScore", () => {
  it("starts a brand new person at 1, and says why", () => {
    const { score, reasons } = trustScore({
      plansAttended: 0, plansHosted: 0, ratings: [], connections: 0,
    });
    expect(score).toBe(1);
    expect(reasons).toEqual(["New here — no history yet"]);
  });

  it("rewards showing up, with diminishing returns", () => {
    const at = (n: number) =>
      trustScore({ plansAttended: n, plansHosted: 0, ratings: [], connections: 0 }).score;

    expect(at(4)).toBeGreaterThan(at(2));
    expect(at(20)).toBeGreaterThan(at(4));

    // Compared over the same-sized step: two more parties are worth far less to
    // someone who has been to twenty than to someone who has been to two.
    expect(at(22) - at(20)).toBeLessThan(at(4) - at(2));
  });

  it("lets bad reviews pull someone down", () => {
    const good = trustScore({ plansAttended: 5, plansHosted: 2, ratings: [5, 5, 5], connections: 0 }).score;
    const bad = trustScore({ plansAttended: 5, plansHosted: 2, ratings: [1, 1, 1], connections: 0 }).score;
    expect(bad).toBeLessThan(good);
  });

  it("doesn't let one review decide everything", () => {
    const one = trustScore({ plansAttended: 3, plansHosted: 0, ratings: [1], connections: 0 }).score;
    const many = trustScore({
      plansAttended: 3, plansHosted: 0, ratings: [1, 1, 1, 1, 1, 1], connections: 0,
    }).score;
    expect(many).toBeLessThan(one);
  });

  it("never leaves the 0–5 range", () => {
    const top = trustScore({
      plansAttended: 500, plansHosted: 500, ratings: Array(50).fill(5), connections: 100,
    }).score;
    const bottom = trustScore({
      plansAttended: 0, plansHosted: 0, ratings: Array(50).fill(1), connections: 0,
    }).score;
    expect(top).toBeLessThanOrEqual(5);
    expect(bottom).toBeGreaterThanOrEqual(0);
  });

  it("explains itself rather than handing over a bare number", () => {
    const { reasons } = trustScore({
      plansAttended: 4, plansHosted: 1, ratings: [5, 4], connections: 2,
    });
    expect(reasons[0]).toMatch(/Rated 4.5 across 2 nights/);
    expect(reasons).toContain("Has hosted 1 time");
    expect(reasons).toContain("2 people would hang out again");
  });
});
