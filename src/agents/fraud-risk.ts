import type { ClaimInput, DecisionOutput } from "@/src/domain/contracts";
import type { Policy } from "@/src/domain/policy";
import type { Trace } from "@/src/lib/trace";

export function applyFraudRisk({
  claim,
  policy,
  decision,
  trace
}: {
  claim: ClaimInput;
  policy: Policy;
  decision: DecisionOutput;
  trace: Trace;
}): DecisionOutput {
  const sameDayHistory = claim.claims_history?.filter((history) => history.date === claim.treatment_date) ?? [];
  const sameDayCountIncludingCurrent = sameDayHistory.length + 1;

  if (sameDayCountIncludingCurrent > policy.fraud_thresholds.same_day_claims_limit) {
    trace.add({
      agent: "Fraud And Risk Agent",
      status: "WARN",
      title: "Same-day claim velocity",
      detail: `This is claim ${sameDayCountIncludingCurrent} for the member on ${claim.treatment_date}, above the policy threshold of ${policy.fraud_thresholds.same_day_claims_limit}.`,
      evidence: { same_day_claims: sameDayHistory, threshold: policy.fraud_thresholds.same_day_claims_limit },
      confidence_delta: -0.2
    });

    return {
      ...decision,
      decision: "MANUAL_REVIEW",
      approved_amount: 0,
      reason: "Unusual same-day claim pattern detected. The claim should be reviewed by operations rather than auto-approved or auto-rejected.",
      confidence_score: Math.min(decision.confidence_score, 0.72),
      manual_review_recommended: true,
      trace: trace.all()
    };
  }

  if (claim.claimed_amount >= policy.fraud_thresholds.auto_manual_review_above && decision.decision !== "REJECTED") {
    trace.add({
      agent: "Fraud And Risk Agent",
      status: "WARN",
      title: "High-value claim",
      detail: "Claim amount exceeds the automatic manual review threshold.",
      evidence: { claimed_amount: claim.claimed_amount, threshold: policy.fraud_thresholds.auto_manual_review_above },
      confidence_delta: -0.12
    });
    return { ...decision, decision: "MANUAL_REVIEW", manual_review_recommended: true, trace: trace.all() };
  }

  trace.add({
    agent: "Fraud And Risk Agent",
    status: "PASS",
    title: "No material fraud signal",
    detail: "Claim velocity, value, and document risk signals stayed below manual review thresholds.",
    evidence: { same_day_claim_count: sameDayCountIncludingCurrent },
    confidence_delta: 0.02
  });

  return { ...decision, trace: trace.all() };
}
