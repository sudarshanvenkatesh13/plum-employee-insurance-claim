import { z } from "zod";
import { ClaimInputSchema } from "@/src/domain/contracts";
import { PolicySchema } from "@/src/domain/policy";
import policyJson from "@/policy_terms.json";
import testCasesJson from "@/test_cases.json";

const TestCaseSchema = z.object({
  case_id: z.string(),
  case_name: z.string(),
  description: z.string(),
  input: ClaimInputSchema,
  expected: z.record(z.string(), z.unknown())
});

const TestCasesFileSchema = z.object({
  version: z.string(),
  description: z.string(),
  test_cases: z.array(TestCaseSchema),
  notes: z.array(z.string()).optional()
});

export function loadPolicy() {
  return PolicySchema.parse(policyJson);
}

export function loadTestCases() {
  return TestCasesFileSchema.parse(testCasesJson).test_cases;
}

export type TestCase = z.infer<typeof TestCaseSchema>;
