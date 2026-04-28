import { processClaim } from "@/src/agents/orchestrator";
import type { ProcessClaimResponse } from "@/src/domain/contracts";
import { loadTestCases } from "@/src/lib/fixtures";

export type EvalResult = {
  case_id: string;
  case_name: string;
  expected_decision: string | null;
  actual_decision: string | null;
  passed: boolean;
  response: ProcessClaimResponse;
};

export async function runEvals(): Promise<EvalResult[]> {
  const cases = loadTestCases();
  return Promise.all(
    cases.map(async (testCase) => {
      const response = await processClaim(testCase.input, { caseId: testCase.case_id });
      const expectedDecision = typeof testCase.expected.decision === "string" ? testCase.expected.decision : null;
      const actualDecision = response.status === "DECIDED" ? response.decision : null;
      return {
        case_id: testCase.case_id,
        case_name: testCase.case_name,
        expected_decision: expectedDecision,
        actual_decision: actualDecision,
        passed: expectedDecision === actualDecision,
        response
      };
    })
  );
}
