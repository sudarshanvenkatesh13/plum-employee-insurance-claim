import { describe, expect, it } from "vitest";
import { processClaim } from "@/src/agents/orchestrator";
import { loadTestCases } from "@/src/lib/fixtures";
import { runEvals } from "@/src/lib/eval-runner";

describe("claims pipeline", () => {
  it("matches expected decision outcomes for all assignment cases", async () => {
    const results = await runEvals();
    expect(results).toHaveLength(12);
    expect(results.every((result) => result.passed)).toBe(true);
  });

  it("applies consultation co-pay and network discount in the correct order", async () => {
    const cases = loadTestCases();
    const cleanApproval = cases.find((testCase) => testCase.case_id === "TC004");
    const networkApproval = cases.find((testCase) => testCase.case_id === "TC010");

    const clean = await processClaim(cleanApproval?.input, { caseId: "TC004" });
    const network = await processClaim(networkApproval?.input, { caseId: "TC010" });

    expect(clean.status).toBe("DECIDED");
    if (clean.status === "DECIDED") {
      expect(clean.decision).toBe("APPROVED");
      expect(clean.approved_amount).toBe(1350);
    }

    expect(network.status).toBe("DECIDED");
    if (network.status === "DECIDED") {
      expect(network.decision).toBe("APPROVED");
      expect(network.approved_amount).toBe(3240);
      expect(network.financials.network_discount).toBe(900);
      expect(network.financials.copay).toBe(360);
    }
  });

  it("stops document problems before making claim decisions", async () => {
    const testCase = loadTestCases().find((candidate) => candidate.case_id === "TC001");
    const result = await processClaim(testCase?.input, { caseId: "TC001" });

    expect(result.status).toBe("NEEDS_MEMBER_ACTION");
    expect(result.trace.some((event) => event.agent === "Document Verification Agent" && event.status === "FAIL")).toBe(true);
    if (result.status === "NEEDS_MEMBER_ACTION") {
      expect(result.message).toContain("PRESCRIPTION");
      expect(result.message).toContain("HOSPITAL_BILL");
    }
  });

  it("keeps processing visible when a component fails", async () => {
    const testCase = loadTestCases().find((candidate) => candidate.case_id === "TC011");
    const result = await processClaim(testCase?.input, { caseId: "TC011" });

    expect(result.status).toBe("DECIDED");
    if (result.status === "DECIDED") {
      expect(result.decision).toBe("APPROVED");
      expect(result.confidence_score).toBeLessThan(0.85);
      expect(result.manual_review_recommended).toBe(true);
      expect(result.reason).toContain("Manual review is recommended");
    }
  });
});
