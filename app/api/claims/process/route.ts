import { NextResponse } from "next/server";
import { processClaim } from "@/src/agents/orchestrator";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = await processClaim(body.input ?? body, { caseId: body.case_id });
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      {
        status: "ERROR",
        message: "The claim could not be processed because the submission did not match the expected contract.",
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 400 }
    );
  }
}
