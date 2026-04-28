import { ClaimWorkbench } from "@/app/components/ClaimWorkbench";
import { loadPolicy, loadTestCases } from "@/src/lib/fixtures";

export default function Home() {
  const policy = loadPolicy();
  const testCases = loadTestCases();

  return <ClaimWorkbench policyName={policy.policy_name} testCases={testCases} />;
}
