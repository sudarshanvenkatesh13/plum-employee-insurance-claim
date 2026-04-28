import OpenAI from "openai";
import type { ClaimInput, ExtractionResult } from "@/src/domain/contracts";
import type { Trace } from "@/src/lib/trace";

export async function extractDocuments({
  claim,
  trace
}: {
  claim: ClaimInput;
  trace: Trace;
}): Promise<{ documents: ExtractionResult[]; componentFailed: boolean }> {
  if (claim.simulate_component_failure) {
    trace.add({
      agent: "Document Extraction Agent",
      status: "WARN",
      title: "Extractor fallback activated",
      detail: "A simulated extraction subcomponent failed. Structured document metadata was used instead, and confidence was reduced.",
      evidence: { simulate_component_failure: true },
      confidence_delta: -0.18
    });
  }

  const documents = claim.documents.map((document) => {
    const type = document.detected_type ?? document.actual_type ?? "UNKNOWN";
    const quality = document.quality ?? "GOOD";
    const fields = {
      ...(document.content ?? {}),
      patient_name: document.content?.patient_name ?? document.patient_name_on_doc
    };

    return {
      document_id: document.file_id,
      type,
      quality,
      confidence: quality === "LOW" ? 0.72 : 0.92,
      fields,
      warnings: quality === "LOW" ? ["Document has visible quality issues; extracted fields need review."] : []
    } satisfies ExtractionResult;
  });

  trace.add({
    agent: "Document Extraction Agent",
    status: "PASS",
    title: "Structured facts extracted",
    detail: `Extracted ${documents.length} document(s) into normalized claim facts.`,
    evidence: {
      documents: documents.map((document) => ({
        id: document.document_id,
        type: document.type,
        patient_name: document.fields.patient_name,
        total: document.fields.total
      }))
    },
    confidence_delta: claim.simulate_component_failure ? -0.1 : 0.04
  });

  return { documents, componentFailed: Boolean(claim.simulate_component_failure) };
}

export async function extractWithOpenAIPlaceholder() {
  if (!process.env.OPENAI_API_KEY) {
    return { available: false, reason: "OPENAI_API_KEY is not configured." };
  }

  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return {
    available: true,
    model: "gpt-4o-mini",
    clientConfigured: Boolean(client)
  };
}
