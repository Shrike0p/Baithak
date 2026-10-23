import { describe, expect, it } from "vitest";
import { profileStrength } from "@baithak/types";

/** A host can raise the bar for their own plan, but only on optional steps. */

const baseline = { age: 25, city: "Bangalore", vibeTags: ["Chill", "Gaming"] };

describe("profileStrength with a host's demands", () => {
  it("lets a baseline profile apply when the host asks for nothing extra", () => {
    expect(profileStrength(baseline).canApply).toBe(true);
  });

  it("blocks the same profile when the host demands a social account", () => {
    const gated = profileStrength(baseline, ["social"]);
    expect(gated.canApply).toBe(false);
    expect(gated.missingRequired.map((s) => s.key)).toEqual(["social"]);
  });

  it("passes once that account is there", () => {
    const withSocial = { ...baseline, socialUrl: "https://linkedin.com/in/x" };
    expect(profileStrength(withSocial, ["social"]).canApply).toBe(true);
  });

  it("never lets a demand loosen the baseline", () => {
    // "basics" is required whether or not a host mentions it.
    const noAge = { city: "Bangalore", vibeTags: ["Chill", "Gaming"] };
    expect(profileStrength(noAge, ["bio"]).canApply).toBe(false);
  });
});
