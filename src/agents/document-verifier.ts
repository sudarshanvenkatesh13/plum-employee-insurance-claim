import type { ClaimInput, DocumentType, EarlyStop } from "@/src/domain/contracts";
import type { Policy } from "@/src/domain/policy";
import { formatInr } from "@/src/lib/text";
import type { Trace } from "@/src/lib/trace";

export function verifyDocuments({
  claim,
  policy,
  trace,
  caseId
}: {
  claim: ClaimInput;
  policy: Policy;
  trace: Trace;
  caseId?: string;
}): EarlyStop | null {
  const requirement = policy.document_requirements[claim.claim_category];
  const uploaded = claim.documents.map((document) => document.detected_type ?? document.actual_type ?? "UNKNOWN");
  const missing = requirement.required.filter((requiredType) => !uploaded.includes(requiredType));
  const unreadable = claim.documents.find((document) => document.quality === "UNREADABLE");

  if (missing.length > 0) {
    const uploadedLabel = uploaded.join(", ");
    const missingLabel = missing.join(", ");
    trace.add({
      agent: "Document Verification Agent",
      status: "FAIL",
      title: "Required document missing",
      detail: `Uploaded ${uploadedLabel}; still need ${missingLabel}.`,
      evidence: { uploaded, required: requirement.required, missing },
      confidence_delta: -0.35
    });

    return {
      status: "NEEDS_MEMBER_ACTION",
      case_id: caseId,
      message: `This ${claim.claim_category.toLowerCase()} claim cannot be processed yet. You uploaded ${uploadedLabel}, but the policy requires ${missingLabel}. Please upload a clear ${missingLabel} for the same treatment and amount ${formatInr(claim.claimed_amount)}.`,
      missing_documents: missing,
      uploaded_documents: uploaded,
      trace: trace.all(),
      confidence_score: 0.98
    };
  }

  if (unreadable) {
    const type = unreadable.actual_type ?? unreadable.detected_type ?? "UNKNOWN";
    trace.add({
      agent: "Document Verification Agent",
      status: "FAIL",
      title: "Unreadable document",
      detail: `${type} ${unreadable.file_name ?? unreadable.file_id} cannot be read reliably.`,
      evidence: { file_id: unreadable.file_id, type, quality: unreadable.quality },
      confidence_delta: -0.45
    });

    return {
      status: "NEEDS_MEMBER_ACTION",
      case_id: caseId,
      message: `The ${type} (${unreadable.file_name ?? unreadable.file_id}) is too blurry or incomplete to read. Please re-upload a clear photo or PDF of that exact ${type}; we should not reject the claim until you have a chance to fix it.`,
      missing_documents: [],
      uploaded_documents: uploaded,
      trace: trace.all(),
      confidence_score: 0.96
    };
  }

  trace.add({
    agent: "Document Verification Agent",
    status: "PASS",
    title: "Required documents present",
    detail: `Found required documents for ${claim.claim_category}: ${requirement.required.join(", ")}.`,
    evidence: { uploaded, required: requirement.required },
    confidence_delta: 0.03
  });

  return null;
}

export function listMissingDocuments(claim: ClaimInput, policy: Policy): DocumentType[] {
  const uploaded = claim.documents.map((document) => document.detected_type ?? document.actual_type ?? "UNKNOWN");
  return policy.document_requirements[claim.claim_category].required.filter((type) => !uploaded.includes(type));
}
