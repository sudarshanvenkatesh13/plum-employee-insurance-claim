import { z } from "zod";
import { ClaimCategorySchema, DocumentTypeSchema } from "./contracts";

const OpdCategorySchema = z.object({
  sub_limit: z.number(),
  copay_percent: z.number().default(0),
  network_discount_percent: z.number().optional(),
  branded_drug_copay_percent: z.number().optional(),
  generic_mandatory: z.boolean().optional(),
  requires_prescription: z.boolean().optional(),
  requires_pre_auth: z.boolean().optional(),
  pre_auth_threshold: z.number().optional(),
  high_value_tests_requiring_pre_auth: z.array(z.string()).optional(),
  requires_dental_report: z.boolean().optional(),
  requires_registered_practitioner: z.boolean().optional(),
  max_sessions_per_year: z.number().optional(),
  covered_procedures: z.array(z.string()).optional(),
  excluded_procedures: z.array(z.string()).optional(),
  covered_items: z.array(z.string()).optional(),
  excluded_items: z.array(z.string()).optional(),
  covered_systems: z.array(z.string()).optional(),
  covered: z.boolean()
});

export const PolicySchema = z.object({
  policy_id: z.string(),
  policy_name: z.string(),
  insurer: z.string(),
  policy_holder: z.object({
    company_name: z.string(),
    employee_count: z.number(),
    policy_start_date: z.string(),
    policy_end_date: z.string(),
    renewal_status: z.string()
  }),
  coverage: z.object({
    sum_insured_per_employee: z.number(),
    annual_opd_limit: z.number(),
    per_claim_limit: z.number(),
    family_floater: z.object({
      enabled: z.boolean(),
      combined_limit: z.number(),
      covered_relationships: z.array(z.string())
    })
  }),
  opd_categories: z.record(z.string(), OpdCategorySchema),
  waiting_periods: z.object({
    initial_waiting_period_days: z.number(),
    pre_existing_conditions_days: z.number(),
    specific_conditions: z.record(z.string(), z.number())
  }),
  exclusions: z.object({
    conditions: z.array(z.string()),
    dental_exclusions: z.array(z.string()),
    vision_exclusions: z.array(z.string())
  }),
  pre_authorization: z.object({
    required_for: z.array(z.string()),
    validity_days: z.number()
  }),
  network_hospitals: z.array(z.string()),
  submission_rules: z.object({
    deadline_days_from_treatment: z.number(),
    minimum_claim_amount: z.number(),
    currency: z.string()
  }),
  document_requirements: z.record(
    ClaimCategorySchema,
    z.object({
      required: z.array(DocumentTypeSchema),
      optional: z.array(DocumentTypeSchema)
    })
  ),
  fraud_thresholds: z.object({
    same_day_claims_limit: z.number(),
    monthly_claims_limit: z.number(),
    high_value_claim_threshold: z.number(),
    auto_manual_review_above: z.number(),
    fraud_score_manual_review_threshold: z.number()
  }),
  members: z.array(
    z.object({
      member_id: z.string(),
      name: z.string(),
      date_of_birth: z.string(),
      gender: z.string(),
      relationship: z.string(),
      join_date: z.string().optional(),
      primary_member_id: z.string().optional(),
      dependents: z.array(z.string()).optional()
    })
  )
});

export type Policy = z.infer<typeof PolicySchema>;
export type Member = Policy["members"][number];
