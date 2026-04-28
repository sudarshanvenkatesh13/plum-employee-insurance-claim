# Component Contracts

## Claim Processing API

Path: `POST /api/claims/process`

Input:

- `case_id?: string`
- `input: ClaimInput`

Output:

- `NEEDS_MEMBER_ACTION` for document/member repair flows.
- `DECIDED` for claim decisions.

Errors:

- `400` if the payload does not match the claim contract.

## Intake Agent

Input:

- Raw claim payload.
- Policy/member roster.

Output:

- Validated `ClaimInput`.
- Member record.
- Trace event.

Errors:

- Missing or invalid member returns `NEEDS_MEMBER_ACTION`.
- Schema failures are surfaced by the API as `400`.

## Document Verification Agent

Input:

- `ClaimInput`
- `policy.document_requirements`

Output:

- `null` when all required documents are present and readable.
- `NEEDS_MEMBER_ACTION` when required document types are missing or a document is unreadable.

Errors:

- Does not throw for expected document problems.
- Emits trace status `FAIL` with uploaded and required document evidence.

## Document Extraction Agent

Input:

- Submitted documents.
- Optional `OPENAI_API_KEY` for future real document extraction.

Output:

- Array of normalized `ExtractionResult` objects containing document type, quality, confidence, fields, and warnings.
- `componentFailed` flag when fallback extraction is used.

Errors:

- Extraction exceptions are caught by the orchestrator.
- Pipeline continues with metadata fallback and reduced confidence.

## Consistency Agent

Input:

- Claim.
- Member.
- Extracted documents.

Output:

- `null` when documents are mutually consistent.
- `NEEDS_MEMBER_ACTION` when documents clearly belong to different patients.

Errors:

- Patient mismatch is not treated as a system crash; it is a member repair action.
- Amount mismatches produce warnings unless severe enough to require future fraud review.

## Policy Decision Agent

Input:

- Claim.
- Member.
- Policy terms.
- Extracted facts.
- Trace ledger.

Output:

- `DecisionOutput` with decision, approved amount, rejection reasons, confidence, financial breakdown, item-level adjudication, and trace.

Rules Applied:

- Explicit exclusions.
- Specific waiting periods.
- Diagnostic pre-authorization.
- Per-claim limit for consultation claims.
- Dental item-level partial approval.
- Network discount before co-pay.
- Graceful degradation notes when a prior component failed.

Errors:

- Missing required facts lower confidence or trigger manual review recommendations rather than crashing.

## Fraud And Risk Agent

Input:

- Claim history.
- Policy fraud thresholds.
- Current decision.

Output:

- Original decision when risk is acceptable.
- `MANUAL_REVIEW` when same-day velocity or high-value rules trigger.

Errors:

- Risk signals are trace warnings, not hard system failures.

## Eval Runner

Path: `GET /api/evals/run`

CLI: `npm run eval`

Input:

- `test_cases.json`

Output:

- Pass/fail result per case.
- Full claim response and trace.
- Markdown report at `docs/EVAL_REPORT.md`.
