import { NextResponse } from "next/server";
import { runEvals } from "@/src/lib/eval-runner";

export async function GET() {
  const results = await runEvals();
  return NextResponse.json({
    passed: results.filter((result) => result.passed).length,
    total: results.length,
    results
  });
}
