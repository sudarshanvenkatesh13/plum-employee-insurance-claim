import type { ClaimInput, DecisionOutput, ExtractionResult, MoneyLineItem } from "@/src/domain/contracts";
import type { Member, Policy } from "@/src/domain/policy";
import { addDays, daysBetween, formatInr, includesAny } from "@/src/lib/text";
import { clampConfidence, type Trace } from "@/src/lib/trace";

type PolicyDecisionContext = {
  claim: ClaimInput;
  member: Member;
  policy: Policy;
  documents: ExtractionResult[];
  trace: Trace;
  caseId?: string;
  componentFailed: boolean;
};

export function decideClaim(context: PolicyDecisionContext): DecisionOutput {
  const { claim, policy, trace } = context;
  const textCorpus = collectClaimText(context.documents);
  const lineItems = collectLineItems(context.documents);
  let confidence = context.componentFailed ? 0.76 : 0.91;

  const excluded = checkExclusions(textCorpus, policy);
  if (excluded) {
    trace.add({
      agent: "Policy Decision Agent",
      status: "FAIL",
      title: "Excluded treatment detected",
      detail: excluded,
      evidence: { exclusions: policy.exclusions.conditions },
      confidence_delta: 0.03
    });
    return buildDecision(context, {
      decision: "REJECTED",
      approvedAmount: 0,
      reason: excluded,
      confidence,
      rejectionReasons: ["EXCLUDED_CONDITION"],
      lineItems
    });
  }

  const waitingPeriod = checkWaitingPeriod(context, textCorpus);
  if (waitingPeriod) {
    trace.add({
      agent: "Policy Decision Agent",
      status: "FAIL",
      title: "Waiting period active",
      detail: waitingPeriod.reason,
      evidence: waitingPeriod.evidence,
      confidence_delta: 0.02
    });
    return buildDecision(context, {
      decision: "REJECTED",
      approvedAmount: 0,
      reason: waitingPeriod.reason,
      confidence,
      rejectionReasons: ["WAITING_PERIOD"],
      lineItems
    });
  }

  const preAuth = checkPreAuthorization(context, lineItems, textCorpus);
  if (preAuth) {
    trace.add({
      agent: "Policy Decision Agent",
      status: "FAIL",
      title: "Pre-authorization missing",
      detail: preAuth,
      evidence: { claim_category: claim.claim_category, line_items: lineItems },
      confidence_delta: 0.02
    });
    return buildDecision(context, {
      decision: "REJECTED",
      approvedAmount: 0,
      reason: preAuth,
      confidence,
      rejectionReasons: ["PRE_AUTH_MISSING"],
      lineItems
    });
  }

  if (claim.claim_category === "CONSULTATION" && claim.claimed_amount > policy.coverage.per_claim_limit) {
    const reason = `Claimed amount ${formatInr(claim.claimed_amount)} exceeds the per-claim limit of ${formatInr(policy.coverage.per_claim_limit)}.`;
    trace.add({
      agent: "Policy Decision Agent",
      status: "FAIL",
      title: "Per-claim limit exceeded",
      detail: reason,
      evidence: { claimed_amount: claim.claimed_amount, per_claim_limit: policy.coverage.per_claim_limit },
      confidence_delta: 0.01
    });
    return buildDecision(context, {
      decision: "REJECTED",
      approvedAmount: 0,
      reason,
      confidence,
      rejectionReasons: ["PER_CLAIM_EXCEEDED"],
      lineItems
    });
  }

  if (claim.claim_category === "DENTAL") {
    return decideDental(context, lineItems, confidence);
  }

  const financials = calculateStandardApproval(context);
  confidence += financials.network_discount > 0 ? 0.02 : 0;
  trace.add({
    agent: "Policy Decision Agent",
    status: "PASS",
    title: "Policy checks passed",
    detail: `Eligible amount ${formatInr(financials.eligible_amount)} approved after discounts and co-pay.`,
    evidence: financials,
    confidence_delta: financials.network_discount > 0 ? 0.04 : 0.03
  });

  return buildDecision(context, {
    decision: "APPROVED",
    approvedAmount: financials.approved_amount,
    reason: financials.reason,
    confidence,
    lineItems: lineItems.map((item) => ({ ...item, decision: "APPROVED", reason: "Covered under policy category." })),
    financials
  });
}

