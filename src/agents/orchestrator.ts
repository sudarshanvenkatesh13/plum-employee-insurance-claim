import { checkConsistency } from "@/src/agents/consistency-checker";
import { extractDocuments } from "@/src/agents/document-extractor";
import { verifyDocuments } from "@/src/agents/document-verifier";
import { applyFraudRisk } from "@/src/agents/fraud-risk";
import { decideClaim } from "@/src/agents/policy-engine";
import { ClaimInputSchema, type ClaimInput, type ProcessClaimResponse } from "@/src/domain/contracts";
import type { Policy } from "@/src/domain/policy";
import { loadPolicy } from "@/src/lib/fixtures";
import { Trace } from "@/src/lib/trace";

export async function processClaim(input: unknown, options: { caseId?: string; policy?: Policy } = {}): Promise<ProcessClaimResponse> {
  const claim = ClaimInputSchema.parse(input);
  const policy = options.policy ?? loadPolicy();
  const trace = new Trace();

  trace.add({
    agent: "Intake Agent",
    status: "PASS",
    title: "Claim accepted",
    detail: `Received ${claim.claim_category} claim for ${claim.member_id} worth INR ${claim.claimed_amount}.`,
    evidence: {
      member_id: claim.member_id,
      policy_id: claim.policy_id,
      claim_category: claim.claim_category,
      document_count: claim.documents.length
    },
    confidence_delta: 0.02
  });

  const member = policy.members.find((candidate) => candidate.member_id === claim.member_id);
  if (!member) {
    trace.add({
      agent: "Intake Agent",
      status: "FAIL",
      title: "Member not found",
      detail: `No active member found for ${claim.member_id}.`,
      evidence: { member_id: claim.member_id },
      confidence_delta: -0.5
    });
    return {
      status: "NEEDS_MEMBER_ACTION",
      case_id: options.caseId,
      message: `Member ${claim.member_id} was not found in policy ${policy.policy_id}. Please verify the member ID and resubmit.`,
      missing_documents: [],
      uploaded_documents: claim.documents.map((document) => document.actual_type ?? "UNKNOWN"),
      trace: trace.all(),
      confidence_score: 0.99
    };
  }

  const documentProblem = verifyDocuments({ claim, policy, trace, caseId: options.caseId });
  if (documentProblem) return documentProblem;

  const { documents, componentFailed } = await safeExtract(claim, trace);
  const consistencyProblem = checkConsistency({ claim, member, documents, trace, caseId: options.caseId });
  if (consistencyProblem) return consistencyProblem;

  const policyDecision = decideClaim({ claim, member, policy, documents, trace, caseId: options.caseId, componentFailed });
  return applyFraudRisk({ claim, policy, decision: policyDecision, trace });
}

async function safeExtract(claim: ClaimInput, trace: Trace) {
  try {
    return await extractDocuments({ claim, trace });
  } catch (error) {
    trace.add({
      agent: "Document Extraction Agent",
      status: "WARN",
      title: "Extractor failed",
      detail: "The extractor threw an error. The pipeline continued with document metadata only.",
      evidence: { error: error instanceof Error ? error.message : String(error) },
      confidence_delta: -0.25
    });
    return {
      componentFailed: true,
      documents: claim.documents.map((document) => ({
        document_id: document.file_id,
        type: document.actual_type ?? "UNKNOWN",
        quality: document.quality ?? "LOW",
        confidence: 0.55,
        fields: {
          ...(document.content ?? {}),
          patient_name: document.content?.patient_name ?? document.patient_name_on_doc
        },
        warnings: ["Extractor failed; metadata fallback used."]
      }))
    };
  }
}
