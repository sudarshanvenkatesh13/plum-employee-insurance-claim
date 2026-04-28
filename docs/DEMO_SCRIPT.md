# Demo Script

Target length: 8-12 minutes.

## 1. Open With The Problem

Explain that claims teams need decisions that are reliable, explainable, and resilient to messy documents. This app is designed around a trace ledger so operations can reconstruct every decision.

## 2. Wrong Document Flow

Load `TC001 - Wrong Document Uploaded`.

Show:

- The claim category requires `PRESCRIPTION` and `HOSPITAL_BILL`.
- The member uploaded two prescriptions.
- The system stops before policy adjudication.
- The message names both the uploaded document type and the missing required type.

Talking point: early document repair protects members from false rejections and saves operations time.

## 3. Successful Approval Flow

Load `TC010 - Network Hospital - Discount Applied`.

Show:

- `APPROVED` decision.
- Approved amount `₹3,240`.
- Financial breakdown: 20% network discount first, then 10% co-pay.
- Trace timeline showing document verification, extraction, consistency, policy, and fraud checks.

Talking point: policy math is deterministic and auditable, not delegated to an LLM.

## 4. Graceful Degradation Flow

Load `TC011 - Component Failure - Graceful Degradation`.

Show:

- The pipeline does not crash.
- Extraction fallback is visible in the trace.
- Decision is still produced with reduced confidence.
- Manual review is recommended because processing was degraded.

Talking point: reliability means exposing partial failure, not hiding it.

## 5. Technical Decision I Am Proud Of

Highlight the separation between document AI and policy adjudication:

- OpenAI/vision belongs behind the extraction adapter.
- Policy decisions stay deterministic and tested.
- The trace contract makes every agent observable.

## 6. What I Would Change With More Time

Add production file handling:

- Real OCR/vision extraction for uploaded PDFs/images.
- Durable object storage.
- Async extraction queue.
- Human review queue with policy-version replay.