function decideDental(context: PolicyDecisionContext, lineItems: MoneyLineItem[], confidence: number): DecisionOutput {
  const dentalPolicy = context.policy.opd_categories.dental;
  const approved: MoneyLineItem[] = [];
  let approvedAmount = 0;

  for (const item of lineItems) {
    if (includesAny(item.description, dentalPolicy.excluded_procedures ?? []) || includesAny(item.description, context.policy.exclusions.dental_exclusions)) {
      approved.push({ ...item, decision: "REJECTED", reason: "Cosmetic dental procedure excluded by policy." });
      continue;
    }

    if (includesAny(item.description, dentalPolicy.covered_procedures ?? [])) {
      approved.push({ ...item, decision: "APPROVED", reason: "Dental procedure is explicitly covered." });
      approvedAmount += item.amount;
      continue;
    }

    approved.push({ ...item, decision: "REJECTED", reason: "Procedure is not listed as a covered dental benefit." });
  }

  approvedAmount = Math.min(approvedAmount, dentalPolicy.sub_limit);
  context.trace.add({
    agent: "Policy Decision Agent",
    status: approvedAmount > 0 && approvedAmount < context.claim.claimed_amount ? "WARN" : "PASS",
    title: "Dental line items adjudicated",
    detail: `Approved ${formatInr(approvedAmount)} out of ${formatInr(context.claim.claimed_amount)} after item-level coverage checks.`,
    evidence: { line_items: approved, dental_sub_limit: dentalPolicy.sub_limit },
    confidence_delta: 0.03
  });

  return buildDecision(context, {
    decision: approvedAmount === context.claim.claimed_amount ? "APPROVED" : "PARTIAL",
    approvedAmount,
    reason: "Dental claim partially approved because covered and excluded procedures were itemized separately.",
    confidence,
    lineItems: approved,
    financials: { eligible_amount: approvedAmount }
  });
}

function calculateStandardApproval(context: PolicyDecisionContext) {
  const category = context.policy.opd_categories[categoryKey(context.claim.claim_category)];
  const hospitalName = getHospitalName(context);
  const isNetwork = context.policy.network_hospitals.some((hospital) => hospital.toLowerCase() === hospitalName?.toLowerCase());
  const networkPercent = isNetwork ? category.network_discount_percent ?? 0 : 0;
  const network_discount = Math.round((context.claim.claimed_amount * networkPercent) / 100);
  const afterNetwork = context.claim.claimed_amount - network_discount;
  const copay = Math.round((afterNetwork * (category.copay_percent ?? 0)) / 100);
  const approved_amount = Math.max(0, afterNetwork - copay);
  const reason =
    network_discount > 0
      ? `Network discount (${networkPercent}%) applied first, then ${category.copay_percent ?? 0}% co-pay.`
      : `${category.copay_percent ?? 0}% co-pay applied under ${context.claim.claim_category.toLowerCase()} policy terms.`;

  return {
    eligible_amount: afterNetwork,
    network_discount,
    copay,
    approved_amount,
    per_claim_limit: context.policy.coverage.per_claim_limit,
    reason
  };
}

