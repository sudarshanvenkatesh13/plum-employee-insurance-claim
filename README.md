# Plum Claims Intelligence

A trace-first health insurance claims processing system for the Plum AI Engineer assignment.

The app accepts claim submissions, catches document problems early, extracts structured facts, applies policy terms from `policy_terms.json`, returns explainable decisions, and generates a full eval report for all 12 assignment cases.

## Highlights

- Multi-agent pipeline: intake, document verification, extraction, consistency, policy decision, fraud/risk.
- Deterministic policy engine for money movement and claim decisions.
- OpenAI-ready extraction adapter isolated from policy logic.
- Full explainability trace for every decision.
- Graceful degradation when extraction fails.
- 12/12 assignment eval cases passing.

## Setup

```bash
npm install
```

Optional for future real document extraction:

```bash
export OPENAI_API_KEY=your_key_here
```

The provided assignment fixtures do not require an API key because they include structured document metadata.

## Run Locally

```bash
npm run dev
```

Open `http://localhost:3000`.

Use the scenario selector to load any test case, process it, and inspect the full trace.

## Verify

```bash
npm test
npm run eval
```

`npm run eval` writes `docs/EVAL_REPORT.md`.

## Documentation

- `docs/ARCHITECTURE.md`: design, trade-offs, failure handling, and scale plan.
- `docs/COMPONENT_CONTRACTS.md`: precise inputs, outputs, and errors for each component.
- `docs/EVAL_REPORT.md`: generated results for all 12 cases.
- `docs/DEMO_SCRIPT.md`: 8-12 minute walkthrough plan.

## Key Trade-Off

The system uses deterministic TypeScript for policy adjudication and isolates LLM/vision usage to document extraction. That makes the product reliable under eval, easier to audit, and safer for financial decisions while still leaving a clean path for AI on messy real-world documents.
