import { z } from "zod";

export const ClaimCategorySchema = z.enum([
  "CONSULTATION",
  "DIAGNOSTIC",
  "PHARMACY",
  "DENTAL",
  "VISION",
  "ALTERNATIVE_MEDICINE"
]);

export const DocumentTypeSchema = z.enum([
  "PRESCRIPTION",
  "HOSPITAL_BILL",
  "LAB_REPORT",
  "DIAGNOSTIC_REPORT",
  "PHARMACY_BILL",
  "DENTAL_REPORT",
  "DISCHARGE_SUMMARY",
  "UNKNOWN"
]);

export const DecisionSchema = z.enum(["APPROVED", "PARTIAL", "REJECTED", "MANUAL_REVIEW"]);
export const TraceStatusSchema = z.enum(["PASS", "FAIL", "WARN", "SKIP", "INFO"]);

export const MoneyLineItemSchema = z.object({
  description: z.string(),
  amount: z.number().nonnegative(),
  decision: z.enum(["APPROVED", "REJECTED", "ADJUSTED"]).optional(),
  reason: z.string().optional()
});

export const DocumentContentSchema = z
  .object({
    doctor_name: z.string().optional(),
    doctor_registration: z.string().optional(),
    patient_name: z.string().optional(),
    date: z.string().optional(),
    diagnosis: z.string().optional(),
    treatment: z.string().optional(),
    hospital_name: z.string().optional(),
    tests_ordered: z.array(z.string()).optional(),
    test_name: z.string().optional(),
    medicines: z.array(z.string()).optional(),
    line_items: z.array(MoneyLineItemSchema).optional(),
    total: z.number().optional()
  })
  .passthrough();

export const SubmittedDocumentSchema = z.object({
  file_id: z.string(),
  file_name: z.string().optional(),
  actual_type: DocumentTypeSchema.optional(),
  detected_type: DocumentTypeSchema.optional(),
  quality: z.enum(["GOOD", "LOW", "UNREADABLE"]).optional(),
  patient_name_on_doc: z.string().optional(),
  content: DocumentContentSchema.optional()
});

export const ClaimInputSchema = z.object({
  member_id: z.string(),
  policy_id: z.string(),
  claim_category: ClaimCategorySchema,
  treatment_date: z.string(),
  claimed_amount: z.number().nonnegative(),
  hospital_name: z.string().optional(),
  ytd_claims_amount: z.number().nonnegative().optional(),
  claims_history: z
    .array(
      z.object({
        claim_id: z.string(),
        date: z.string(),
        amount: z.number(),
        provider: z.string().optional()
      })
    )
    .optional(),
  pre_authorization_id: z.string().optional(),
  simulate_component_failure: z.boolean().optional(),
  documents: z.array(SubmittedDocumentSchema).min(1)
});

export const TraceEventSchema = z.object({
  id: z.string(),
  agent: z.string(),
  status: TraceStatusSchema,
  title: z.string(),
  detail: z.string(),
  evidence: z.record(z.string(), z.unknown()).optional(),
  confidence_delta: z.number().optional()
});

export const ExtractionResultSchema = z.object({
  document_id: z.string(),
  type: DocumentTypeSchema,
  quality: z.enum(["GOOD", "LOW", "UNREADABLE"]),
  confidence: z.number().min(0).max(1),
  fields: DocumentContentSchema,
  warnings: z.array(z.string()).default([])
});

export const EarlyStopSchema = z.object({
  status: z.literal("NEEDS_MEMBER_ACTION"),
  case_id: z.string().optional(),
  message: z.string(),
  missing_documents: z.array(DocumentTypeSchema).default([]),
  uploaded_documents: z.array(DocumentTypeSchema).default([]),
  trace: z.array(TraceEventSchema),
  confidence_score: z.number().min(0).max(1)
});

export const DecisionOutputSchema = z.object({
  status: z.literal("DECIDED"),
  case_id: z.string().optional(),
  decision: DecisionSchema,
  approved_amount: z.number().nonnegative(),
  claimed_amount: z.number().nonnegative(),
  reason: z.string(),
  confidence_score: z.number().min(0).max(1),
  rejection_reasons: z.array(z.string()).default([]),
  line_items: z.array(MoneyLineItemSchema).default([]),
  financials: z
    .object({
      eligible_amount: z.number().optional(),
      network_discount: z.number().optional(),
      copay: z.number().optional(),
      per_claim_limit: z.number().optional()
    })
    .default({}),
  extracted_documents: z.array(ExtractionResultSchema).default([]),
  trace: z.array(TraceEventSchema),
  manual_review_recommended: z.boolean().default(false)
});

export const ProcessClaimResponseSchema = z.union([EarlyStopSchema, DecisionOutputSchema]);

export type ClaimCategory = z.infer<typeof ClaimCategorySchema>;
export type DocumentType = z.infer<typeof DocumentTypeSchema>;
export type Decision = z.infer<typeof DecisionSchema>;
export type MoneyLineItem = z.infer<typeof MoneyLineItemSchema>;
export type SubmittedDocument = z.infer<typeof SubmittedDocumentSchema>;
export type ClaimInput = z.infer<typeof ClaimInputSchema>;
export type TraceEvent = z.infer<typeof TraceEventSchema>;
export type ExtractionResult = z.infer<typeof ExtractionResultSchema>;
export type EarlyStop = z.infer<typeof EarlyStopSchema>;
export type DecisionOutput = z.infer<typeof DecisionOutputSchema>;
export type ProcessClaimResponse = z.infer<typeof ProcessClaimResponseSchema>;