function checkWaitingPeriod(context: PolicyDecisionContext, textCorpus: string) {
  const memberStart = context.member.join_date ?? context.policy.policy_holder.policy_start_date;
  const conditionDays = context.policy.waiting_periods.specific_conditions;
  const condition = Object.entries(conditionDays).find(([name]) => {
    if (name === "diabetes") return includesAny(textCorpus, ["diabetes", "t2dm", "type 2 diabetes"]);
    if (name === "hypertension") return includesAny(textCorpus, ["hypertension", "htn"]);
    if (name === "thyroid_disorders") return includesAny(textCorpus, ["thyroid", "hypothyroidism"]);
    return includesAny(textCorpus, [name.replaceAll("_", " ")]);
  });

  if (!condition) return null;
  const [name, days] = condition;
  const elapsed = daysBetween(memberStart, context.claim.treatment_date);
  if (elapsed >= days) return null;
  const eligibleDate = addDays(memberStart, days);

  return {
    reason: `${name.replaceAll("_", " ")} treatment is still inside the ${days}-day waiting period. The member becomes eligible for related claims from ${eligibleDate}.`,
    evidence: { member_join_date: memberStart, treatment_date: context.claim.treatment_date, waiting_period_days: days, eligible_date: eligibleDate }
  };
}

function checkPreAuthorization(context: PolicyDecisionContext, lineItems: MoneyLineItem[], textCorpus: string) {
  const isHighValueMri = includesAny(textCorpus, ["MRI"]) && (context.claim.claimed_amount > 10_000 || lineItems.some((item) => includesAny(item.description, ["MRI"]) && item.amount > 10_000));
  if (context.claim.claim_category === "DIAGNOSTIC" && isHighValueMri && !context.claim.pre_authorization_id) {
    return "MRI above the policy threshold requires pre-authorization. Please resubmit with a valid pre-authorization approval obtained before the scan.";
  }
  return null;
}

function checkExclusions(textCorpus: string, policy: Policy) {
  if (includesAny(textCorpus, ["bariatric", "obesity", "weight loss", "diet plan", "nutrition program"])) {
    return "The diagnosis/treatment is for obesity or bariatric weight-management care, which is explicitly excluded under the policy.";
  }
  if (includesAny(textCorpus, policy.exclusions.conditions)) {
    return "The submitted treatment matches an explicit policy exclusion.";
  }
  return null;
}

function collectClaimText(documents: ExtractionResult[]) {
  return documents
    .flatMap((document) => [
      document.fields.diagnosis,
      document.fields.treatment,
      document.fields.test_name,
      ...(document.fields.tests_ordered ?? []),
      ...(document.fields.medicines ?? []),
      ...(document.fields.line_items ?? []).map((item) => item.description)
    ])
    .filter(Boolean)
    .join(" ");
}

function collectLineItems(documents: ExtractionResult[]): MoneyLineItem[] {
  const bill = documents.find((document) => document.fields.line_items && document.fields.line_items.length > 0);
  return bill?.fields.line_items ?? [];
}

function getHospitalName(context: PolicyDecisionContext) {
  return context.claim.hospital_name ?? context.documents.find((document) => document.fields.hospital_name)?.fields.hospital_name;
}

function categoryKey(category: ClaimInput["claim_category"]) {
  return category.toLowerCase();
}

function buildDecision(
  context: PolicyDecisionContext,
  params: {
    decision: DecisionOutput["decision"];
    approvedAmount: number;
    reason: string;
    confidence: number;
    rejectionReasons?: string[];
    lineItems?: MoneyLineItem[];
    financials?: DecisionOutput["financials"];
  }
): DecisionOutput {
  const reason = context.componentFailed
    ? `${params.reason} Manual review is recommended because one processing component failed and the decision used a degraded fallback.`
    : params.reason;

  return {
    status: "DECIDED",
    case_id: context.caseId,
    decision: params.decision,
    approved_amount: params.approvedAmount,
    claimed_amount: context.claim.claimed_amount,
    reason,
    confidence_score: clampConfidence(params.confidence),
    rejection_reasons: params.rejectionReasons ?? [],
    line_items: params.lineItems ?? [],
    financials: params.financials ?? {},
    extracted_documents: context.documents,
    trace: context.trace.all(),
    manual_review_recommended: context.componentFailed
  };
}
