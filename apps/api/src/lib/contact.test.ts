import { describe, expect, it } from "vitest";
import { normalizePhone, normalizeUpiId, upiPayLink } from "@baithak/types";

/** The rules the join gate and the party room's pay button both lean on. */

describe("normalizePhone", () => {
  it("reads an Indian mobile however it's typed", () => {
    for (const typed of ["98765 43210", "+91-98765-43210", "09876543210", "919876543210"]) {
      expect(normalizePhone(typed)).toBe("+919876543210");
    }
  });

  it("keeps an international number that has its + code", () => {
    expect(normalizePhone("+14155550123")).toBe("+14155550123");
  });

  it("refuses what can't be dialled", () => {
    for (const typed of ["", "12345", "5876543210", "call me", undefined]) {
      expect(normalizePhone(typed)).toBeNull();
    }
  });
});

describe("normalizeUpiId", () => {
  it("accepts name@bank, lowercased and trimmed", () => {
    expect(normalizeUpiId(" Priya.S@OKAXIS ")).toBe("priya.s@okaxis");
    expect(normalizeUpiId("9876543210@ybl")).toBe("9876543210@ybl");
  });

  it("refuses anything without a handle", () => {
    for (const typed of ["priya", "priya@", "@okaxis", ""]) {
      expect(normalizeUpiId(typed)).toBeNull();
    }
  });
});

describe("upiPayLink", () => {
  it("fills payee, amount and note for the UPI app", () => {
    const link = upiPayLink({ upiId: "priya@okaxis", payeeName: "Priya S", amount: 300, note: "Saturday" });
    const q = new URLSearchParams(link.replace("upi://pay?", ""));
    expect(link.startsWith("upi://pay?")).toBe(true);
    expect(q.get("pa")).toBe("priya@okaxis");
    expect(q.get("am")).toBe("300.00");
    expect(q.get("cu")).toBe("INR");
  });
});
