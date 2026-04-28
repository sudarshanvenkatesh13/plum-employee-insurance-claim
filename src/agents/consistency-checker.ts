import type { ClaimInput, EarlyStop, ExtractionResult } from "@/src/domain/contracts";
import type { Member } from "@/src/domain/policy";
import type { Trace } from "@/src/lib/trace";

export function checkConsistency({
  claim,
  member,
  documents,
  trace,
  caseId
}: {
  claim: ClaimInput;
  member: Member;
  documents: ExtractionResult[];
  trace: Trace;
  caseId?: string;
}): EarlyStop | null {
  const names = documents
    .map((document) => document.fields.patient_name)
    .filter((name): name is string => Boolean(name));
  const uniqueNames = [...new Set(names.map((name) => name.trim()))];

  if (uniqueNames.length > 1) {
    trace.add({
      agent: "Consistency Agent",
      status: "FAIL",
      title: "Documents belong to different patients",
      detail: `Found patient names ${uniqueNames.join(" and ")} across submitted documents.`,
      evidence: {
        patient_names: documents.map((document) => ({
          document_id: document.document_id,
          type: document.type,
          patient_name: document.fields.patient_name
        }))
      },
      confidence_delta: -0.5
    });

    return {
      status: "NEEDS_MEMBER_ACTION",
      case_id: caseId,
      message: `The submitted documents appear to belong to different people: ${uniqueNames.join(", ")}. Please re-upload documents for the same patient, expected member ${member.name}.`,
      missing_documents: [],
      uploaded_documents: documents.map((document) => document.type),
      trace: trace.all(),
      confidence_score: 0.97
    };
  }

  if (uniqueNames.length === 1 && uniqueNames[0].toLowerCase() !== member.name.toLowerCase()) {
    trace.add({
      agent: "Consistency Agent",
      status: "WARN",
      title: "Patient name differs from member roster",
      detail: `Document patient is ${uniqueNames[0]}, while submitted member is ${member.name}.`,
      evidence: { submitted_member: member.name, document_patient: uniqueNames[0] },
      confidence_delta: -0.08
    });
  } else {
    trace.add({
      agent: "Consistency Agent",
      status: "PASS",
      title: "Document identities are consistent",
      detail: names.length > 0 ? `All patient names align as ${uniqueNames[0]}.` : "No conflicting patient names were found.",
      evidence: { member: member.name, patient_names: uniqueNames },
      confidence_delta: 0.03
    });
  }

  const totals = documents.map((document) => document.fields.total).filter((total): total is number => typeof total === "number");
  const maxTotal = totals.length > 0 ? Math.max(...totals) : claim.claimed_amount;
  if (Math.abs(maxTotal - claim.claimed_amount) > Math.max(50, claim.claimed_amount * 0.1)) {
    trace.add({
      agent: "Consistency Agent",
      status: "WARN",
      title: "Claimed amount differs from document total",
      detail: `Claimed amount is ${claim.claimed_amount}; largest document total is ${maxTotal}.`,
      evidence: { claimed_amount: claim.claimed_amount, document_totals: totals },
      confidence_delta: -0.06
    });
  }

  return null;
}
